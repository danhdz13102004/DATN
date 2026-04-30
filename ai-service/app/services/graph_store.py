"""Redis-backed graph persistence layer.

Responsibilities:
- Persist every graph mutation (add_node, handle_interaction) to Redis.
- Restore full graph state into in-memory stores on service startup.
- Re-encode NLP embeddings after restore using the loaded NLP model.

Key schema (all under GRAPH_KEY_PREFIX = "graph:"):
  graph:node:<node_id>        → Redis Hash  { node_type, text_snippet }
  graph:edges:<resume_id>     → Redis Hash  { job_id: cumulative_weight, … }
  graph:job_edges:<job_id>    → Redis Hash  { resume_id: cumulative_weight, … }  (reverse)
  graph:job_catalog           → Redis List  [job_id, ...]
  graph:job_users:<job_id>    → Redis Set   {resume_id, ...}

Edge persistence uses HINCRBYFLOAT so weights accumulate across interactions;
an edge is created automatically on first write.
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

def _job_edges_key(job_id: str) -> str:
    return f"{_PFX}job_edges:{job_id}"

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


def persist_edge(resume_id: str, job_id: str, weight: float) -> None:
    """Accumulate *weight* on the edge resume→job (and its reverse) using HINCRBYFLOAT.

    The Redis HASH is created automatically if it does not exist, so calling
    this function is sufficient to both create and update edges.
    """
    try:
        r = get_redis()
        r.hincrbyfloat(_edges_key(resume_id), job_id, weight)
        r.hincrbyfloat(_job_edges_key(job_id), resume_id, weight)
    except Exception as exc:
        logger.warning("graph_store.persist_edge(%s→%s) failed: %s", resume_id, job_id, exc)


def get_edges(resume_id: str) -> List[dict]:
    """Return all edges for *resume_id* as a list of {job_id, weight} dicts."""
    try:
        raw = get_redis().hgetall(_edges_key(resume_id))
        return [{"job_id": jid, "weight": float(w)} for jid, w in raw.items()]
    except Exception as exc:
        logger.warning("graph_store.get_edges(%s) failed: %s", resume_id, exc)
        return []


def load_edges_into_memory(edge_store: dict, job_to_users: dict) -> int:
    """Scan Redis for all edge hashes and populate *edge_store* / *job_to_users*.

    Handles legacy keys stored as JSON strings: migrates them to HASH format
    in-place and removes the old STRING key.

    Returns the total number of edges loaded.
    """
    r = get_redis()
    total = 0
    for key in r.scan_iter(f"{_PFX}edges:*"):
        resume_id = key[len(f"{_PFX}edges:"):]
        ktype = r.type(key)

        if ktype == "hash":
            raw = r.hgetall(key)
            edges = [{"job_id": jid, "weight": float(w)} for jid, w in raw.items()]
        elif ktype == "string":   # legacy JSON blob — migrate on the fly
            try:
                edges = json.loads(r.get(key) or "[]")
            except (json.JSONDecodeError, Exception):
                edges = []
            # Migrate: write to HASH, remove old STRING key
            if edges:
                pipe = r.pipeline()
                for edge in edges:
                    pipe.hset(_edges_key(resume_id), edge["job_id"], edge["weight"])
                    pipe.hset(_job_edges_key(edge["job_id"]), resume_id, edge["weight"])
                pipe.delete(key)
                pipe.execute()
                logger.info("graph_store: migrated %d legacy JSON edge(s) for %s to HASH.", len(edges), resume_id)
        else:
            continue

        edge_store[resume_id] = edges
        for edge in edges:
            users = job_to_users.setdefault(edge["job_id"], [])
            if resume_id not in users:
                users.append(resume_id)
        total += len(edges)
    return total


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

    # ── 4. Restore edges (HASH format, migrates legacy JSON blobs) ──────────────
    edge_count = load_edges_into_memory(edge_store, job_to_users)
    logger.info("graph_store: restored %d edge(s) from Redis.", edge_count)

    # ── 5. Restore job_to_users reverse index (Redis Set) ────────────────────
    job_user_keys = list(r.scan_iter(f"{_PFX}job_users:*"))
    for key in job_user_keys:
        job_id  = key[len(f"{_PFX}job_users:"):]
        members = r.smembers(key)
        existing = set(job_to_users.get(job_id, []))
        job_to_users[job_id] = list(existing | set(members))

    logger.info(
        "graph_store: restore complete — %d encoded, %d edges, %d job→user mappings.",
        restored, edge_count, len(job_to_users),
    )
    return restored
