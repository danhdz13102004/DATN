"""Health check endpoint."""

from fastapi import APIRouter

from app.ml.model_registry import model_registry

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "success": True,
        "data": {
            "status": "UP",
            "service": "recruitpro-ai-service",
            "modelVersion": model_registry.version,
            "modelsLoaded": model_registry.is_loaded,
        },
        "error": None,
        "meta": None,
    }
