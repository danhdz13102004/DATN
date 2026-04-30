"""Recommendation API router — thin handlers delegating to recommendation_service."""

import logging
import time

from fastapi import APIRouter, HTTPException, Query

from app.ml.model_registry import model_registry
from app.models.schemas import (
    AddNodeRequest,
    AddNodeData,
    InteractionRequest,
    ApplyData,
    RecommendData,
)
from app.services import graph_store
from app.services import recommendation_service as svc
    
logger = logging.getLogger(__name__)

router = APIRouter()


def _guard_models_loaded():
    """Raise 503 if models are not yet loaded."""
    if not model_registry.is_loaded:
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "MODEL_NOT_READY", "message": "Models are not yet loaded."},
                "meta":    None,
            },
        )


@router.post("/add_node", response_model=dict)
def add_node(req: AddNodeRequest):
    """Register a resume or job node.

    Phase 1 (always): stores node ID + type in raw_node_store so the graph
    snapshot immediately reflects the new node.
    Phase 2 (when models ready): NLP-encodes the text into an embedding and
    writes it to feature_store / graphsage_store for recommendations.
    """
    import time as _time
    start = _time.time()

    # Phase 1: register immediately, no model needed
    text_snippet = req.text[:120] if req.text else ""
    svc.raw_node_store[req.node_id] = {
        "node_type":    req.node_type,
        "text_snippet": text_snippet,
        "encoded":      False,
    }
    if req.node_type == "job" and req.node_id not in svc.job_catalog:
        svc.job_catalog.append(req.node_id)
        graph_store.persist_job_catalog(req.node_id)   # ← persist catalog

    # Always persist node metadata to Redis (even in DEGRADED mode)
    graph_store.persist_node(req.node_id, req.node_type, text_snippet)

    # Phase 2: NLP encode only when models are ready
    if model_registry.is_loaded:
        try:
            data = svc.add_node(
                node_id=req.node_id,
                text=req.text,
                node_type=req.node_type,
                nlp_model=model_registry.get("nlp"),
                device=model_registry.device,
            )
            logger.debug("POST /add_node latency=%.3fs", _time.time() - start)
            return {"success": True, "data": AddNodeData(**data), "error": None, "meta": None}
        except Exception as exc:
            logger.error("add_node NLP encoding failed: %s", exc)
            raise HTTPException(
                status_code=500,
                detail={
                    "success": False,
                    "data":    None,
                    "error":   {"code": "INFERENCE_ERROR", "message": str(exc)},
                    "meta":    None,
                },
            )
    else:
        # Models not loaded yet — node registered in raw_node_store, encoding deferred
        logger.warning(
            "add_node(%s): models not loaded, node registered without embedding (DEGRADED mode).",
            req.node_id,
        )
        return {
            "success": True,
            "data": AddNodeData(
                node_id=req.node_id,
                node_type=req.node_type,
                message=f"Node '{req.node_id}' registered (embedding deferred — models not loaded).",
            ),
            "error": None,
            "meta":  {"warning": "Models not loaded. Node visible in graph but not yet available for recommendations."},
        }


@router.post("/interact", response_model=dict)
def handle_interaction(req: InteractionRequest):
    """Record a user→job interaction and update the resume embedding via GraphSAGE.

    The *action_type* field maps to an edge weight via ACTION_WEIGHT_MAP:
      - "apply" → 1.0  (strongest signal)
      - "save"  → 0.7
      - "view"  → 0.1  (weakest signal)
      - "click" → 0.1  (weakest signal, same as view)
    Weights accumulate across calls, so repeated interactions strengthen the edge.
    """
    _guard_models_loaded()

    if req.resume_id not in svc.feature_store:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "NODE_NOT_FOUND", "message": f"Resume '{req.resume_id}' not found. Call /api/v1/add_node first."},
                "meta":    None,
            },
        )
    if req.job_id not in svc.feature_store:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "NODE_NOT_FOUND", "message": f"Job '{req.job_id}' not found. Call /api/v1/add_node first."},
                "meta":    None,
            },
        )

    start = time.time()
    try:
        data = svc.handle_interaction(
            resume_id=req.resume_id,
            job_id=req.job_id,
            action_type=req.action_type,
            graphsage_model=model_registry.get("graphsage"),
            device=model_registry.device,
        )
        logger.debug("POST /apply latency=%.3fs", time.time() - start)
        return {"success": True, "data": ApplyData(**data), "error": None, "meta": None}
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "INVALID_ACTION_TYPE", "message": str(exc)},
                "meta":    {"valid_action_types": sorted(svc.ACTION_WEIGHT_MAP)},
            },
        )
    except Exception as exc:
        logger.error("apply failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "INFERENCE_ERROR", "message": str(exc)},
                "meta":    None,
            },
        )


@router.get("/recommend/{resume_id}", response_model=dict)
def recommend(
    resume_id: str,
    top_k: int = Query(default=5, ge=1, le=50),
):
    """Return ranked job recommendations for a given resume."""
    _guard_models_loaded()

    if resume_id not in svc.graphsage_store:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "NODE_NOT_FOUND", "message": f"Resume '{resume_id}' not found."},
                "meta":    None,
            },
        )

    if not svc.job_catalog:
        return {
            "success": True,    
            "data":    RecommendData(resume_id=resume_id, recommendations=[]),
            "error":   None,
            "meta":    {"message": "No jobs registered yet."},
        }

    start = time.time()
    try:
        data = svc.get_recommendations(
            resume_id=resume_id,
            top_k=top_k,
            device=model_registry.device,
        )
        logger.debug("GET /recommend/%s latency=%.3fs", resume_id, time.time() - start)
        return {"success": True, "data": RecommendData(**data), "error": None, "meta": None}
    except Exception as exc:
        logger.error("recommend failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "INFERENCE_ERROR", "message": str(exc)},
                "meta":    None,
            },
        )
