"""Health check endpoint."""

from fastapi import APIRouter

from app.ml.model_registry import model_registry
from app.services import graph_store
from app.services import recommendation_service as svc

router = APIRouter()


@router.get("/health")
async def health():
    redis_ok = graph_store.ping()
    return {
        "success": True,
        "data": {
            "status":        "UP",
            "service":       "recruitpro-ai-service",
            "modelVersion":  model_registry.version,
            "modelsLoaded":  model_registry.is_loaded,
            "redis": {
                "connected": redis_ok,
                "graphDb":   1,
            },
            "graph": {
                "nodes":  len(svc.raw_node_store),
                "edges":  sum(len(v) for v in svc.edge_store.values()),
                "jobs":   len(svc.job_catalog),
            },
        },
        "error": None,
        "meta":  None,
    }
