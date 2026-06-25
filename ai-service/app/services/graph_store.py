import base64
import io
import json
import logging
import time
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

def _edges_ts_key(resume_id: str) -> str:
    return f"{_PFX}edges_ts:{resume_id}"

CATALOG_KEY = f"{_PFX}job_catalog"
BEHAVIORAL_KEY = f"{_PFX}behavioral"


def persist_behavioral_signal(user_id: str, job_id: str, action_type: str, weight: float, timestamp: str) -> None:
    """Persist one behavioral interaction to Redis."""
    try:
        payload = json.dumps({
            "job_id": job_id,
            "action_type": action_type,
            "weight": weight,
            "timestamp": timestamp,
        })
        get_redis().rpush(f"{BEHAVIORAL_KEY}:{user_id}", payload)
    except Exception as exc:
        logger.warning("graph_store.persist_behavioral_signal(%s, %s) failed: %s", user_id, job_id, exc)


def load_behavioral_into_memory(behavioral_store: dict, user_jobs: dict) -> int:
    """Restore behavioral history from Redis into in-memory stores."""
    r = get_redis()
    total = 0
    for key in r.scan_iter(f"{BEHAVIORAL_KEY}:*"):
        user_id = key[len(f"{BEHAVIORAL_KEY}:"):]
        try:
            raw_items = r.lrange(key, 0, -1)
            interactions = []
            jobs = []
            for raw in raw_items:
                item = json.loads(raw)
                interactions.append(item)
                job_id = item.get("job_id")
                if job_id and job_id not in jobs:
                    jobs.append(job_id)
            behavioral_store[user_id] = interactions
            user_jobs[user_id] = jobs
            total += len(interactions)
        except Exception as exc:
            logger.warning("graph_store.load_behavioral_into_memory(%s) failed: %s", user_id, exc)
    return total


def _gnn_key(node_id: str) -> str:
    return f"{_PFX}gnn:{node_id}"


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
        r.hset(_edges_ts_key(resume_id), job_id, time.time())
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
            # Restore timestamps; default to now for edges without a recorded timestamp
            ts_raw = r.hgetall(_edges_ts_key(resume_id))
            now_ts = time.time()
            for edge in edges:
                ts = ts_raw.get(edge["job_id"])
                edge["updated_at"] = float(ts) if ts else now_ts
        elif ktype == "string":   # legacy JSON blob — migrate on the fly
            try:
                edges = json.loads(r.get(key) or "[]")
            except (json.JSONDecodeError, Exception):
                edges = []
            # Migrate: write to HASH, remove old STRING key
            if edges:
                now_ts = time.time()
                pipe = r.pipeline()
                for edge in edges:
                    pipe.hset(_edges_key(resume_id), edge["job_id"], edge["weight"])
                    pipe.hset(_job_edges_key(edge["job_id"]), resume_id, edge["weight"])
                    pipe.hset(_edges_ts_key(resume_id), edge["job_id"], now_ts)
                    edge.setdefault("updated_at", now_ts)
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


def persist_gnn_embedding(node_id: str, tensor: torch.Tensor) -> None:
    """Persist a GraphSAGE GNN embedding so it survives service restarts.

    The tensor is serialized as a base64-encoded pickle, which is compact and
    preserves dtype/shape exactly. Redis STRING is used because each node has
    exactly one embedding.
    """
    try:
        buf = io.BytesIO()
        torch.save(tensor.cpu(), buf)
        encoded = base64.b64encode(buf.getvalue()).decode("ascii")
        get_redis().set(_gnn_key(node_id), encoded)
    except Exception as exc:
        logger.warning("graph_store.persist_gnn_embedding(%s) failed: %s", node_id, exc)


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
                vec = torch.tensor(vecs_np[i], dtype=torch.float32).squeeze(0).to(device)
                vec = F.normalize(vec.unsqueeze(0), p=2, dim=1).squeeze(0)
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
    # Rebuild job_catalog_index so add_node doesn't create duplicates on re-sync
    from app.services.recommendation_service import job_catalog_index as idx  # avoid circular import at top
    idx.clear()
    for pos, jid in enumerate(job_catalog):
        idx[jid] = pos
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

    # ── 6. Restore GNN embeddings from Redis (fallback to NLP on miss) ────────
    gnn_keys = list(r.scan_iter(f"{_PFX}gnn:*"))
    gnn_restored = 0
    for key in gnn_keys:
        node_id = key[len(f"{_PFX}gnn:"):]
        raw = r.get(key)
        if not raw:
            continue
        try:
            buf = io.BytesIO(base64.b64decode(raw))
            tensor = torch.load(buf, map_location=device, weights_only=False)
            graphsage_store[node_id] = tensor.squeeze(0).to(device)
            gnn_restored += 1
        except Exception as exc:
            logger.warning("graph_store: failed to restore GNN embedding for %s: %s", node_id, exc)
    if gnn_keys:
        logger.info("graph_store: restored %d GNN embedding(s) from Redis (fallback to NLP for %d).",
                    gnn_restored, len(gnn_keys) - gnn_restored)

    logger.info(
        "graph_store: restore complete — %d encoded, %d edges, %d job→user mappings, %d GNN embeddings.",
        restored, edge_count, len(job_to_users), gnn_restored,
    )
    return restored
