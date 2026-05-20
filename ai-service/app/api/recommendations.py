"""Recommendation API router — thin handlers delegating to recommendation_service."""
from typing import Optional

import logging
import time

from fastapi import APIRouter, HTTPException, Query, Request

from app.ml.model_registry import model_registry
from app.models.schemas import (
    AddNodeRequest,
    AddNodeData,
    InteractionRequest,
    ApplyData,
    RecommendData,
    MultiResumeInteractionData,
    BehavioralSignalData,
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
def add_node(req: AddNodeRequest, user_id: Optional[str] = None):
    import time as _time
    start = _time.time()

    # Phase 1: register immediately, no model needed
    text_snippet = req.text[:120] if req.text else ""
    node_meta = {
        "node_type":    req.node_type,
        "text_snippet": text_snippet,
        "encoded":      False,
    }
    if user_id is not None:
        node_meta["user_id"] = user_id
    svc.raw_node_store[req.node_id] = node_meta
    if req.node_type == "job" and req.node_id not in svc.job_catalog:
        svc.job_catalog.append(req.node_id)
        graph_store.persist_job_catalog(req.node_id)

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
                user_id=user_id,
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
        # For resume nodes with user_id, also populate resume_to_user in-memory map
        # so behavioral signals can be resolved even before encoding
        if req.node_type == "resume" and user_id is not None:
            svc.resume_to_user[req.node_id] = user_id
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
def handle_interaction(req: InteractionRequest, request: Request):
    """Record a user→job interaction.

    APPLY EVENTS (single resume):
        Creates a graph edge and updates GraphSAGE embedding.
        Body: {"resume_id": "...", "job_id": "...", "action_type": "apply"}

    CLICK/SAVE EVENTS (user-level behavioral signals):
        Records click/save as user-level behavioral signals. NO graph edge is created.
        NO GraphSAGE embedding update. Behavioral signals feed into preference vector only.
        Header: X-User-ID: {job_seeker_id}
        Body: {"job_id": "...", "action_type": "click"}
    """
    _guard_models_loaded()

    action_type = req.action_type.lower()
    job_id = req.job_id

    # Validate job exists in job catalog
    if job_id not in svc.job_catalog:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "NODE_NOT_FOUND", "message": f"Job '{job_id}' not found in job catalog."},
                "meta":    None,
            },
        )

    start = time.time()

    try:
        # ── APPLY EVENTS: single resume, creates graph edge, updates GraphSAGE ──
        if action_type == "apply":
            if not req.resume_id:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "success": False,
                        "data":    None,
                        "error":   {"code": "MISSING_RESUME_ID", "message": "Apply events require 'resume_id' field."},
                        "meta":    None,
                    },
                )

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

            data = svc.handle_interaction(
                resume_id=req.resume_id,
                job_id=job_id,
                action_type=action_type,
                graphsage_model=model_registry.get("graphsage"),
                device=model_registry.device,
            )
            logger.debug("POST /interact (apply) latency=%.3fs", time.time() - start)
            return {"success": True, "data": ApplyData(**data), "error": None, "meta": None}

        # ── CLICK/SAVE EVENTS: user-level behavioral signals only ─────────────────
        elif action_type in ("click", "save"):
            job_seeker_id = request.headers.get("x-user-id")
            if not job_seeker_id:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "success": False,
                        "data":    None,
                        "error":   {"code": "MISSING_USER_ID", "message": "X-User-ID header is required for click/save events."},
                        "meta":    None,
                    },
                )

            svc._record_behavioral_signal(job_seeker_id, job_id, action_type)

            logger.debug("POST /interact (behavioral) latency=%.3fs", time.time() - start)
            return {
                "success": True,
                "data": BehavioralSignalData(
                    job_id=job_id,
                    action_type=action_type,
                    user_id=job_seeker_id,
                    message="Behavioral signal recorded.",
                ),
                "error": None,
                "meta": None,
            }

        # ── UNKNOWN ACTION TYPE ─────────────────────────────────────────────────
        else:
            raise ValueError(
                f"Unknown action_type '{action_type}'. Valid types: {sorted(svc.ACTION_WEIGHT_MAP)}"
            )

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
        logger.error("interact failed: %s", exc)
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
    excluded_job_ids: str = Query(default="", description="Comma-separated job IDs to exclude"),
):
    """Return ranked job recommendations for a given resume, optionally excluding specified jobs."""
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

    excluded = [jid.strip() for jid in excluded_job_ids.split(",") if jid.strip()] if excluded_job_ids else None

    logger.info(
        "[recommend] resume_id=%s top_k=%d excluded_job_ids=%s excluded_count=%d",
        resume_id, top_k, excluded_job_ids, len(excluded) if excluded else 0,
    )

    start = time.time()
    try:
        data = svc.get_recommendations(
            resume_id=resume_id,
            top_k=top_k,
            device=model_registry.device,
            excluded_job_ids=excluded,
        )
        elapsed = time.time() - start
        num_recs = len(data.get("recommendations", []))
        logger.info(
            "[recommend] resume_id=%s returned %d recommendations in %.3fs",
            resume_id, num_recs, elapsed,
        )
        if num_recs > 0:
            top = data["recommendations"][0]
            logger.info(
                "[recommend] resume_id=%s top_match job_id=%s score=%.4f",
                resume_id, top["job_id"], top["score"],
            )
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
