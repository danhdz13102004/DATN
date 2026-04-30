"""Recommendation service — all recommendation and scoring logic lives here."""

import logging
import time
from typing import Dict, List, Optional

import torch
import torch.nn.functional as F

from app.services import graph_store

logger = logging.getLogger(__name__)

# ── Module-level in-memory stores (shared across requests) ────────────────────
raw_node_store:    Dict[str, dict]         = {}   # ALL registered nodes (id → {type, text_snippet}) — no model needed
feature_store:     Dict[str, torch.Tensor] = {}   # raw NLP embeddings
graphsage_store:   Dict[str, torch.Tensor] = {}   # GraphSAGE-updated embeddings
edge_store:        Dict[str, List[dict]]   = {}   # resume_id → [{job_id, weight}]
job_to_users:      Dict[str, List[str]]    = {}   # job_id → [resume_ids]
job_catalog:       List[str]               = []   # ordered list of all job node IDs
job_catalog_index: Dict[str, int]          = {}   # job_id → index in job_catalog (O(1) lookup)

MAX_SIMILAR_USERS   = 5
MAX_RECOMMENDATIONS = 50

# ── Edge weight constants ─────────────────────────────────────────────────────
MAX_EDGE_WEIGHT = 3.0   # hard cap per edge to prevent runaway accumulation
DECAY           = 0.9   # multiplicative decay applied before adding new weight
SMOOTHING_ALPHA = 0.7   # EMA blend: alpha * old + (1-alpha) * new

# ── Interaction weight mapping ────────────────────────────────────────────────
# Maps action_type → edge weight increment.  Add new actions here; the rest of
# the system will pick them up automatically through handle_interaction().
ACTION_WEIGHT_MAP: Dict[str, float] = {
    "apply": 1.0,
    "save":  0.7,
    "click": 0.1,
}


def add_node(node_id: str, text: str, node_type: str, nlp_model, device) -> dict:
    """Encode text and register a resume or job node.

    Also writes to raw_node_store immediately so the graph snapshot always
    reflects registered nodes even before NLP encoding completes.
    """
    start = time.time()

    # ── Step 1: register metadata immediately (visible in graph snapshot) ──────
    text_snippet = text[:120] if text else ""
    raw_node_store[node_id] = {
        "node_type":    node_type,
        "text_snippet": text_snippet,
        "encoded":      False,
    }
    if node_type == "job" and node_id not in job_catalog_index:
        job_catalog_index[node_id] = len(job_catalog)
        job_catalog.append(node_id)
        graph_store.persist_job_catalog(node_id)   # ← persist to Redis

    # Persist node metadata to Redis immediately (before NLP encoding)
    graph_store.persist_node(node_id, node_type, text_snippet)

    # ── Step 2: NLP encoding (requires model) ─────────────────────────────────
    vec_np = nlp_model.encode([text], convert_to_numpy=True)
    vec = torch.tensor(vec_np, dtype=torch.float32).to(device)
    vec = F.normalize(vec, p=2, dim=1)

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
    for edge in edges:
        if edge["job_id"] == job_id:
            edge["weight"] *= DECAY
            edge["weight"] = min(edge["weight"] + weight, MAX_EDGE_WEIGHT)
            break
    else:
        edges.append({"job_id": job_id, "weight": weight})

    # Update reverse index
    users_for_job = job_to_users.setdefault(job_id, [])
    if resume_id not in users_for_job:
        users_for_job.append(resume_id)
        graph_store.persist_job_users(job_id, resume_id)

    # Collect job features — normalize by total weight to prevent any single
    # job from dominating the aggregation
    total_weight = sum(e["weight"] for e in edges) or 1.0
    job_features = [
        feature_store[e["job_id"]] * (e["weight"] / total_weight)
        for e in edges
    ]

    similar_users: List[str] = []
    seen: set = set()
    for edge in edges:
        for other in job_to_users.get(edge["job_id"], []):
            if other != resume_id and other not in seen:
                seen.add(other)
                similar_users.append(other)
                if len(similar_users) >= MAX_SIMILAR_USERS:
                    break
        if len(similar_users) >= MAX_SIMILAR_USERS:
            break

    user_features = [graphsage_store.get(u, feature_store[u]) for u in similar_users]

    # Run local GraphSAGE subgraph
    updated_vec = _run_graphsage_local(
        resume_id=resume_id,
        job_features=job_features,
        user_features=user_features,
        edge_store_snapshot=edges,
        similar_users=similar_users,
        graphsage_model=graphsage_model,
        device=device,
    )
    # EMA smoothing: blend old embedding with new to avoid sudden jumps
    old_vec = graphsage_store.get(resume_id, updated_vec)
    smoothed_vec = F.normalize(
        SMOOTHING_ALPHA * old_vec + (1 - SMOOTHING_ALPHA) * updated_vec,
        p=2, dim=1,
    )
    graphsage_store[resume_id] = smoothed_vec

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
    """Single entry-point for all user→job interactions.

    Steps:
      1. Validate *action_type* against ACTION_WEIGHT_MAP.
      2. Resolve weight from the map.
      3. Persist the edge increment to Redis (HASH, idempotent accumulation).
      4. Update in-memory stores and run GraphSAGE (via process_application).

    To add a new interaction type, simply insert it into ACTION_WEIGHT_MAP.
    No other code needs to change.

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



# ── Private helpers ───────────────────────────────────────────────────────────

def _run_graphsage_local(
    resume_id:           str,
    job_features:        List[torch.Tensor],
    user_features:       List[torch.Tensor],
    edge_store_snapshot: List[dict],
    similar_users:       List[str],
    graphsage_model,
    device,
) -> torch.Tensor:
    resume_vec  = feature_store[resume_id]
    x_local     = torch.cat([resume_vec] + job_features + user_features, dim=0)

    num_jobs    = len(job_features)
    num_users   = len(user_features)
    user_offset = 1 + num_jobs
    local_edges: List[List[int]] = []

    for i in range(num_jobs):
        j = 1 + i
        local_edges += [[0, j], [j, 0]]

    for i in range(num_users):
        u = user_offset + i
        local_edges += [[0, u], [u, 0]]

    for i, edge in enumerate(edge_store_snapshot):
        eid = edge["job_id"]
        j   = 1 + i
        for k, u_id in enumerate(similar_users):
            if u_id in job_to_users.get(eid, []):
                u = user_offset + k
                local_edges += [[j, u], [u, j]]

    if not local_edges:
        return resume_vec

    edge_index = (
        torch.tensor(local_edges, dtype=torch.long)
        .t()
        .contiguous()
        .to(device)
    )

    graphsage_model.eval()
    with torch.no_grad():
        updated = graphsage_model(x_local, edge_index)

    return updated[0].unsqueeze(0)
