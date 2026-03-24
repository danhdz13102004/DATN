# RecruitPro

AI-powered job recruitment platform with job-seeker recommendations, candidate scoring, and company management.

## Architecture

| Service | Technology | Port |
|---|---|---|
| Backend | Java 17 + Spring Boot 3 | 8080 |
| Frontend — Job Seeker | React 18 + Vite | 3000 |
| Frontend — Company | React 18 + Vite | 3001 |
| Frontend — Admin | React 18 + Vite | 3002 |
| AI Service | Python 3.11 + FastAPI | 8000 |
| PostgreSQL (+pgvector) | PostgreSQL 16 | 5432 |
| Redis | Redis 7 | 6379 |
| MinIO | MinIO (S3-compatible) | 9000 / 9001 |

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build and start all services (development)
make build
make up

# 3. View logs
make logs
```

## Development

Run with hot reload enabled:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Volume Mounts (host → container)

| Service | Host Path | Container Path |
|---|---|---|
| Backend | `./backend/src` | `/app/src` |
| Backend | `./backend/pom.xml` | `/app/pom.xml` |
| Frontend (×3) | `./frontend-{role}/src` | `/app/src` |
| Frontend (×3) | `./frontend-{role}/public` | `/app/public` |
| AI Service | `./ai-service/app` | `/app/app` |

## Commands

| Command | Description |
|---|---|
| `make build` | Build all containers |
| `make up` | Start all services |
| `make down` | Stop all services |
| `make logs` | Follow all service logs |
| `make restart` | Restart all services |
| `make clean` | Stop + remove volumes |
| `make logs-backend` | Follow backend logs only |
