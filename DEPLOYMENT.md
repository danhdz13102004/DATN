# RecruitPro Deployment Guide

This document covers development, local production testing, and AWS EC2 deployment for RecruitPro.

---

## Architecture Overview

```
Browser                         Nginx (central)              Docker Network
──────────────────────────────────────────────────────────────
http://EC2_PUBLIC_IP            / ──── serve SPA             backend:8080
http://EC2_PUBLIC_IP:8081       /api/* ── proxy ────────────▶│
http://EC2_PUBLIC_IP:8082       /ws-native/* ── proxy ──────▶│
                                /ws/* ── proxy ──────────────▶│
                                                                 db:5432
                                                                 redis:6379
                                                                 ai-service:8000
                                                                 minio:9000
```

- **No domain required.** Access is via EC2 public IP and port.
- Backend port `8080` is never exposed publicly. Nginx proxies all traffic internally.
- All three frontends are served from one Nginx container.

---

## 1. Development

Hot-reload development with all services, including Vite dev servers for the three frontends.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up --build
```

> **Note:** `--profile dev` is required to start the frontend dev-server containers. Without it, only the backend, database, Redis, and MinIO are started.

| Service | URL |
|---|---|
| JobSeeker Frontend | http://localhost:3000 |
| Company Frontend | http://localhost:3001 |
| Admin Frontend | http://localhost:3002 |
| Backend API | http://localhost:8080 |
| AI Service | http://localhost:8000 |
| MinIO Console | http://localhost:9001 |

---

## 2. Local Production Test

Test the production setup on your local machine before deploying to AWS.

### Step 1 — Copy and edit the local production environment file

```bash
cp .env.localprod.example .env.localprod
# Open .env.localprod and fill in any real values you have (DB password, Stripe keys, etc.)
```

### Step 2 — Build and start

```bash
docker compose --env-file .env.localprod -f docker-compose.yml -f docker-compose.prod.yml up --build
```

### Step 3 — Verify

| Portal | URL |
|---|---|
| JobSeeker | http://localhost |
| Company | http://localhost:8081 |
| Admin | http://localhost:8082 |

- Refreshing nested routes (e.g. `/jobs/123`) should return the SPA, not 404.
- Browser network tab should show API requests going to `/api/v1/...`, not `127.0.0.1:8080`.
- WebSocket should connect via `ws://localhost/ws-native` or `wss://` in HTTPS environments.
- Backend health check: `curl http://localhost/api/v1/health` (proxied through Nginx).

### Step 4 — Stop

```bash
docker compose --env-file .env.localprod -f docker-compose.yml -f docker-compose.prod.yml down
```

---

## 3. AWS EC2 Deployment

### Prerequisites

- An AWS EC2 instance (Ubuntu 22.04 or Amazon Linux 2023 recommended).
- Docker and Docker Compose installed on the instance.
- At least 4 GB RAM and 20 GB disk.
- Docker daemon running and accessible.

### Step 1 — Transfer files to EC2

```bash
# From your local machine
scp -r ./recruitpro ec2-user@YOUR_EC2_PUBLIC_IP:/home/ec2-user/recruitpro
```

Or use Git, EFS, S3, or any preferred transfer method.

### Step 2 — SSH into the instance

```bash
ssh ec2-user@YOUR_EC2_PUBLIC_IP
cd ~/recruitpro
```

### Step 3 — Configure environment

```bash
cp .env.aws.example .env.aws
nano .env.aws
```

**Required edits in `.env.aws`:**

1. Replace `YOUR_EC2_PUBLIC_IP` with your actual EC2 public IPv4 address:
   ```
   EC2_PUBLIC_IP=54.123.45.67
   CORS_ALLOWED_ORIGINS=http://54.123.45.67,http://54.123.45.67:8081,http://54.123.45.67:8082
   ```

2. Set strong passwords and secrets:
   ```
   POSTGRES_PASSWORD=...
   JWT_SECRET=...
   MINIO_ROOT_USER=...
   MINIO_ROOT_PASSWORD=...
   ```

3. Fill in Stripe keys if using payments.
4. Fill in Google OAuth credentials if using Google sign-in.

### Step 4 — Start production (daemon mode)

```bash
docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The `--build` flag builds the frontends and backend Docker images on the server. Omit it after the first run if you only want to start/stop services.

### Step 5 — Verify

```bash
# Check service health
docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml ps

# Follow logs
docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Test Nginx proxy
curl -s -o /dev/null -w "%{http_code}" http://localhost/
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/
curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/

# Test API proxy (should return JSON from backend)
curl -s http://localhost/api/v1/health | head -c 200
```

### Step 6 — Stop

```bash
docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml down
```

To also remove volumes (wipes all data):

```bash
docker compose --env-file .env.aws -f docker-compose.yml -f docker-compose.prod.yml down -v
```

---

## 4. AWS Security Group Configuration

Open the following inbound ports on your EC2 security group:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | JobSeeker frontend |
| 8081 | TCP | 0.0.0.0/0 | Company frontend |
| 8082 | TCP | 0.0.0.0/0 | Admin frontend |

**Do NOT open port 8080 publicly.** The backend is an internal service only.

**Optional — MinIO console access (for admin/dev only):**
Add a rule to allow port 9001 from your IP only, or tunnel via SSH:
```bash
ssh -L 9001:localhost:9001 ec2-user@YOUR_EC2_PUBLIC_IP
```

---

## 5. Accessing Without a Domain

No domain is required. All three portals are accessible directly by IP:

| Portal | URL |
|--------|-----|
| JobSeeker | `http://YOUR_EC2_PUBLIC_IP` |
| Company | `http://YOUR_EC2_PUBLIC_IP:8081` |
| Admin | `http://YOUR_EC2_PUBLIC_IP:8082` |

---

## 6. Adding a Domain Later

When you acquire a domain, update the Nginx config and DNS to use subdomains:

```
jobseeker.example.com  ──▶  EC2 public IP (port 80)
company.example.com    ──▶  EC2 public IP (port 80)
admin.example.com      ──▶  EC2 public IP (port 80)
```

Then change the Nginx config to listen on port 80 only (remove the 8081/8082 servers), update `CORS_ALLOWED_ORIGINS` to the domain names, and rebuild.

---

## 7. Validation Checklist

After deployment, verify:

- [ ] `docker compose ps` shows all services running (except the three dev frontend containers)
- [ ] `http://EC2_PUBLIC_IP` loads the JobSeeker frontend
- [ ] `http://EC2_PUBLIC_IP:8081` loads the Company frontend
- [ ] `http://EC2_PUBLIC_IP:8082` loads the Admin frontend
- [ ] Navigating to a nested route (e.g. `/jobs/123`) does not return 404
- [ ] Browser network tab shows API requests to `/api/v1/...` (not hardcoded IP/port)
- [ ] WebSocket connects successfully (no WS connection errors in console)
- [ ] Backend health check returns 200: `curl http://localhost/api/v1/health`
- [ ] File upload (resume attachment) works without 413 error
- [ ] **Development still works:**
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev config
  ```
  The output should include `frontend-jobseeker`, `frontend-company`, and `frontend-admin` services.

---

## 8. Troubleshooting

**Frontend shows 502 Bad Gateway**
The backend may not be ready yet. Wait for the backend health check to pass:
```bash
docker compose logs backend | grep "Started .*Application"
```

**WebSocket fails to connect**
Check that the browser is accessing the site over the correct protocol (HTTP, not HTTPS). For local testing, verify the WebSocket URL resolves correctly in the browser devtools Network tab.

**CORS errors in browser console**
Verify `CORS_ALLOWED_ORIGINS` in `.env.aws` contains the exact EC2 public IP with the correct port for each portal. The port matters — `http://IP` and `http://IP:8081` are different origins.

**Build fails on EC2**
Ensure Docker buildx is available and has sufficient disk space. Remove unused Docker resources:
```bash
docker system prune -f
```
