"""Recommendation service — all recommendation and scoring logic lives here."""

import logging
import math
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

import torch
import torch.nn.functional as F

from app.services import graph_store

logger = logging.getLogger(__name__)

# ── Module-level in-memory stores (shared across requests) ────────────────────
raw_node_store:    Dict[str, dict]         = {}   # ALL registered nodes (id → {type, text_snippet, user_id?})
feature_store:     Dict[str, torch.Tensor] = {}   # raw NLP embeddings
graphsage_store:   Dict[str, torch.Tensor] = {}   # GraphSAGE-updated embeddings
edge_store:        Dict[str, List[dict]]   = {}   # resume_id → [{job_id, weight, updated_at}]  (apply edges only)
edge_metadata:     Dict[str, dict]        = {}   # "resume_id__job_id" → {confidence, action_type, ...}
job_to_users:      Dict[str, List[str]]    = {}   # job_id → [resume_ids]  (apply edges only)

# User-level behavioral signals: user_id → [{job_id, action_type, weight, timestamp}, ...]
# These are separate from edge_store — they represent click/save interactions that do NOT
# create graph edges and do NOT update GraphSAGE embeddings.
behavioral_store: Dict[str, List[dict]] = {}

# Reverse index: user_id → [job_ids] for fast lookup when building preference vectors
user_jobs: Dict[str, List[str]] = {}


def _debug_behavioral_snapshot(user_id: Optional[str] = None, limit: int = 3) -> dict:
    """Return a small debug snapshot of behavioral history state."""
    if user_id:
        interactions = behavioral_store.get(user_id, [])
        return {
            "user_id": user_id,
            "behavioral_count": len(interactions),
            "behavioral_jobs": user_jobs.get(user_id, [])[:limit],
            "latest_behavioral": interactions[-limit:],
        }

    return {
        "behavioral_users": len(behavioral_store),
        "behavioral_user_ids": list(behavioral_store.keys())[:limit],
        "user_jobs_users": len(user_jobs),
        "user_jobs_user_ids": list(user_jobs.keys())[:limit],
    }

# Map resume_id → user_id (jobSeekerId). Populated when resume nodes are added.
# Needed so get_recommendations(resume_id) can resolve the user for preference vector.
resume_to_user: Dict[str, str] = {}

job_catalog:       List[str]               = []   # ordered list of all job node IDs
job_catalog_index: Dict[str, int]          = {}   # job_id → index in job_catalog (O(1) lookup)

MAX_SIMILAR_USERS   = 5
MAX_RECOMMENDATIONS = 50

# ── Edge metadata storage ─────────────────────────────────────────────────────
def _store_edge_metadata(resume_id: str, job_id: str, metadata: dict) -> None:
    """Store metadata for an edge for graph visualization.

    Args:
        resume_id: Resume node ID
        job_id: Job node ID
        metadata: Dict containing confidence, action_type, attribution_probability, etc.
    """
    key = f"{resume_id}__{job_id}"
    edge_metadata[key] = {
        **metadata,
        "resume_id": resume_id,
        "job_id": job_id,
    }

# ── Edge weight constants ─────────────────────────────────────────────────────
MAX_EDGE_WEIGHT = 3.0   # hard cap per edge to prevent runaway accumulation
DECAY           = 0.9   # multiplicative decay applied before adding new weight
SMOOTHING_ALPHA = 0.7   # EMA blend: alpha * old + (1-alpha) * new

# ── Recency-weighted preference vector blending ──────────────────────────────
# Behavioral intent is computed fresh at query time from edge_store.
# query_vec = α·graphsage_store[R] + (1-α)·preference_vec
RECENCY_HALF_LIFE_DAYS      = 30.0   # behavioral recency halves every 30 days
MAX_PREFERENCE_INTERACTIONS = 10     # cap to N most recent edges to avoid drift toward center
BLEND_ALPHA_BASE            = 1.0    # α when n=0 (pure structural)
BLEND_ALPHA_STEP            = 0.07   # α decreases by this per interaction
BLEND_ALPHA_MIN             = 0.30   # floor — preference_vec never fully replaces structural

# ── Interaction weight mapping ────────────────────────────────────────────────
# Maps action_type → edge weight increment.  Add new actions here; the rest of
# the system will pick them up automatically through handle_interaction().
ACTION_WEIGHT_MAP: Dict[str, float] = {
    "apply": 1.0,
    "save":  0.7,
    "click": 0.1,
}

# ── Confidence gating thresholds ─────────────────────────────────────────────
CONFIDENCE_HIGH   = 0.7   # >= 0.7: use weight normally
CONFIDENCE_MEDIUM = 0.4   # >= 0.4 and < 0.7: reduce weight
CONFIDENCE_LOW    = 0.0   # < 0.4: ignore interaction

# Weight multipliers per confidence level
WEIGHT_MULTIPLIER_HIGH   = 1.0
WEIGHT_MULTIPLIER_MEDIUM = 0.5
WEIGHT_MULTIPLIER_LOW    = 0.0  # effectively ignores


# ── User-Level Behavioral Signal Storage ────────────────────────────────────────

def _record_behavioral_signal(user_id: str, job_id: str, action_type: str) -> None:
    """Record click/save as a user-level behavioral signal.

    This does NOT create graph edges or update GraphSAGE embeddings.
    Behavioral signals are stored separately and used only in preference vector logic.

    Args:
        user_id: JobSeeker ID.
        job_id: Job node ID.
        action_type: "click" or "save".
    """
    if job_id not in job_catalog:
        raise ValueError(f"Job '{job_id}' not found in job catalog.")
    
    logger.info(
        "[Behavioral] record user_id=%s job_id=%s action_type=%s before_count=%d",
        user_id, job_id, action_type, len(behavioral_store.get(user_id, [])),
    )

    weight = ACTION_WEIGHT_MAP.get(action_type, 0.1)
    timestamp = datetime.now(timezone.utc).isoformat()

    entry = {
        "job_id": job_id,
        "action_type": action_type,
        "weight": weight,
        "timestamp": timestamp,
    }
    behavioral_store.setdefault(user_id, []).append(entry)
    graph_store.persist_behavioral_signal(user_id, job_id, action_type, weight, timestamp)

    if job_id not in user_jobs.setdefault(user_id, []):
        user_jobs.setdefault(user_id, []).append(job_id)

    logger.info(
        "[Behavioral] stored user_id=%s after_count=%d jobs_count=%d latest=%s",
        user_id,
        len(behavioral_store.get(user_id, [])),
        len(user_jobs.get(user_id, [])),
        _debug_behavioral_snapshot(user_id),
    )

    logger.debug(
        "[Behavioral] user=%s job=%s action=%s weight=%.1f recorded",
        user_id, job_id, action_type, weight,
    )


def _build_user_preference_vector(user_id: str) -> Optional[torch.Tensor]:
    """Build a recency-weighted preference vector from user's behavioral signals.

    Uses raw NLP embeddings from feature_store (not graphsage_store) to avoid
    cross-user contamination through job GNN outputs.

    Caps to MAX_PREFERENCE_INTERACTIONS most recent interactions to prevent
    a diverse history from averaging toward the center of embedding space.

    Returns L2-normalized preference vector, or None if no signals exist.
    """
    interactions = behavioral_store.get(user_id, [])
    if not interactions:
        return None

    sorted_interactions = sorted(interactions, key=lambda x: x.get("timestamp", ""), reverse=True)
    recent = sorted_interactions[:MAX_PREFERENCE_INTERACTIONS]

    now_ts = time.time()
    weighted_sum: Optional[torch.Tensor] = None
    total_weight = 0.0

    for interaction in recent:
        job_vec = feature_store.get(interaction["job_id"])
        if job_vec is None:
            continue

        days_old = (now_ts - datetime.fromisoformat(interaction["timestamp"]).timestamp()) / 86400.0
        recency = math.exp(-math.log(2) * days_old / RECENCY_HALF_LIFE_DAYS)
        w = interaction["weight"] * recency
        if w <= 0.0:
            continue

        weighted_sum = w * job_vec if weighted_sum is None else weighted_sum + w * job_vec
        total_weight += w

    if weighted_sum is None or total_weight <= 0.0:
        return None

    pref = weighted_sum / total_weight
    return F.normalize(pref.unsqueeze(0), p=2, dim=1).squeeze(0)


# ── Soft Attribution Helpers ───────────────────────────────────────────────────

def compute_similarity(resume_ids: List[str], job_id: str) -> List[float]:
    """Compute cosine similarity between each resume and the job.

    Returns a list of similarities in the same order as resume_ids.
    All similarities are clamped to [0, 1] since embeddings are L2-normalized.
    """
    if job_id not in feature_store:
        raise ValueError(f"Job '{job_id}' not found in feature store.")

    job_vec = feature_store[job_id]
    # Ensure 1D tensor [embedding_dim]
    if job_vec.dim() > 1:
        job_vec = job_vec.squeeze()

    similarities = []

    for resume_id in resume_ids:
        if resume_id not in feature_store:
            logger.warning("Resume '%s' not found in feature store, skipping.", resume_id)
            similarities.append(0.0)
            continue

        resume_vec = feature_store[resume_id]
        # Ensure 1D tensor [embedding_dim]
        if resume_vec.dim() > 1:
            resume_vec = resume_vec.squeeze()

        # cosine_similarity expects 1D inputs, returns scalar
        sim = torch.nn.functional.cosine_similarity(
            resume_vec,
            job_vec,
            dim=0,
        )
        # Handle both scalar and multi-element tensor cases
        if sim.numel() == 1:
            sim_val = sim.item()
        else:
            sim_val = sim.mean().item()
        similarities.append(float(max(0.0, sim_val)))

    return similarities


def softmax(similarities: List[float], temperature: float = 1.0) -> List[float]:
    if not similarities:
        return []

    sim_tensor = torch.tensor(similarities, dtype=torch.float32) / temperature
    max_val = sim_tensor.max()  # subtract max for numerical stability
    exp_scores = torch.exp(sim_tensor - max_val)
    probabilities = exp_scores / exp_scores.sum()

    return probabilities.tolist()


def compute_confidence(probabilities: List[float]) -> float:
    """Compute confidence as the maximum probability.

    Confidence indicates how strongly the most likely resume
    matches the job compared to other resumes.
    """
    if not probabilities:
        return 0.0
    return float(max(probabilities))


def get_confidence_level(confidence: float) -> str:
    """Map confidence value to level category."""
    if confidence >= CONFIDENCE_HIGH:
        return "high"
    elif confidence >= CONFIDENCE_MEDIUM:
        return "medium" 
    else:
        return "low"


def get_weight_multiplier(confidence: float) -> float:
    """Get weight multiplier based on confidence level."""
    if confidence >= CONFIDENCE_HIGH:
        return WEIGHT_MULTIPLIER_HIGH
    elif confidence >= CONFIDENCE_MEDIUM:
        return WEIGHT_MULTIPLIER_MEDIUM
    else:
        return WEIGHT_MULTIPLIER_LOW


def add_node(node_id: str, text: str, node_type: str, nlp_model, device, user_id: Optional[str] = None) -> dict:
    """Encode text and register a resume or job node.

    Also writes to raw_node_store immediately so the graph snapshot always
    reflects registered nodes even before NLP encoding completes.

    Args:
        node_id: Unique node identifier.
        text: Raw text to embed.
        node_type: "resume" or "job".
        nlp_model: Sentence-transformer model for encoding.
        device: Torch device.
        user_id: JobSeeker ID (required for resume nodes to enable user-level behavioral signals).
    """
    start = time.time()

    # ── Step 1: register metadata immediately (visible in graph snapshot) ──────
    text_snippet = text[:120] if text else ""
    node_meta: dict = {
        "node_type":    node_type,
        "text_snippet": text_snippet,
        "encoded":      False,
    }
    if user_id is not None:
        node_meta["user_id"] = user_id
    raw_node_store[node_id] = node_meta

    # For resume nodes, also populate the resume_to_user map so we can resolve
    # the user at recommendation query time.
    if node_type == "resume" and user_id is not None:
        resume_to_user[node_id] = user_id

    if node_type == "job" and node_id not in job_catalog_index:
        job_catalog_index[node_id] = len(job_catalog)
        job_catalog.append(node_id)
        graph_store.persist_job_catalog(node_id)

    # Persist node metadata to Redis immediately (before NLP encoding)
    graph_store.persist_node(node_id, node_type, text_snippet)

    vec_np = nlp_model.encode([text], convert_to_numpy=True)
    vec = torch.tensor(vec_np, dtype=torch.float32).squeeze(0).to(device)
    vec = F.normalize(vec.unsqueeze(0), p=2, dim=1).squeeze(0)

    feature_store[node_id]          = vec
    graphsage_store[node_id]        = vec.clone()
    raw_node_store[node_id]["encoded"] = True

    elapsed = time.time() - start
    logger.debug("add_node(%s, %s) encoded in %.3fs", node_id, node_type, elapsed)

    return {
        "node_id":   node_id,
        "node_type": node_type,
        "message":   f"Node '{node_id}' ({node_type}) added successfully.",
    }


def process_application(resume_id: str, job_id: str, weight: float, graphsage_model, device) -> dict:
    """Update in-memory stores and re-run GraphSAGE for a resume→job interaction.

    Edges are accumulated (weight added) rather than replaced.  Persistence to
    Redis is handled by the caller (handle_interaction) via persist_edge so that
    a single Redis write covers both the edge hash and its reverse.
    """
    start = time.time()

    # Accumulate edge weight with time decay then hard cap
    edges = edge_store.setdefault(resume_id, [])
    now = time.time()
    for edge in edges:
        if edge["job_id"] == job_id:
            edge["weight"] *= DECAY
            edge["weight"] = min(edge["weight"] + weight, MAX_EDGE_WEIGHT)
            edge["updated_at"] = now   # refresh timestamp on re-interaction
            break
    else:
        edges.append({"job_id": job_id, "weight": weight, "updated_at": now})

    # Update reverse index
    users_for_job = job_to_users.setdefault(job_id, [])
    if resume_id not in users_for_job:
        users_for_job.append(resume_id)
        graph_store.persist_job_users(job_id, resume_id)

    # Collect job features — always use raw NLP embeddings (feature_store) as GNN
    job_features = [
        feature_store[e["job_id"]]
        for e in edges
        if e["job_id"] in feature_store
    ]

    # Collect 2-hop neighbors (similar users) per job so each job node has a richer
    # neighborhood during Layer-2 aggregation.  We cap per-job to bound subgraph size.
    MAX_USERS_PER_JOB = 3
    similar_users: List[str] = []
    # Track which similar_user belongs to which job (for edge building in _run_graphsage_local)
    similar_users_per_job: List[List[str]] = []
    seen: set = set()
    for edge in edges:
        job_neighbors: List[str] = []
        for other in job_to_users.get(edge["job_id"], []):
            if other != resume_id and other not in seen:
                seen.add(other)
                similar_users.append(other)
                job_neighbors.append(other)
                if len(job_neighbors) >= MAX_USERS_PER_JOB:
                    break
        similar_users_per_job.append(job_neighbors)

    # Always use raw NLP features for 2-hop user nodes — same reason as job_features above.
    user_features = [
        feature_store[u]
        for u in similar_users
        if u in feature_store
    ]
    # Keep similar_users aligned with user_features (drop any missing from feature_store)
    similar_users = [u for u in similar_users if u in feature_store]

    # Run local GraphSAGE subgraph — returns (N, 768) where index 0 is the resume,
    updated_all = _run_graphsage_local(
        resume_id=resume_id,
        job_features=job_features,
        user_features=user_features,
        edge_store_snapshot=edges,
        similar_users=similar_users,
        similar_users_per_job=similar_users_per_job,
        graphsage_model=graphsage_model,
        device=device,
    )
    # updated_all is (N, 768); index 0 = resume, 1..num_jobs = jobs, rest = users.
    updated_resume_vec = updated_all[0]   # (768,)

    num_edges = len(edges)
    if num_edges <= 1:
        smoothed_vec = F.normalize(updated_resume_vec.unsqueeze(0), p=2, dim=1).squeeze(0)
    else:
        old_vec = graphsage_store.get(resume_id, updated_resume_vec)
        blended = SMOOTHING_ALPHA * old_vec + (1 - SMOOTHING_ALPHA) * updated_resume_vec
        smoothed_vec = F.normalize(blended.unsqueeze(0), p=2, dim=1).squeeze(0)

    graphsage_store[resume_id] = smoothed_vec
    graph_store.persist_gnn_embedding(resume_id, smoothed_vec)

    # Persist GNN embeddings for the applied-to jobs and 2-hop similar users
    # so they survive restarts even if a global refresh hasn't run yet.
    num_jobs = len(job_features)
    user_offset = 1 + num_jobs
    job_offset  = 1
    if num_jobs > 0 and updated_all.shape[0] > user_offset:
        for i in range(num_jobs):
            job_id = edges[i]["job_id"]
            graphsage_store[job_id] = updated_all[job_offset + i]
            graph_store.persist_gnn_embedding(job_id, updated_all[job_offset + i])
    if len(similar_users) > 0 and updated_all.shape[0] > user_offset:
        for k, u_id in enumerate(similar_users):
            graphsage_store[u_id] = updated_all[user_offset + k]
            graph_store.persist_gnn_embedding(u_id, updated_all[user_offset + k])

    elapsed = time.time() - start
    logger.debug("process_application(%s→%s) in %.3fs", resume_id, job_id, elapsed)

    return {
        "message":           "Application processed. Resume embedding updated.",
        "num_applied_jobs":  len(edges),
        "num_similar_users": len(similar_users),
    }


def handle_interaction(
    resume_id: str,
    job_id: str,
    action_type: str,
    graphsage_model,
    device,
) -> dict:
    """Single entry-point for single-resume interactions (apply events).

    For apply events, the resume_id is always explicit and the weight is always 1.0.

    Steps:
      1. Validate *action_type* against ACTION_WEIGHT_MAP.
      2. Resolve weight from the map (should be 1.0 for apply).
      3. Persist the edge increment to Redis.
      4. Update in-memory stores and run GraphSAGE (via process_application).

    Raises:
        ValueError: if *action_type* is not in ACTION_WEIGHT_MAP.
    """
    if action_type not in ACTION_WEIGHT_MAP:
        raise ValueError(
            f"Unknown action_type '{action_type}'. "
            f"Valid types: {sorted(ACTION_WEIGHT_MAP)}"
        )

    weight = ACTION_WEIGHT_MAP[action_type]

    # Persist edge to Redis (creates or accumulates)
    graph_store.persist_edge(resume_id, job_id, weight)

    # Store edge metadata for graph visualization (apply = ground truth, 100% confidence)
    _store_edge_metadata(resume_id, job_id, {
        "confidence": 1.0,
        "confidence_level": "high",
        "action_type": action_type,
        "attribution_probability": 1.0,
        "original_weight": weight,
    })

    # Update in-memory stores + re-run GraphSAGE
    result = process_application(
        resume_id=resume_id,
        job_id=job_id,
        weight=weight,
        graphsage_model=graphsage_model,
        device=device,
    )
    result["action_type"] = action_type
    result["weight"]      = weight
    return result




def _build_interaction_message(confidence_level: str, num_attributed: int) -> str:
    """Build human-readable message for interaction result."""
    if confidence_level == "low":
        return "Interaction ignored due to low confidence."
    elif confidence_level == "medium":
        return f"Interaction recorded with reduced weight. {num_attributed} resume(s) attributed."
    else:
        return f"Interaction recorded with full weight. {num_attributed} resume(s) attributed."



# ── Private helpers ───────────────────────────────────────────────────────────

def _run_graphsage_local(
    resume_id:             str,
    job_features:          List[torch.Tensor],
    user_features:         List[torch.Tensor],
    edge_store_snapshot:   List[dict],
    similar_users:         List[str],
    similar_users_per_job: List[List[str]],
    graphsage_model,
    device,
) -> torch.Tensor:
    """Build a local 2-hop subgraph and run GraphSAGE inference on it.

    Node layout in x_local:
        [0]           = target resume
        [1..num_jobs] = jobs this resume applied to  (1-hop)
        [num_jobs+1..]= other resumes that applied to the same jobs (2-hop)

    Edge structure matches the training graph exactly:
        resume ↔ job        (1-hop, bidirectional)
        job    ↔ user       (2-hop, bidirectional)
        NO resume ↔ user edges — those don't exist in the training graph.
    """
    resume_vec = feature_store[resume_id]  # always raw NLP — GNN input
    all_nodes  = [resume_vec] + job_features + user_features
    if len(all_nodes) == 1:
        # No neighbors at all — return raw NLP wrapped in a 2D tensor so caller
        # can always index updated_all[0].
        return resume_vec.unsqueeze(0)   # (1, 768)

    x_local = torch.stack(all_nodes, dim=0).to(device)  # (N, 768)

    num_jobs    = len(job_features)
    user_offset = 1 + num_jobs

    # Build a user_id → local index map for O(1) lookup below.
    user_local_idx: dict = {u_id: user_offset + k for k, u_id in enumerate(similar_users)}

    local_edges:  List[List[int]] = []
    edge_weights: List[float]     = []

    valid_job_edges = [e for e in edge_store_snapshot if e["job_id"] in feature_store]
    for i, edge in enumerate(valid_job_edges):
        j       = 1 + i
        job_vec = feature_store[edge["job_id"]]
        cos_sim = float(F.cosine_similarity(resume_vec.unsqueeze(0), job_vec.unsqueeze(0)).item())
        w       = (cos_sim + 1) / 2  # Maps -1..1 to 0..1
        if w < 1e-4:
            w = 1e-4
        local_edges  += [[0, j], [j, 0]]  # bidirectional
        edge_weights += [w, w]

    # ── job↔user edges: semantic weight only (no behavioral signal for 2-hop) ─
    for i, (edge, job_neighbors) in enumerate(zip(valid_job_edges, similar_users_per_job)):
        j       = 1 + i
        job_vec = feature_store[edge["job_id"]]
        for u_id in job_neighbors:
            if u_id in user_local_idx:
                u        = user_local_idx[u_id]
                user_vec = feature_store[u_id]
                cos_sim  = float(F.cosine_similarity(job_vec.unsqueeze(0), user_vec.unsqueeze(0)).item())
                w        = (cos_sim + 1) / 2  # Maps -1..1 to 0..1
                if w < 1e-4:
                    w = 1e-4
                local_edges  += [[j, u], [u, j]]  # bidirectional
                edge_weights += [w, w]

    if local_edges:
        edge_index = (
            torch.tensor(local_edges, dtype=torch.long)
            .t()
            .contiguous()
            .to(device)
        )
        edge_weight = torch.tensor(edge_weights, dtype=torch.float, device=device)
    else:
        edge_index  = torch.zeros((2, 0), dtype=torch.long, device=device)
        edge_weight = torch.zeros(0,      dtype=torch.float, device=device)

    graphsage_model.eval()
    with torch.no_grad():
        updated = graphsage_model(x_local, edge_index, edge_weight)

    # Return ALL node embeddings (N, 768) — caller reads [0] for resume,
    # [1..num_jobs] for jobs.  All are 1D (768,) per row.
    return updated   # (N, 768)


# ── Global GNN refresh ────────────────────────────────────────────────────────

def run_graphsage_global(graphsage_model, device) -> int:
    """Re-run GraphSAGE over the entire in-memory graph, updating graphsage_store for ALL nodes.

    Unlike _run_graphsage_local() which builds a per-resume 2-hop subgraph,
    this runs one forward pass over the full graph so every node sees a globally
    consistent neighbourhood — important for cold-start jobs (no interactions yet)
    and for keeping all embeddings in the same GNN output space.

    Edge weights use the same fused semantic × behavioral formula as
    _run_graphsage_local(); job↔user (2-hop) edges use semantic weight only.

    Called by:
      • POST /api/v1/graph/refresh  (on-demand)
      • 24-hour background scheduler in main.py

    Returns:
        Number of node embeddings written to graphsage_store.
    """
    if not feature_store:
        return 0

    # ── Build node index ──────────────────────────────────────────────────────
    node_ids = list(feature_store.keys())
    node_idx = {nid: i for i, nid in enumerate(node_ids)}
    x        = torch.stack([feature_store[nid] for nid in node_ids], dim=0).to(device)  # (N, 768)

    # ── Build edges from edge_store (resume↔job, bidirectional) ──────────────
    all_edges:   List[List[int]] = []
    all_weights: List[float]     = []

    for resume_id, job_edges in edge_store.items():
        if resume_id not in node_idx:
            continue
        src        = node_idx[resume_id]
        resume_vec = feature_store[resume_id]
        for edge in job_edges:
            job_id = edge["job_id"]
            if job_id not in node_idx:
                continue
            dst     = node_idx[job_id]
            job_vec = feature_store[job_id]
            cos_sim = float(F.cosine_similarity(resume_vec.unsqueeze(0), job_vec.unsqueeze(0)).item())
            w       = (cos_sim + 1) / 2  # Maps -1..1 to 0..1
            if w < 1e-4:
                w = 1e-4
            all_edges   += [[src, dst], [dst, src]]
            all_weights += [w, w]

    # ── Build tensors ─────────────────────────────────────────────────────────
    if all_edges:
        edge_index = (
            torch.tensor(all_edges, dtype=torch.long)
            .t()
            .contiguous()
            .to(device)
        )
        edge_weight = torch.tensor(all_weights, dtype=torch.float, device=device)
    else:
        edge_index  = torch.zeros((2, 0), dtype=torch.long, device=device)
        edge_weight = torch.zeros(0,      dtype=torch.float, device=device)

    # ── Forward pass ──────────────────────────────────────────────────────────
    graphsage_model.eval()
    with torch.no_grad():
        updated = graphsage_model(x, edge_index, edge_weight)  # (N, 768)

    # ── Write all outputs to graphsage_store and Redis ─────────────────────────
    for i, nid in enumerate(node_ids):
        graphsage_store[nid] = updated[i]  # (768,)
        graph_store.persist_gnn_embedding(nid, updated[i])

    logger.info(
        "Global GNN refresh complete — updated %d node embeddings, %d edges.",
        len(node_ids), len(all_weights) // 2,
    )
    return len(node_ids)


# ── Recommendations ────────────────────────────────────────────────────────────

def _compute_preference_vector(user_id: str) -> Optional[torch.Tensor]:
    """Build a recency-weighted preference vector from user's behavioral signals.

    Uses raw NLP embeddings from feature_store (not graphsage_store) to avoid
    cross-user contamination through job GNN outputs.

    Caps to MAX_PREFERENCE_INTERACTIONS most recent interactions to prevent
    a diverse history from averaging toward the center of embedding space.

    Returns L2-normalized preference vector, or None if no signals exist.
    """
    interactions = behavioral_store.get(user_id, [])
    if not interactions:
        return None

    sorted_interactions = sorted(interactions, key=lambda x: x.get("timestamp", ""), reverse=True)
    recent = sorted_interactions[:MAX_PREFERENCE_INTERACTIONS]

    now_ts = time.time()
    weighted_sum: Optional[torch.Tensor] = None
    total_weight = 0.0

    for interaction in recent:
        job_vec = feature_store.get(interaction["job_id"])
        if job_vec is None:
            continue

        days_old = (now_ts - datetime.fromisoformat(interaction["timestamp"]).timestamp()) / 86400.0
        recency = math.exp(-math.log(2) * days_old / RECENCY_HALF_LIFE_DAYS)
        w = interaction["weight"] * recency
        if w <= 0.0:
            continue

        weighted_sum = w * job_vec if weighted_sum is None else weighted_sum + w * job_vec
        total_weight += w

    if weighted_sum is None or total_weight <= 0.0:
        return None

    pref = weighted_sum / total_weight
    return F.normalize(pref.unsqueeze(0), p=2, dim=1).squeeze(0)


def _compute_blend_alpha(num_interactions: int) -> float:
    """Return α for query_vec = α·structural + (1-α)·preference.

    α decreases as interactions accumulate, giving preference_vec more influence
    over time, down to a floor of BLEND_ALPHA_MIN.
    """
    n = min(num_interactions, MAX_PREFERENCE_INTERACTIONS)
    return max(BLEND_ALPHA_MIN, BLEND_ALPHA_BASE - BLEND_ALPHA_STEP * n)


def get_activities_query_vector(user_id: str) -> Optional[torch.Tensor]:
    """Return pure preference vector for user — no GraphSAGE mixing.

    Returns the recency-weighted preference vector built from behavioral_store.
    Returns None if no behavioral signals exist for this user.
    """
    return _compute_preference_vector(user_id)


def _build_query_vector(resume_id: str) -> torch.Tensor:
    """Blend GNN structural embedding with user-level behavioral preference vector.

    Cold-start (no interactions): returns graphsage_store[resume_id] unchanged (alpha=1.0).
    With behavioral signals: blends alpha * structural + (1-alpha) * preference_vec.

    Preference vector is built from behavioral_store (click/save signals), NOT edge_store.
    The user is resolved from resume_to_user map (populated when resume nodes are added).

    Raises ValueError if the resume is not found in graphsage_store.
    """
    structural = graphsage_store.get(resume_id)
    if structural is None:
        raise ValueError(f"Resume '{resume_id}' not found in graphsage_store.")

    # Resolve user from resume
    user_id = resume_to_user.get(resume_id)
    if user_id is None:
        return structural

    preference = _compute_preference_vector(user_id)
    if preference is None:
        return structural   # no behavioral signals yet

    n     = len(behavioral_store.get(user_id, []))
    alpha = _compute_blend_alpha(n)
    blended = alpha * structural + (1.0 - alpha) * preference
    return F.normalize(blended.unsqueeze(0), p=2, dim=1).squeeze(0)


def get_recommendations(
    resume_id: str,
    top_k: int,
    device,
    excluded_job_ids: Optional[List[str]] = None,
    mode: str = "resume",
    user_id: Optional[str] = None,
) -> dict:
    """Return ranked job recommendations for a resume, optionally excluding certain jobs.

    The `mode` parameter controls how the query vector is built:
      - "resume"     : pure GraphSAGE structural embedding (graphsage_store) — no preference blend
      - "activities" : pure behavioral preference vector from behavioral_store, keyed by user_id

    When mode=activities, user_id must be provided (passed from the API layer).

    Steps:
      1. Build the query vector based on mode.
      2. Score every job in job_catalog using cosine similarity.
      3. Filter out excluded job IDs.
      4. Sort by score descending and return top-k.

    Args:
        resume_id: Resume node ID
        top_k:    Maximum number of recommendations to return
        device:   Torch device for computations
        excluded_job_ids: Job IDs to exclude (e.g. already-applied jobs)
        mode:     "resume" or "activities"
        user_id:  Job seeker UUID — required when mode=activities

    Returns:
        Dict with resume_id, list of {"job_id": str, "score": float}, and meta.
    """
    if mode == "activities":
        if not user_id:
            logger.warning(
                "[get_recommendations] mode=activities missing user_id resume_id=%s top_k=%d excluded_count=%d",
                resume_id, top_k, len(excluded_job_ids or []),
            )
            return {
                "resume_id": resume_id,
                "recommendations": [],
                "meta": {"mode": mode, "has_signals": False, "error": "user_id is required for activities mode"},
            }

        interactions = behavioral_store.get(user_id, [])
        logger.info(
            "[get_recommendations] mode=activities resume_id=%s user_id=%s interactions=%d top_k=%d snapshot=%s",
            resume_id, user_id, len(interactions), top_k, _debug_behavioral_snapshot(user_id),
        )
        logger.debug(
            "[get_recommendations] behavioral_store_keys=%s user_jobs_keys=%s",
            list(behavioral_store.keys())[:10],
            list(user_jobs.keys())[:10],
        )
        if interactions:
            latest = sorted(interactions, key=lambda x: x.get("timestamp", ""), reverse=True)[:3]
            logger.info(
                "[get_recommendations] mode=activities user_id=%s latest_interactions=%s",
                user_id,
                [
                    {
                        "job_id": i.get("job_id"),
                        "action_type": i.get("action_type"),
                        "weight": i.get("weight"),
                        "timestamp": i.get("timestamp"),
                    }
                    for i in latest
                ],
            )

        query_vec = get_activities_query_vector(user_id)
        if query_vec is None:
            logger.warning(
                "[get_recommendations] mode=activities user_id=%s query_vec=None (no usable signals or missing embeddings)",
                user_id,
            )
            return {
                "resume_id": resume_id,
                "recommendations": [],
                "meta": {"mode": mode, "has_signals": False},
            }
        logger.info(
            "[get_recommendations] mode=activities user_id=%s query_norm=%.6f",
            user_id, float(query_vec.norm().item()),
        )
    else:
        # mode == "resume": pure GraphSAGE structural embedding, no preference blend
        query_vec = graphsage_store.get(resume_id)
        if query_vec is None:
            return {
                "resume_id": resume_id,
                "recommendations": [],
                "meta": {"mode": mode, "error": "resume not found in graphsage_store"},
            }
        logger.info(
            "[get_recommendations] mode=resume resume_id=%s query_norm=%.6f",
            resume_id, float(query_vec.norm().item()),
        )

    excluded_set = set(excluded_job_ids or [])
    catalog_size = len(job_catalog)
    logger.info(
        "[get_recommendations] resume_id=%s top_k=%d job_catalog_size=%d excluded_count=%d mode=%s",
        resume_id, top_k, catalog_size, len(excluded_set), mode,
    )
    if excluded_set:
        logger.debug(
            "[get_recommendations] resume_id=%s excluded_job_ids=%s",
            resume_id, list(excluded_set),
        )

    # Deduplicate: job_catalog is a list that may contain duplicates if the same
    # job was added multiple times (e.g. re-sync). Keep first occurrence.
    seen: set = set()
    scored_jobs: List[tuple[str, float]] = []
    skipped_excluded = 0
    skipped_missing = 0
    skipped_duplicate = 0
    scored_sample: List[dict] = []
    for job_id in job_catalog:
        if job_id in seen:
            skipped_duplicate += 1
            continue
        seen.add(job_id)
        if job_id in excluded_set:
            skipped_excluded += 1
            continue
        job_vec = graphsage_store.get(job_id)
        if job_vec is None:
            skipped_missing += 1
            continue
        # All stored vectors are guaranteed 1D after the add_node/restore fix.
        # cos_sim on two 1D unit-normalized tensors = a single scalar.
        sim_raw = torch.nn.functional.cosine_similarity(query_vec, job_vec, dim=0)
        score   = float(sim_raw.item())

        scored_jobs.append((job_id, score))
        if len(scored_sample) < 5:
            scored_sample.append({
                "job_id": job_id,
                "score": score,
                "job_norm": float(job_vec.norm().item()),
            })

    scored_jobs.sort(key=lambda x: x[1], reverse=True)

    logger.info(
        "[get_recommendations] resume_id=%s scored=%d skipped_excluded=%d skipped_missing=%d skipped_duplicate=%d",
        resume_id, len(scored_jobs), skipped_excluded, skipped_missing, skipped_duplicate,
    )
    logger.debug(
        "[get_recommendations] resume_id=%s sample_scored_jobs=%s",
        resume_id, scored_sample,
    )

    # Log top-5 candidates with their scores
    for rank, (jid, score) in enumerate(scored_jobs[:5], start=1):
        logger.info(
            "[get_recommendations] resume_id=%s rank=%d job_id=%s score=%.6f",
            resume_id, rank, jid, score,
        )

    recommendations = [
        {"job_id": jid, "score": score}
        for jid, score in scored_jobs[:top_k]
    ]

    logger.info(
        "[get_recommendations] resume_id=%s returning=%d (top_k=%d)",
        resume_id, len(recommendations), top_k,
    )

    return {
        "resume_id": resume_id,
        "recommendations": recommendations,
        "meta": {"mode": mode},
    }
