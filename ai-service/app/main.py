"""RecruitPro AI Service — FastAPI Application Entry Point"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.health import router as health_router
from app.core.config import settings
from app.ml.model_registry import model_registry


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models on startup, cleanup on shutdown."""
    model_registry.load_models()
    yield
    model_registry.unload_models()


app = FastAPI(
    title="RecruitPro AI Service",
    version=settings.model_version,
    lifespan=lifespan,
)

# ── Register routers ──────────────────────────
app.include_router(health_router, prefix="/api/v1", tags=["health"])
