"""Pydantic request/response schemas for the AI service."""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ── Request Schemas ───────────────────────────────────────────────────────────

class AddNodeRequest(BaseModel):
    node_id: str = Field(..., min_length=1, description="Unique identifier for the node")
    text: str = Field(..., min_length=1, description="Raw text to embed (resume or job description)")
    node_type: str = Field(..., pattern="^(resume|job)$", description="Must be 'resume' or 'job'")


class ApplyRequest(BaseModel):
    resume_id: str = Field(..., min_length=1, description="Resume node ID")
    job_id: str = Field(..., min_length=1, description="Job node ID")
    weight: float = Field(default=1.0, ge=0.0, le=10.0, description="Edge weight for this application")


class InteractionRequest(BaseModel):
    resume_id: str = Field(..., min_length=1, description="Resume node ID")
    job_id: str = Field(..., min_length=1, description="Job node ID")
    action_type: str = Field(
        default="apply",
        description="Interaction type that maps to an edge weight (apply, save, view, …)",
    )


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


# ── Envelope Response Schemas ─────────────────────────────────────────────────

class ApiResponse(BaseModel):
    success: bool
    data: Optional[object] = None
    error: Optional[object] = None
    meta: Optional[object] = None
