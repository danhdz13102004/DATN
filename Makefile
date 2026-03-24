# RecruitPro — Makefile

COMPOSE_DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker-compose.yml -f docker-compose.prod.yml

# ── Development ──────────────────────────────

.PHONY: build up down logs restart clean

build:
	$(COMPOSE_DEV) build

up:
	$(COMPOSE_DEV) up -d

down:
	$(COMPOSE_DEV) down

logs:
	$(COMPOSE_DEV) logs -f

restart:
	$(COMPOSE_DEV) down && $(COMPOSE_DEV) up -d

clean:
	$(COMPOSE_DEV) down -v --remove-orphans

# ── Individual service logs ──────────────────

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

# ── Production ───────────────────────────────

.PHONY: prod-build prod-up prod-down

prod-build:
	$(COMPOSE_PROD) build

prod-up:
	$(COMPOSE_PROD) up -d

prod-down:
	$(COMPOSE_PROD) down
