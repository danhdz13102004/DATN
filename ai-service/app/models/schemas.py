"""Pydantic request/response schemas for the AI service."""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ── Request Schemas ───────────────────────────────────────────────────────────

class AddNodeRequest(BaseModel):
    node_id: str = Field(..., min_length=1, description="Unique identifier for the node")
    text: str = Field(..., min_length=1, description="Raw text to embed (resume or job description)")
    node_type: str = Field(..., pattern="^(resume|job)$", description="Must be 'resume' or 'job'")
    user_id: Optional[str] = Field(
        None,
        min_length=1,
        description="Job seeker UUID for resume nodes — used to build resume_to_user mapping for behavioral recommendations",
    )


class ApplyRequest(BaseModel):
    resume_id: str = Field(..., min_length=1, description="Resume node ID")
    job_id: str = Field(..., min_length=1, description="Job node ID")
    weight: float = Field(default=1.0, ge=0.0, le=10.0, description="Edge weight for this application")


class InteractionRequest(BaseModel):
    """Base interaction request supporting both single and multi-resume formats."""
    resume_id: Optional[str] = Field(None, min_length=1, description="Single resume node ID (for apply events)")
    resume_ids: Optional[List[str]] = Field(None, description="Multiple resume node IDs (legacy — ignored for click/save)")
    job_id: str = Field(..., min_length=1, description="Job node ID")
    action_type: str = Field(
        default="apply",
        description="Interaction type: apply, save, or click",
    )

    def validate_mutually_exclusive(self) -> None:
        """Ensure exactly one of resume_id or resume_ids is provided."""
        if self.resume_id and self.resume_ids:
            raise ValueError("Cannot specify both 'resume_id' and 'resume_ids'. Choose one.")
        if not self.resume_id and not self.resume_ids:
            raise ValueError("Must specify either 'resume_id' (for apply) or 'resume_ids' (for click/save).")


class BehavioralSignalRequest(BaseModel):
    """Request schema for user-level behavioral signals (click/save).
    
    These events are recorded as user-level signals and do NOT create graph edges.
    The X-User-ID header must be provided to identify the job seeker.
    """
    job_id: str = Field(..., min_length=1, description="Job node ID")
    action_type: str = Field(
        ...,
        pattern="^(click|save)$",
        description="Interaction type: click or save",
    )


class MultiResumeInteractionRequest(BaseModel):
    """Request schema for click/save events with multiple resumes."""
    resume_ids: List[str] = Field(..., min_length=1, description="List of resume node IDs")
    job_id: str = Field(..., min_length=1, description="Job node ID")
    action_type: str = Field(
        default="click",
        description="Interaction type: click or save",
    )


class ApplyInteractionRequest(BaseModel):
    """Request schema for apply events with single resume."""
    resume_id: str = Field(..., min_length=1, description="Resume node ID")
    job_id: str = Field(..., min_length=1, description="Job node ID")
    action_type: str = Field(default="apply", description="Interaction type: apply")


class ResumeMatchPayload(BaseModel):
    skills: Optional[str] = None
    experience_bullets: Optional[str] = None
    seniority: Optional[str] = None
    industry: Optional[str] = None


class JobMatchPayload(BaseModel):
    must_have_skills: Optional[List[str]] = None
    nice_to_have_skills: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    seniority: Optional[List[str]] = None
    industry: Optional[str] = None


class MatchRequest(BaseModel):
    application_id: str = Field(..., min_length=1, description="Application UUID for logging/tracing")
    resume: ResumeMatchPayload
    job: JobMatchPayload


class ParsePdfRequest(BaseModel):
    resume_id: str = Field(..., min_length=1, description="Resume UUID for logging/tracing")
    pdf_base64: str = Field(..., min_length=1, description="Base64-encoded PDF file bytes")


# ── Response Sub-schemas ──────────────────────────────────────────────────────

class JobRecommendation(BaseModel):
    job_id: str
    score: float


class AddNodeData(BaseModel):
    node_id: str
    node_type: str
    message: str


class ApplyData(BaseModel):
    message: str
    num_applied_jobs: int
    num_similar_users: int
    action_type: Optional[str] = None
    weight: Optional[float] = None


class BehavioralSignalData(BaseModel):
    """Response data for user-level behavioral signal recording (click/save)."""
    job_id: str
    action_type: str
    user_id: str
    message: str


class AttributionResult(BaseModel):
    """Single resume attribution with computed weight."""
    resume_id: str
    attribution_probability: float
    confidence: float
    final_weight: float
    edge_created: bool


class MultiResumeInteractionData(BaseModel):
    """Response data for multi-resume interaction processing."""
    job_id: str
    action_type: str
    confidence: float
    confidence_level: str  # "high", "medium", "low", or "ignored"
    original_weight: float
    total_weight_distributed: float
    num_resumes_attributed: int
    num_resumes_ignored: int
    attributions: List[AttributionResult]
    message: str


class RecommendData(BaseModel):
    resume_id: str
    recommendations: List[JobRecommendation]


class MatchResult(BaseModel):
    overall_score: float
    skills: float
    experience: float
    seniority: float
    industry: float
    nice_to_have_skills: float


class ParsePdfData(BaseModel):
    resume_id: str
    text: str
    method: str  # "native" or "ocr"
    chars_extracted: int


class ParsePdfResponse(BaseModel):
    success: bool
    data: Optional[ParsePdfData] = None
    error: Optional[object] = None
    meta: Optional[object] = None


# ── Envelope Response Schemas ─────────────────────────────────────────────────

class ApiResponse(BaseModel):
    success: bool
    data: Optional[object] = None
    error: Optional[object] = None
    meta: Optional[object] = None
