---
trigger: model_decision
description: Apply to ALL code generation across every service — covers naming conventions, API response envelope format, API versioning, logging standards, security practices, and general AI agent behavior constraints.
---

# global.md — Shared Rules Across All Services

## Naming Conventions

- MUST use `kebab-case` for file names across all services
- MUST use `camelCase` for JSON field names in all API payloads
- MUST use `SCREAMING_SNAKE_CASE` for environment variables
- MUST use `PascalCase` for class names in Java and Python
- MUST use `snake_case` for Python function and variable names
- MUST use `camelCase` for JavaScript/TypeScript variables and functions
- MUST NOT abbreviate names unless the abbreviation is universally understood (e.g., `id`, `url`)
- MUST prefix boolean fields with `is`, `has`, or `can` (e.g., `isActive`, `hasApplied`)

## API Response Format

- MUST return all API responses in the following envelope structure:
  ```json
  {
    "success": true,
    "data": { },
    "error": null,
    "meta": { }
  }
  ```
- MUST set `success: false` and populate `error` on all failure responses
- MUST include an `error` object with `code` (string) and `message` (string) on failures
- MUST use `meta` for pagination: `{ "page": 1, "pageSize": 20, "total": 100 }`
- MUST return HTTP `200` for successful requests, even with empty `data`
- MUST use standard HTTP status codes: `400` (bad input), `401` (unauth), `403` (forbidden), `404` (not found), `500` (server error)
- MUST NOT return raw stack traces or internal error details to the client

## Versioning

- MUST prefix all API routes with `/api/v{n}/` (e.g., `/api/v1/jobs`)
- MUST NOT remove or break existing versioned endpoints without deprecation notice

## Logging

- MUST log at `INFO` level for normal operations
- MUST log at `ERROR` level with context (service, operation, input) on all failures
- MUST NOT log sensitive data: passwords, tokens, PII
- MUST include a `correlationId` or `requestId` in all log entries for traceability

## Security

- MUST validate and sanitize all external inputs at the service boundary
- MUST NOT trust data received from other internal services without schema validation
- MUST use HTTPS for all inter-service communication in production
- MUST NOT hardcode credentials, API keys, or secrets in source code

## General AI Agent Behavior Constraints

- MUST NOT generate code that mixes layer responsibilities (e.g., DB queries in controllers)
- MUST NOT introduce new dependencies without explicit justification
- MUST follow the existing architecture pattern of the target service
- MUST NOT generate code that bypasses authentication or authorization logic
- MUST produce code that is testable in isolation (no hidden side effects)
- MUST NOT generate commented-out code blocks in final output
