---
trigger: model_decision
description: Apply when working on the Java Spring Boot backend — covers Controller/Service/Repository layered architecture, DTO rules, Redis usage, AI service integration, exception handling, and testing.
---

# backend.md — Java Spring Boot Rules

## Architecture

- MUST follow strict layered architecture: `Controller → Service → Repository`
- MUST NOT allow Controllers to call Repositories directly
- MUST NOT allow Repositories to contain business logic
- MUST NOT allow Services to contain HTTP-specific logic (e.g., `HttpServletRequest`)
- MUST place each layer in its own package: `controller`, `service`, `repository`, `dto`, `model`, `config`

## Controller Layer

- MUST annotate all controllers with `@RestController`
- MUST prefix all controller route mappings with the resource noun (e.g., `/jobs`, `/candidates`)
- MUST NOT perform business logic inside controller methods
- MUST delegate all logic to a corresponding `@Service` class
- MUST validate request bodies using `@Valid` and Bean Validation annotations
- MUST return `ResponseEntity<ApiResponse<T>>` for all endpoints
- MUST NOT return raw domain/entity objects from controller methods

## Service Layer

- MUST annotate all services with `@Service`
- MUST be the only layer permitted to call multiple repositories or compose logic
- MUST handle all checked exceptions and wrap them in a domain-specific exception
- MUST NOT call external HTTP services directly — MUST delegate to a dedicated client class (e.g., `AiServiceClient`)
- MUST be transactional at method level using `@Transactional` where database writes occur

## Repository Layer

- MUST extend `JpaRepository` or `CrudRepository` for all database entities
- MUST NOT contain logic beyond query definitions
- MUST use `@Query` with JPQL (not native SQL) unless native is explicitly required
- MUST name custom query methods following Spring Data naming conventions

## DTO Rules

- MUST use separate DTOs for request input and response output (e.g., `JobRequestDto`, `JobResponseDto`)
- MUST NOT expose JPA entity classes directly as API input/output
- MUST annotate request DTOs with Bean Validation constraints (`@NotNull`, `@Size`, etc.)
- MUST use a dedicated mapper class or MapStruct for entity ↔ DTO conversion
- MUST NOT perform mapping logic inside controllers or services directly

## Redis Usage

- MUST access Redis only through a dedicated `CacheService` or repository abstraction
- MUST NOT access `RedisTemplate` directly from Controller or Service business logic
- MUST set a TTL on every Redis key at write time — no indefinite keys
- MUST prefix all Redis keys with the domain namespace (e.g., `job:detail:{id}`, `rec:user:{userId}`)
- MUST NOT store sensitive data (PII, tokens) in Redis without encryption
- MUST document cache invalidation strategy for every cached entity

## AI Service Integration

- MUST encapsulate all calls to the AI service inside a single `AiServiceClient` class
- MUST use `RestTemplate` or `WebClient` — MUST NOT call AI service endpoints using raw `HttpURLConnection`
- MUST define a timeout for all AI service calls (connect timeout + read timeout)
- MUST handle AI service failures gracefully with fallback logic (e.g., return empty recommendations)
- MUST validate AI service response structure before using it in business logic
- MUST NOT expose AI service errors directly to the end client

## Exception Handling

- MUST use a global `@ControllerAdvice` class for all exception handling
- MUST map all domain exceptions to appropriate HTTP status codes
- MUST NOT use `try/catch` for flow control — only for error recovery
- MUST NOT swallow exceptions silently

## Testing

- MUST write unit tests for every Service method using JUnit 5 + Mockito
- MUST write integration tests for every Controller endpoint using `@SpringBootTest` or `MockMvc`
- MUST NOT write tests that depend on external services (mock them)
