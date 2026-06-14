# RecruitPro - justfile

COMPOSE_DEV := "docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev"
COMPOSE_LOCAL_PROD := "docker compose --env-file .env.localprod -f docker-compose.yml -f docker-compose.prod.yml"
COMPOSE_AWS_PROD := "docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml"
COMPOSE_AWS_AI_IMAGE := "docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.aws-ai-image.yml"
COMPOSE_LOCAL_PROD_ISOLATED := "docker compose -p recruitpro-localprod --env-file .env.localprod -f docker-compose.yml -f docker-compose.prod.yml"

AI_SERVICE_IMAGE := env_var_or_default("AI_SERVICE_IMAGE", "yourdockerhub/recruitpro-ai-service:latest")
AI_SERVICE_MODEL_DOCKERFILE := "ai-service/Dockerfile.dockerhub"

# List all available commands
default:
    @just --list

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------

# Build development containers
dev-build:
    {{COMPOSE_DEV}} build

# Start development environment with hot reload
dev-up:
    {{COMPOSE_DEV}} up -d --build

# Stop development environment
dev-down:
    {{COMPOSE_DEV}} down

# View development logs
dev-logs:
    {{COMPOSE_DEV}} logs -f

# Hard restart development environment
dev-restart:
    {{COMPOSE_DEV}} down
    {{COMPOSE_DEV}} up -d --build

# Soft restart all development containers
dev-restart-all:
    {{COMPOSE_DEV}} restart

# Restart a specific development container, for example: just dev-restart-container backend
dev-restart-container service:
    {{COMPOSE_DEV}} restart {{service}}

# Remove development containers, volumes, and orphans
dev-clean:
    {{COMPOSE_DEV}} down -v --remove-orphans

# Backward-compatible dev aliases
build: dev-build
up: dev-up
down: dev-down
logs: dev-logs
restart: dev-restart
restart-all: dev-restart-all
clean: dev-clean

# Backward-compatible service restart alias, for example: just restart-container backend
restart-container service:
    {{COMPOSE_DEV}} restart {{service}}

# -----------------------------------------------------------------------------
# Development logs
# -----------------------------------------------------------------------------

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

# -----------------------------------------------------------------------------
# Local production (.env.localprod)
# -----------------------------------------------------------------------------

# Show rendered local production Compose config
prod-config:
    {{COMPOSE_LOCAL_PROD}} config

# Build local production containers
prod-build:
    {{COMPOSE_LOCAL_PROD}} build

# Start local production environment
prod-up:
    {{COMPOSE_LOCAL_PROD}} up -d --build

# Stop local production environment
prod-down:
    {{COMPOSE_LOCAL_PROD}} down

# View local production logs
prod-logs:
    {{COMPOSE_LOCAL_PROD}} logs -f

# Hard restart local production environment
prod-restart:
    {{COMPOSE_LOCAL_PROD}} down
    {{COMPOSE_LOCAL_PROD}} up -d --build

# Soft restart all local production containers
prod-restart-all:
    {{COMPOSE_LOCAL_PROD}} restart

# Restart a specific local production container, for example: just prod-restart-container nginx
prod-restart-container service:
    {{COMPOSE_LOCAL_PROD}} restart {{service}}

# Remove local production containers, volumes, and orphans
prod-clean:
    {{COMPOSE_LOCAL_PROD}} down -v --remove-orphans

# -----------------------------------------------------------------------------
# Isolated local production (.env.localprod, separate Compose project/volumes)
# -----------------------------------------------------------------------------

# Start isolated local production with separate volumes
prod-isolated-up:
    {{COMPOSE_LOCAL_PROD_ISOLATED}} up -d --build

# Stop isolated local production
prod-isolated-down:
    {{COMPOSE_LOCAL_PROD_ISOLATED}} down

# View isolated local production logs
prod-isolated-logs:
    {{COMPOSE_LOCAL_PROD_ISOLATED}} logs -f

# Remove isolated local production containers, volumes, and orphans
prod-isolated-clean:
    {{COMPOSE_LOCAL_PROD_ISOLATED}} down -v --remove-orphans

# -----------------------------------------------------------------------------
# AWS production (.env.aws)
# -----------------------------------------------------------------------------

# Show rendered AWS production Compose config
aws-config:
    {{COMPOSE_AWS_PROD}} config

# Build AWS production containers
aws-build:
    {{COMPOSE_AWS_PROD}} build

# Start AWS production environment
aws-up:
    {{COMPOSE_AWS_PROD}} up -d --build

# Stop AWS production environment
aws-down:
    {{COMPOSE_AWS_PROD}} down

# View AWS production logs
aws-logs:
    {{COMPOSE_AWS_PROD}} logs -f

# Hard restart AWS production environment
aws-restart:
    {{COMPOSE_AWS_PROD}} down
    {{COMPOSE_AWS_PROD}} up -d --build

# -----------------------------------------------------------------------------
# AWS production with DockerHub AI image (.env.aws + docker-compose.aws-ai-image.yml)
# -----------------------------------------------------------------------------

# Build DockerHub AI image with bundled model artifacts
ai-image-build:
    docker build -t {{AI_SERVICE_IMAGE}} -f {{AI_SERVICE_MODEL_DOCKERFILE}} .

# Push DockerHub AI image
ai-image-push:
    docker push {{AI_SERVICE_IMAGE}}

# Show rendered AWS production config using DockerHub AI image
aws-ai-config:
    {{COMPOSE_AWS_AI_IMAGE}} config

# Pull only the DockerHub ai-service image
aws-ai-pull:
    {{COMPOSE_AWS_AI_IMAGE}} pull ai-service

# Start AWS production using DockerHub ai-service image
aws-ai-up:
    {{COMPOSE_AWS_AI_IMAGE}} up -d --build

# View AWS production logs using DockerHub ai-service image
aws-ai-logs:
    {{COMPOSE_AWS_AI_IMAGE}} logs -f

# Hard restart AWS production using DockerHub ai-service image
aws-ai-restart:
    {{COMPOSE_AWS_AI_IMAGE}} down
    {{COMPOSE_AWS_AI_IMAGE}} pull ai-service
    {{COMPOSE_AWS_AI_IMAGE}} up -d --build
