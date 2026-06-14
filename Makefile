# RecruitPro - Makefile

COMPOSE_DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev
COMPOSE_LOCAL_PROD = docker compose --env-file .env.localprod -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_AWS_PROD = docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_AWS_AI_IMAGE = docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.aws-ai-image.yml

AI_SERVICE_IMAGE ?= yourdockerhub/recruitpro-ai-service:latest
AI_SERVICE_MODEL_DOCKERFILE = ai-service/Dockerfile.dockerhub

# Optional isolated local production project. Use this when you do not want to
# share dev volumes such as the Postgres data volume.
COMPOSE_LOCAL_PROD_ISOLATED = docker compose -p recruitpro-localprod --env-file .env.localprod -f docker-compose.yml -f docker-compose.prod.yml

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------

.PHONY: dev-build dev-up dev-down dev-logs dev-restart dev-restart-all dev-restart-container dev-clean
.PHONY: build up down logs restart restart-all restart-container clean

dev-build:
	$(COMPOSE_DEV) build

dev-up:
	$(COMPOSE_DEV) up -d --build

dev-down:
	$(COMPOSE_DEV) down

dev-logs:
	$(COMPOSE_DEV) logs -f

dev-restart:
	$(COMPOSE_DEV) down
	$(COMPOSE_DEV) up -d --build

dev-restart-all:
	$(COMPOSE_DEV) restart

dev-restart-container:
	$(COMPOSE_DEV) restart $(SERVICE)

dev-clean:
	$(COMPOSE_DEV) down -v --remove-orphans

# Backward-compatible dev aliases.
build: dev-build
up: dev-up
down: dev-down
logs: dev-logs
restart: dev-restart
restart-all: dev-restart-all
restart-container: dev-restart-container
clean: dev-clean

# -----------------------------------------------------------------------------
# Development logs
# -----------------------------------------------------------------------------

.PHONY: logs-backend logs-frontend-js logs-frontend-co logs-frontend-ad logs-ai logs-db

logs-backend:
	$(COMPOSE_DEV) logs -f backend

logs-frontend-js:
	$(COMPOSE_DEV) logs -f frontend-jobseeker

logs-frontend-co:
	$(COMPOSE_DEV) logs -f frontend-company

logs-frontend-ad:
	$(COMPOSE_DEV) logs -f frontend-admin

logs-ai:
	$(COMPOSE_DEV) logs -f ai-service

logs-db:
	$(COMPOSE_DEV) logs -f db

# -----------------------------------------------------------------------------
# Local production (.env.localprod)
# -----------------------------------------------------------------------------

.PHONY: prod-config prod-build prod-up prod-down prod-logs prod-restart prod-restart-all prod-restart-container prod-clean

prod-config:
	$(COMPOSE_LOCAL_PROD) config

prod-build:
	$(COMPOSE_LOCAL_PROD) build

prod-up:
	$(COMPOSE_LOCAL_PROD) up -d --build

prod-down:
	$(COMPOSE_LOCAL_PROD) down

prod-logs:
	$(COMPOSE_LOCAL_PROD) logs -f

prod-restart:
	$(COMPOSE_LOCAL_PROD) down
	$(COMPOSE_LOCAL_PROD) up -d --build

prod-restart-all:
	$(COMPOSE_LOCAL_PROD) restart

prod-restart-container:
	$(COMPOSE_LOCAL_PROD) restart $(SERVICE)

prod-clean:
	$(COMPOSE_LOCAL_PROD) down -v --remove-orphans

# -----------------------------------------------------------------------------
# Isolated local production (.env.localprod, separate Compose project/volumes)
# -----------------------------------------------------------------------------

.PHONY: prod-isolated-up prod-isolated-down prod-isolated-logs prod-isolated-clean

prod-isolated-up:
	$(COMPOSE_LOCAL_PROD_ISOLATED) up -d --build

prod-isolated-down:
	$(COMPOSE_LOCAL_PROD_ISOLATED) down

prod-isolated-logs:
	$(COMPOSE_LOCAL_PROD_ISOLATED) logs -f

prod-isolated-clean:
	$(COMPOSE_LOCAL_PROD_ISOLATED) down -v --remove-orphans

# -----------------------------------------------------------------------------
# AWS production (.env.aws)
# -----------------------------------------------------------------------------

.PHONY: aws-config aws-build aws-up aws-down aws-logs aws-restart
.PHONY: ai-image-build ai-image-push aws-ai-config aws-ai-pull aws-ai-up aws-ai-logs aws-ai-restart

aws-config:
	$(COMPOSE_AWS_PROD) config

aws-build:
	$(COMPOSE_AWS_PROD) build

aws-up:
	$(COMPOSE_AWS_PROD) up -d --build

aws-down:
	$(COMPOSE_AWS_PROD) down

aws-logs:
	$(COMPOSE_AWS_PROD) logs -f

aws-restart:
	$(COMPOSE_AWS_PROD) down
	$(COMPOSE_AWS_PROD) up -d --build

# -----------------------------------------------------------------------------
# AWS production with DockerHub AI image (.env.aws + docker-compose.aws-ai-image.yml)
# -----------------------------------------------------------------------------

ai-image-build:
	docker build -t $(AI_SERVICE_IMAGE) -f $(AI_SERVICE_MODEL_DOCKERFILE) .

ai-image-push:
	docker push $(AI_SERVICE_IMAGE)

aws-ai-config:
	$(COMPOSE_AWS_AI_IMAGE) config

aws-ai-pull:
	$(COMPOSE_AWS_AI_IMAGE) pull ai-service

aws-ai-up:
	$(COMPOSE_AWS_AI_IMAGE) up -d --build

aws-ai-logs:
	$(COMPOSE_AWS_AI_IMAGE) logs -f

aws-ai-restart:
	$(COMPOSE_AWS_AI_IMAGE) down
	$(COMPOSE_AWS_AI_IMAGE) pull ai-service
	$(COMPOSE_AWS_AI_IMAGE) up -d --build
