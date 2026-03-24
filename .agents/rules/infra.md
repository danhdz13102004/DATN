---
trigger: model_decision
description: Apply when working on infrastructure, Docker, or DevOps — covers docker-compose services, networking, environment variables, Redis/MinIO setup, volume management, hot reload for Spring Boot/React/FastAPI, and build/deployment.
---

# infra.md — Infrastructure Rules (Docker Compose + Redis + MinIO)

## Docker General Rules

- MUST use a `docker-compose.yml` file as the single source of truth for local development orchestration
- MUST use a separate `docker-compose.dev.yml` for local developer overrides — MUST NOT modify the base file for personal settings
- MUST NOT run any service as `root` inside a container — MUST define a non-root user in each `Dockerfile` (exception: `Dockerfile.dev` images MAY run as root when bind-mounted volumes require host-uid write access)
- MUST use multi-stage builds for all production `Dockerfile`s to minimize final image size
- MUST pin all base image versions explicitly (e.g., `openjdk:21-jdk-slim`) — MUST NOT use `latest` tags
- MUST use `.dockerignore` in every service directory to exclude build artifacts, test files, and secrets

## Service Definitions

- MUST define the following services in `docker-compose.yml`:
  | Service        | Purpose                            |
  |----------------|------------------------------------|
  | `backend`      | Java Spring Boot API               |
  | `frontend`     | React dev server or static build   |
  | `ai-service`   | Python FastAPI recommendation API  |
  | `redis`        | Cache and message broker           |
  | `db`           | PostgreSQL primary database        |
  | `minio`        | S3-compatible object storage       |
- MUST assign each service a fixed internal hostname matching its service name (Docker Compose default)
- MUST NOT expose database or Redis ports to the host in production profiles
- MUST expose only the `backend` and `frontend` services to the host network for external access in development
- MUST define `depends_on` with `condition: service_healthy` for services that require another to be ready
- MUST define a `healthcheck` block for every service

## Networking

- MUST define a single custom bridge network (e.g., `app-network`) and attach all services to it
- MUST NOT use the default Docker bridge network
- MUST NOT allow the `frontend` container to communicate directly with `db` or `redis`

## Environment Variable Rules

- MUST NOT hardcode any environment variable value inside `docker-compose.yml`
- MUST load all environment variables from a `.env` file at the project root
- MUST provide a `.env.example` file with all required keys and placeholder values
- MUST NOT commit `.env` files to version control — MUST add to `.gitignore`
- MUST name all environment variables using `SCREAMING_SNAKE_CASE`
- MUST prefix service-specific variables with the service name (e.g., `BACKEND_DB_URL`, `AI_SERVICE_MODEL_PATH`)
- MUST define the following mandatory variables:
  ```
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  REDIS_HOST
  REDIS_PORT
  BACKEND_PORT
  AI_SERVICE_PORT
  AI_SERVICE_MODEL_PATH
  AI_SERVICE_MODEL_VERSION
  MINIO_ROOT_USER
  MINIO_ROOT_PASSWORD
  MINIO_ENDPOINT
  MINIO_PORT
  MINIO_CONSOLE_PORT
  MINIO_DEFAULT_BUCKET
  MINIO_USE_SSL
  ```

## Redis Service Rules

- MUST use the official `redis` Docker image with a pinned version
- MUST enable Redis persistence (`appendonly yes`) in all non-ephemeral environments
- MUST NOT expose the Redis port (`6379`) to the host in production
- MUST set a `maxmemory` limit and `maxmemory-policy` (e.g., `allkeys-lru`) in the Redis config
- MUST mount a named volume for Redis data persistence
- MUST define a healthcheck using `redis-cli ping`

## MinIO Service Rules

- MUST use the official `minio/minio` Docker image with a pinned version tag — MUST NOT use `latest`
- MUST run MinIO with the `server /data --console-address ":9001"` command
- MUST expose port `9000` (S3 API) and `9001` (web console) to the host in development only
- MUST NOT expose MinIO ports to the host in production profiles
- MUST set `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` from environment variables — MUST NOT hardcode credentials
- MUST mount a named volume for MinIO data persistence (e.g., `minio_data:/data`)
- MUST define a healthcheck using `curl -f http://localhost:9000/minio/health/live`
- MUST create the default bucket automatically on first startup using a MinIO init container or `mc` client script — MUST NOT require manual bucket creation
- MUST NOT store bucket name or access credentials in source code — MUST read from environment variables
- MUST set `MINIO_USE_SSL=false` in development and `true` in production

## MinIO Usage Rules (Application Level)

- MUST access MinIO exclusively through the S3-compatible API using the AWS SDK (Java `software.amazon.awssdk:s3`) in the backend or `boto3` in the AI service
- MUST NOT access the MinIO console API programmatically — it is for human administration only
- MUST configure the S3 client endpoint URL from `MINIO_ENDPOINT` and `MINIO_PORT` environment variables — MUST NOT hardcode
- MUST use `path-style access` (`withPathStyleAccessEnabled(true)`) when configuring the S3 client for MinIO compatibility
- MUST encapsulate all storage operations in a dedicated `StorageService` (backend) or `storage_service.py` (AI service) — MUST NOT call the S3 client directly from controllers or route handlers
- MUST NOT store file binary content in the database — MUST store only the MinIO object key (path) and bucket name
- MUST generate pre-signed URLs for all client-facing file download/upload links — MUST NOT expose internal MinIO credentials to the frontend
- MUST set an expiry time on all pre-signed URLs — MUST NOT generate non-expiring URLs
- MUST prefix object keys with a domain namespace (e.g., `resumes/{candidateId}/{filename}`, `avatars/{userId}/{filename}`, `models/{modelVersion}/{filename}`)
- MUST validate file type and size on the backend before accepting an upload — MUST NOT trust client-side validation alone
- MUST NOT allow public (unauthenticated) bucket access — all buckets MUST be private

## Volume Rules

- MUST use named volumes for all persistent data (database, Redis, MinIO)
- MUST NOT use anonymous volumes for any persistent data
- MUST NOT mount the host's source code directory into production containers

## Hot Reload (Development Only)

- MUST enable hot reload for all three application services in development — MUST NOT require container rebuild on source code changes
- MUST NOT enable hot reload in production profiles

### Backend (Spring Boot)

#### Dependency & Configuration
- MUST include `spring-boot-devtools` as an `<optional>true</optional>` dependency in Maven (or `developmentOnly` in Gradle) — MUST NOT use `<scope>runtime</scope>` as it restricts classpath visibility
- MUST configure devtools polling in `application.yml` (NOT via JVM args — they are ignored when `fork=false`):
  ```yaml
  spring:
    devtools:
      restart:
        enabled: true
        poll-interval: 2000
        quiet-period: 1000
      livereload:
        enabled: true
  ```
- MUST set `SPRING_DEVTOOLS_RESTART_ENABLED=true` and `SPRING_DEVTOOLS_LIVERELOAD_ENABLED=true` as environment variables in the dev Compose config
- MUST set `SPRING_DATASOURCE_HIKARI_INITIALIZATION_FAIL_TIMEOUT` to at least `60000` (ms) in the dev Compose config — the database container may not be fully ready even after its healthcheck passes on slow machines; without this, HikariCP fails fast and Spring refuses to start
- MUST configure `<addResources>true</addResources>` in the `spring-boot-maven-plugin` so that resource files (e.g., `application.yml`, templates) are picked up without recompilation
- MUST use millisecond integers for `poll-interval` and `quiet-period` — MUST NOT use duration strings like `"2s"` because Spring Boot 3 changed the devtools field type from `Duration` to `long`; using a string causes a runtime `ConversionFailedException`

#### Dockerfile & Entrypoint
- MUST use a separate `Dockerfile.dev` for development that uses the full Maven SDK base image (e.g., `maven:3.9.6-eclipse-temurin-17`) — MUST NOT reuse the production multi-stage Dockerfile
- MUST `COPY pom.xml .` and run `mvn dependency:go-offline -B` in `Dockerfile.dev` BEFORE the source mount — this pre-downloads all dependencies into a cached Docker layer so that `docker compose build` does NOT re-download every dependency on each rebuild
- MUST NOT copy source code in `Dockerfile.dev` — source is bind-mounted at runtime via volumes
- MUST run the backend with `mvn spring-boot:run -Dspring-boot.run.fork=false` — the `fork=false` flag is REQUIRED so that `SPRING_DEVTOOLS_*` environment variables from Docker are visible to the app JVM (without it, Maven forks a child JVM that ignores Docker env vars)
- MUST include a background recompilation watcher in the container entrypoint script — `mvn spring-boot:run` alone does NOT recompile when `.java` files change; the watcher MUST detect source file changes and run `mvn compile` so that devtools can pick up the new `.class` files in `target/classes`
- The background watcher MUST initialize its file-change baseline (e.g., checksum) from the CURRENT file state before entering the poll loop — without this, the watcher fires immediately on startup and races against `spring-boot:run`'s own initial compilation, potentially corrupting `.class` files
- The background watcher MUST add a brief delay (e.g., `sleep 1`) after detecting a change and before running `mvn compile` — IDEs perform multi-file saves that trigger multiple near-simultaneous write events; compiling too early catches a half-saved file

#### Volume Mounts (in `docker-compose.override.yml` / dev compose)
- MUST mount the host source directory into the container: `./backend/src:/app/src`
- MUST mount `./backend/pom.xml:/app/pom.xml` so that dependency changes are reflected without rebuilding the container
- MUST use a **named volume** for `target/` (e.g., `backend_target:/app/target`) — MUST NOT bind-mount `target/` to the host; a named volume prevents the "half-written .class file" race condition when two Maven processes (`spring-boot:run` + background `compile` loop) write simultaneously
- MUST use a **named volume** for the Maven local repository (e.g., `maven_repo:/root/.m2`) to cache downloaded dependencies between container restarts — without this, every restart re-downloads all dependencies

### Frontend (React)
- MUST run the React dev server (`npm run dev` / `vite` / `react-scripts start`) as the container command — MUST NOT serve a static build in development
- MUST mount the host source directory: `./frontend/src:/app/src`
- MUST mount `./frontend/public:/app/public`
- MUST NOT mount `node_modules` from the host — MUST use the container's own `node_modules` via a named volume (e.g., `frontend_node_modules:/app/node_modules`)
- MUST set `CHOKIDAR_USEPOLLING=true` and `WATCHPACK_POLLING=true` to ensure file-watch works inside Docker on all host OS platforms

### AI Service (FastAPI)
- MUST run with `uvicorn app.main:app --reload --host 0.0.0.0` as the container command in development
- MUST mount the host source directory: `./ai-service/app:/app/app`
- MUST NOT mount model artifact directories with write access — MUST mount as read-only (`:ro`)

### General Hot Reload Rules
- MUST define hot reload mounts and commands only in `docker-compose.dev.yml` — MUST NOT include them in the base `docker-compose.yml`
- When using a separate dev compose file (e.g., `docker-compose.dev.yml`), MUST run with the `-f` flag pattern: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` — MUST document this command in the project `README.md`
- MUST ensure `.dockerignore` excludes `node_modules`, `__pycache__`, `.git`, and build output dirs to prevent volume conflicts
- MUST document the expected host-to-container mount path for each service in the project `README.md`

## Build & Deployment

- MUST define a `Makefile` or shell script with standard commands: `build`, `up`, `down`, `logs`, `restart`
- MUST tag all production Docker images with a version string matching the application version
- MUST NOT use `docker-compose up --build` in CI without explicit cache invalidation strategy
- MUST separate development and production Compose configurations using profiles or separate files (`docker-compose.prod.yml`)