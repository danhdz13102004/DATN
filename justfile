# RecruitPro — justfile

COMPOSE_DEV := "docker compose -f docker-compose.yml -f docker-compose.dev.yml"
COMPOSE_PROD := "docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# List all available commands
default:
    @just --list

# ── Development ──────────────────────────────

# Build development containers
build:
    {{COMPOSE_DEV}} build

# Start development environment
up:
    {{COMPOSE_DEV}} up -d

# Stop development environment
down:
    {{COMPOSE_DEV}} down

# View logs for all containers
logs:
    {{COMPOSE_DEV}} logs -f

# Hard restart development environment (down then up)
restart:
    {{COMPOSE_DEV}} down
    {{COMPOSE_DEV}} up -d

# Soft restart all development containers
restart-all:
    {{COMPOSE_DEV}} restart

# Restart a specific container (e.g., just restart-container backend)
restart-container service:
    {{COMPOSE_DEV}} restart {{service}}

# Clean up containers, volumes, and orphans
clean:
    {{COMPOSE_DEV}} down -v --remove-orphans

# ── Individual service logs ──────────────────

# View backend logs
logs-backend:
    {{COMPOSE_DEV}} logs -f backend

# View frontend-jobseeker logs
logs-frontend-js:
    {{COMPOSE_DEV}} logs -f frontend-jobseeker

# View frontend-company logs
logs-frontend-co:
    {{COMPOSE_DEV}} logs -f frontend-company

# View frontend-admin logs
logs-frontend-ad:
    {{COMPOSE_DEV}} logs -f frontend-admin

# View ai-service logs
logs-ai:
    {{COMPOSE_DEV}} logs -f ai-service

# View db logs
logs-db:
    {{COMPOSE_DEV}} logs -f db

# ── Production ───────────────────────────────

# Build production containers
prod-build:
    {{COMPOSE_PROD}} build

# Start production environment
prod-up:
    {{COMPOSE_PROD}} up -d

# Stop production environment
prod-down:
    {{COMPOSE_PROD}} down

# Hard restart production environment (down then up)
prod-restart:
    {{COMPOSE_PROD}} down
    {{COMPOSE_PROD}} up -d

# Soft restart all production containers
prod-restart-all:
    {{COMPOSE_PROD}} restart

# Restart a specific production container (e.g., just prod-restart-container backend)
prod-restart-container service:
    {{COMPOSE_PROD}} restart {{service}}
