---
trigger: model_decision
description: Apply when working on the Python FastAPI AI/ML service — covers project structure, model loading, recommendation endpoints, Redis caching, and inference error handling.
---

# ai-service.md — Python FastAPI AI Service Rules

## Responsibilities

- MUST handle only AI/ML-related operations: recommendation generation, candidate scoring, job matching, and model inference
- MUST NOT perform user authentication or authorization — MUST delegate to the backend
- MUST NOT read from or write to the primary application database directly
- MUST NOT serve as a general-purpose backend — MUST expose only AI-specific endpoints
- MUST be stateless per request — MUST NOT store user session state internally

## Project Structure

- MUST organize source files as follows:
  ```
  app/
    api/        # FastAPI route definitions
    core/       # Config, startup, lifespan events
    models/     # Pydantic input/output schemas
    services/   # Business logic and model orchestration
    ml/         # Model loading, inference, feature engineering
    utils/      # Pure utility functions
  ```
- MUST NOT place model inference logic inside route handlers
- MUST NOT place Pydantic schema definitions inside route files

## API Input/Output Format

- MUST define all request bodies as Pydantic `BaseModel` classes
- MUST define all response bodies as Pydantic `BaseModel` classes
- MUST NOT return raw Python dicts, lists, or model objects as API responses
- MUST validate all input fields with Pydantic constraints (`min_length`, `ge`, `le`, etc.)
- MUST return all responses in the global envelope format:
  ```json
  {
    "success": true,
    "data": { },
    "error": null,
    "meta": { }
  }
  ```
- MUST use `List[str]` or `List[JobRecommendation]` typed fields — MUST NOT use untyped `Any` in schemas
- MUST version all AI endpoints under `/api/v{n}/` (e.g., `/api/v1/recommend`)

## Model Handling Rules

- MUST load ML models once at application startup using FastAPI lifespan or a singleton pattern
- MUST NOT reload models on every request
- MUST store loaded models in a dedicated model registry object — MUST NOT use global variables directly
- MUST support model versioning — each model artifact MUST be identified by a version string
- MUST NOT hard-code model file paths — MUST read paths from environment variables
- MUST validate that a model artifact exists and is loadable at startup — MUST fail fast if not
- MUST log model version and load time at startup
- MUST NOT block the event loop with synchronous model inference — use `run_in_executor` or background workers for CPU-bound tasks

## Recommendation Logic

- MUST encapsulate all recommendation and scoring logic inside `services/` — MUST NOT inline it in route handlers
- MUST accept a structured candidate profile and job list as input
- MUST return a ranked list of job IDs or candidate IDs with a confidence score per item
- MUST NOT return recommendations without a score field
- MUST cap recommendation list size — MUST NOT return unbounded lists

## Redis Usage (Cache Layer)

- MUST cache recommendation results in Redis with a defined TTL
- MUST use a key format specific to the input context (e.g., `rec:candidate:{candidateId}:v{modelVersion}`)
- MUST invalidate or bypass cache when model version changes
- MUST NOT cache intermediate model states or raw feature vectors

## Error Handling

- MUST use FastAPI exception handlers to return structured error responses
- MUST NOT let unhandled exceptions return a 500 with a raw traceback to the caller
- MUST return `success: false` with a descriptive `error.code` and `error.message` on all failures
- MUST distinguish between input validation errors (`400`) and model inference errors (`500`)

## Performance & Reliability

- MUST enforce request timeouts for inference operations
- MUST expose a `/health` endpoint that returns model load status and service health
- MUST NOT accept inference requests if the model is not yet loaded
- MUST log inference latency per request at `DEBUG` level

## Testing

- MUST write unit tests for all service and ML utility functions using `pytest`
- MUST mock model loading in unit tests — MUST NOT require a real model artifact to run tests
- MUST write integration tests for all API endpoints using `httpx` and FastAPI's `TestClient`
