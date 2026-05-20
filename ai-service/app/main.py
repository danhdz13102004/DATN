"""RecruitPro AI Service — FastAPI Application Entry Point"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.matching import router as matching_router
from app.api.parse_pdf import router as parse_pdf_router
from app.api.recommendations import router as recommendations_router
from app.core.config import settings
from app.ml.model_registry import model_registry
from app.services import graph_store
from app.services import recommendation_service as svc
from app.services.recommendation_service import run_graphsage_global

# Set root logger to INFO so app-level logger.info(...) calls are visible.
# Uvicorn's own logs stay at WARNING unless overridden by --log-level.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

GRAPH_REFRESH_INTERVAL_HOURS = 24


async def _auto_refresh_loop() -> None:
    """Background task: re-run global GNN refresh every 24 hours.

    Starts after a full day so the first run doesn't compete with startup
    model loading.  Silently skips if models are not yet loaded (DEGRADED mode).
    """
    while True:
        await asyncio.sleep(GRAPH_REFRESH_INTERVAL_HOURS * 3600)
        if not model_registry.is_loaded:
            logger.warning("Auto-refresh skipped — service is in DEGRADED mode.")
            continue
        try:
            logger.info("Auto-refresh: running 24-hour global GNN refresh...")
            n = run_graphsage_global(model_registry.get("graphsage"), model_registry.device)
            logger.info("Auto-refresh complete — %d node embeddings updated.", n)
        except Exception as exc:
            logger.exception("Auto-refresh failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models on startup, then restore persisted graph from Redis."""
    # ── 1. Load ML models ─────────────────────────────────────────────────────
    model_registry.load_models()

    # ── 2. Restore graph from Redis (after models loaded so we can re-encode) ─
    if graph_store.ping():
        logger.info("Redis reachable — restoring graph state from Redis DB %d...", settings.redis_graph_db)
        try:
            restored = graph_store.restore_graph(
                raw_node_store  = svc.raw_node_store,
                feature_store   = svc.feature_store,
                graphsage_store = svc.graphsage_store,
                edge_store      = svc.edge_store,
                job_to_users    = svc.job_to_users,
                job_catalog     = svc.job_catalog,
                nlp_model       = model_registry.get("nlp") if model_registry.is_loaded else None,
                device          = model_registry.device,
            )
            logger.info("Graph restore complete: %d node(s) re-encoded.", restored)
        except Exception as exc:
            logger.error("Graph restore failed (starting with empty graph): %s", exc)
    else:
        logger.warning("Redis not reachable at startup — starting with empty in-memory graph.")

    # ── 3. Start 24-hour background GNN refresh loop ──────────────────────────
    refresh_task = asyncio.create_task(_auto_refresh_loop())
    logger.info("Scheduled 24-hour auto-refresh task started.")

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    refresh_task.cancel()
    model_registry.unload_models()


app = FastAPI(
    title="RecruitPro AI Service",
    version=settings.model_version,
    lifespan=lifespan,
)

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(health_router,           prefix="/api/v1", tags=["health"])
app.include_router(recommendations_router,  prefix="/api/v1", tags=["recommendations"])
app.include_router(matching_router,         prefix="/api/v1", tags=["matching"])
app.include_router(graph_router,            prefix="/api/v1", tags=["graph"])
app.include_router(parse_pdf_router,         prefix="/api/v1", tags=["pdf-parsing"])
