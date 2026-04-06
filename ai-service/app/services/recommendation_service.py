"""Recommendation service — all recommendation and scoring logic lives here."""

import logging
import time
from typing import Dict, List, Optional

import torch
import torch.nn.functional as F

from app.services import graph_store

logger = logging.getLogger(__name__)

# ── Module-level in-memory stores (shared across requests) ────────────────────
raw_node_store:  Dict[str, dict]         = {}   # ALL registered nodes (id → {type, text_snippet}) — no model needed
feature_store:   Dict[str, torch.Tensor] = {}   # raw NLP embeddings
graphsage_store: Dict[str, torch.Tensor] = {}   # GraphSAGE-updated embeddings
edge_store:      Dict[str, List[dict]]   = {}   # resume_id → [{job_id, weight}]
job_to_users:    Dict[str, List[str]]    = {}   # job_id → [resume_ids]
job_catalog:     List[str]               = []   # ordered list of all job node IDs

MAX_SIMILAR_USERS = 5
MAX_RECOMMENDATIONS = 50


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
    if node_type == "job" and node_id not in job_catalog:
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
    """Register an application edge and update the resume embedding via GraphSAGE."""
    start = time.time()

    # Register edge
    edges = edge_store.setdefault(resume_id, [])
    found = False
    for edge in edges:
        if edge["job_id"] == job_id:
            edge["weight"] = max(edge["weight"], weight)
            found = True
            break
    if not found:
        edges.append({"job_id": job_id, "weight": weight})

    # Persist edges to Redis after every change
    graph_store.persist_edges(resume_id, edges)

    users_for_job = job_to_users.setdefault(job_id, [])
    if resume_id not in users_for_job:
        users_for_job.append(resume_id)
        graph_store.persist_job_users(job_id, resume_id)   # ← persist to Redis

    # Collect job features and similar users
    job_features = [feature_store[e["job_id"]] * e["weight"] for e in edges]

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
    graphsage_store[resume_id] = updated_vec

    elapsed = time.time() - start
    logger.debug("process_application(%s→%s) in %.3fs", resume_id, job_id, elapsed)

    return {
        "message":           "Application processed. Resume embedding updated.",
        "num_applied_jobs":  len(edges),
        "num_similar_users": len(similar_users),
    }


def get_recommendations(resume_id: str, top_k: int, device) -> dict:
    """Generate hybrid content + CF recommendations for a resume."""
    start = time.time()

    top_k = min(top_k, MAX_RECOMMENDATIONS)
    user_vec = F.normalize(graphsage_store[resume_id], p=2, dim=1)
    job_vecs = F.normalize(
        torch.cat([feature_store[j] for j in job_catalog], dim=0), p=2, dim=1
    )

    with torch.no_grad():
        content_scores = torch.matmul(user_vec, job_vecs.t()).squeeze(0)

    # Collaborative filtering
    cf_weight      = 0.3
    content_weight = 1.0 - cf_weight

    all_users   = list(graphsage_store.keys())
    user_matrix = F.normalize(
        torch.cat([graphsage_store[u] for u in all_users], dim=0), p=2, dim=1
    )

    with torch.no_grad():
        user_sim = torch.matmul(user_vec, user_matrix.t()).squeeze(0)

    user_sim[all_users.index(resume_id)] = -1e9

    top_users  = torch.topk(user_sim, min(3, len(all_users)))
    cf_scores  = torch.zeros(len(job_catalog), device=device)

    for sim_val, idx in zip(top_users.values, top_users.indices):
        u_id = all_users[idx.item()]
        for edge in edge_store.get(u_id, []):
            eid = edge["job_id"]
            if eid in job_catalog:
                cf_scores[job_catalog.index(eid)] += sim_val

    final_scores = content_weight * content_scores + cf_weight * cf_scores

    # Exclude already-applied jobs
    for edge in edge_store.get(resume_id, []):
        eid = edge["job_id"]
        if eid in job_catalog:
            final_scores[job_catalog.index(eid)] = -1e9

    k = min(top_k, len(job_catalog))
    scores, indices = torch.topk(final_scores, k)

    elapsed = time.time() - start
    logger.debug("get_recommendations(%s, top_k=%d) in %.3fs", resume_id, k, elapsed)

    return {
        "resume_id": resume_id,
        "recommendations": [
            {"job_id": job_catalog[i.item()], "score": round(s.item(), 4)}
            for s, i in zip(scores, indices)
        ],
    }


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
