"""RecruitPro AI Service — FastAPI Application Entry Point"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.recommendations import router as recommendations_router
from app.core.config import settings
from app.ml.model_registry import model_registry
from app.services import graph_store
from app.services import recommendation_service as svc

logger = logging.getLogger(__name__)


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

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    model_registry.unload_models()


app = FastAPI(
    title="RecruitPro AI Service",
    version=settings.model_version,
    lifespan=lifespan,
)

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(health_router,           prefix="/api/v1", tags=["health"])
app.include_router(recommendations_router,  prefix="/api/v1", tags=["recommendations"])
app.include_router(graph_router,            prefix="/api/v1", tags=["graph"])
