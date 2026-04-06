"""Redis-backed graph persistence layer.

Responsibilities:
- Persist every graph mutation (add_node, process_application) to Redis.
- Restore full graph state into in-memory stores on service startup.
- Re-encode NLP embeddings after restore using the loaded NLP model.

Key schema (all under GRAPH_KEY_PREFIX = "graph:"):
  graph:node:<node_id>        → Redis Hash  { node_type, text_snippet }
  graph:edges:<resume_id>     → Redis JSON string  [{"job_id": ..., "weight": ...}, ...]
  graph:job_catalog           → Redis List  [job_id, ...]
  graph:job_users:<job_id>    → Redis Set   {resume_id, ...}
"""

import io
import json
import logging
from typing import TYPE_CHECKING, Dict, List, Optional

import redis
import torch
import torch.nn.functional as F

from app.core.config import settings

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# ── Key naming helpers ────────────────────────────────────────────────────────

_PFX = "graph:"

def _node_key(node_id: str) -> str:
    return f"{_PFX}node:{node_id}"

def _edges_key(resume_id: str) -> str:
    return f"{_PFX}edges:{resume_id}"

def _job_users_key(job_id: str) -> str:
    return f"{_PFX}job_users:{job_id}"

CATALOG_KEY = f"{_PFX}job_catalog"


# ── Redis client (lazy singleton) ─────────────────────────────────────────────

_redis_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    """Return the shared Redis client, creating it on first call."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_graph_db,
            decode_responses=True,
        )
    return _redis_client


def ping() -> bool:
    """Return True if Redis is reachable."""
    try:
        return get_redis().ping()
    except Exception:
        return False


# ── Write helpers (called on every mutation) ──────────────────────────────────

def persist_node(node_id: str, node_type: str, text_snippet: str) -> None:
    """Upsert node metadata in Redis."""
    try:
        get_redis().hset(
            _node_key(node_id),
            mapping={
                "node_type":    node_type,
                "text_snippet": text_snippet,
            },
        )
    except Exception as exc:
        logger.warning("graph_store.persist_node(%s) failed: %s", node_id, exc)


def persist_edges(resume_id: str, edges: List[dict]) -> None:
    """Overwrite the edge list for a resume in Redis."""
    try:
        get_redis().set(_edges_key(resume_id), json.dumps(edges))
    except Exception as exc:
        logger.warning("graph_store.persist_edges(%s) failed: %s", resume_id, exc)


def persist_job_catalog(job_id: str) -> None:
    """Append a new job_id to the ordered catalog list (idempotent via LREM+RPUSH)."""
    try:
        r = get_redis()
        # Remove duplicates first, then append — keeps ordering deterministic
        r.lrem(CATALOG_KEY, 0, job_id)
        r.rpush(CATALOG_KEY, job_id)
    except Exception as exc:
        logger.warning("graph_store.persist_job_catalog(%s) failed: %s", job_id, exc)


def persist_job_users(job_id: str, resume_id: str) -> None:
    """Add resume_id to the set of users for a job (idempotent SADD)."""
    try:
        get_redis().sadd(_job_users_key(job_id), resume_id)
    except Exception as exc:
        logger.warning("graph_store.persist_job_users(%s, %s) failed: %s", job_id, resume_id, exc)


# ── Restore on startup ────────────────────────────────────────────────────────

def restore_graph(
    raw_node_store:  dict,
    feature_store:   dict,
    graphsage_store: dict,
    edge_store:      dict,
    job_to_users:    dict,
    job_catalog:     list,
    nlp_model,
    device,
) -> int:
    """Reload graph state from Redis into the in-memory stores.

    Args:
        raw_node_store:  module-level dict from recommendation_service
        feature_store:   module-level dict from recommendation_service
        graphsage_store: module-level dict from recommendation_service
        edge_store:      module-level dict from recommendation_service
        job_to_users:    module-level dict from recommendation_service
        job_catalog:     module-level list from recommendation_service
        nlp_model:       loaded NLP model (sentence-transformer) — used to re-encode
        device:          torch device

    Returns:
        Number of nodes successfully restored and re-encoded.
    """
    r = get_redis()
    restored = 0

    # ── 1. Scan all node keys ─────────────────────────────────────────────────
    node_keys = list(r.scan_iter(f"{_PFX}node:*"))
    logger.info("graph_store: restoring %d node(s) from Redis...", len(node_keys))

    texts_to_encode: Dict[str, str] = {}  # node_id → full text_snippet

    for key in node_keys:
        data = r.hgetall(key)
        if not data:
            continue
        node_id      = key[len(f"{_PFX}node:"):]
        node_type    = data.get("node_type", "resume")
        text_snippet = data.get("text_snippet", "")

        raw_node_store[node_id] = {
            "node_type":    node_type,
            "text_snippet": text_snippet,
            "encoded":      False,   # will be set True after re-encoding
        }
        texts_to_encode[node_id] = text_snippet

    # ── 2. Batch re-encode all nodes ──────────────────────────────────────────
    if texts_to_encode and nlp_model is not None:
        node_ids  = list(texts_to_encode.keys())
        texts     = [texts_to_encode[nid] for nid in node_ids]
        logger.info("graph_store: re-encoding %d node(s) with NLP model...", len(texts))
        try:
            vecs_np = nlp_model.encode(texts, convert_to_numpy=True, batch_size=32, show_progress_bar=False)
            for i, node_id in enumerate(node_ids):
                vec = torch.tensor(vecs_np[i:i+1], dtype=torch.float32).to(device)
                vec = F.normalize(vec, p=2, dim=1)
                feature_store[node_id]          = vec
                graphsage_store[node_id]        = vec.clone()
                raw_node_store[node_id]["encoded"] = True
                restored += 1
        except Exception as exc:
            logger.error("graph_store: NLP re-encoding failed: %s", exc)

    # ── 3. Restore job_catalog (ordered list) ─────────────────────────────────
    catalog_from_redis = r.lrange(CATALOG_KEY, 0, -1)
    for jid in catalog_from_redis:
        if jid not in job_catalog:
            job_catalog.append(jid)
    logger.info("graph_store: restored job_catalog with %d job(s).", len(job_catalog))

    # ── 4. Restore edges ──────────────────────────────────────────────────────
    edge_keys = list(r.scan_iter(f"{_PFX}edges:*"))
    for key in edge_keys:
        resume_id = key[len(f"{_PFX}edges:"):]
        raw      = r.get(key)
        if not raw:
            continue
        try:
            edges = json.loads(raw)
            edge_store[resume_id] = edges
        except (json.JSONDecodeError, Exception) as exc:
            logger.warning("graph_store: could not parse edges for %s: %s", resume_id, exc)

    # ── 5. Restore job_to_users reverse index ─────────────────────────────────
    job_user_keys = list(r.scan_iter(f"{_PFX}job_users:*"))
    for key in job_user_keys:
        job_id   = key[len(f"{_PFX}job_users:"):]
        members  = r.smembers(key)
        job_to_users[job_id] = list(members)

    logger.info(
        "graph_store: restore complete — %d encoded, %d edges, %d job→user mappings.",
        restored, len(edge_store), len(job_to_users),
    )
    return restored
