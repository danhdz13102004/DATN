"""Matching API router — scores a resume against a job description."""

import logging

from fastapi import APIRouter, HTTPException

from app.ml.matching import match_resume_job
from app.ml.model_registry import model_registry
from app.models.schemas import MatchRequest, MatchResult

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/match", response_model=MatchResult)
def match(req: MatchRequest):
    """
    Compute a detailed AI matching score between a resume and a job description.

    Scoring dimensions:
    - skills         : resume skills  ↔  job must-have skills       (cosine, weight 0.40)
    - experience     : experience bullets ↔ responsibilities         (cosine, weight 0.30)
    - seniority      : resume seniority  ↔  job seniority levels    (exact,  weight 0.15)
    - industry       : resume industry   ↔  job industry            (cosine, weight 0.10)
    - nice_to_have   : resume skills     ↔  nice-to-have skills      (cosine, weight 0.05, bonus only)

    Weights are rebalanced when a pair is skipped (insufficient data).
    Returns an overall_score plus individual dimension scores (all in [0, 1]).
    """
    if not model_registry.is_loaded:
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "data": None,
                "error": {"code": "MODEL_NOT_READY", "message": "Models are not yet loaded."},
                "meta": None,
            },
        )

    try:
        result = match_resume_job(
            resume=req.resume.model_dump(),
            job=req.job.model_dump(),
            model=model_registry.get("nlp"),
        )
        logger.info(
            "POST /match application_id=%s overall=%.4f",
            req.application_id,
            result["overall_score"],
        )
        return MatchResult(**result)
    except Exception as exc:
        logger.error("Matching failed for application_id=%s: %s", req.application_id, exc)
        raise HTTPException(status_code=500, detail={"success": False, "error": str(exc)})
