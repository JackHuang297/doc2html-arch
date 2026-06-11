# doc2html-arch Deployment Guide

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Docker | 20.10+ | 24.x |
| Docker Compose | 2.0+ | 4.x |
| RAM | 512MB | 2GB |
| Disk | 1GB | 2GB |
| CPU | 1 core | 2+ cores |

> This project runs as a **Node.js HTTP server** (no external database required).

---

## Quick Start

```bash
# 1. Clone / navigate to project
cd doc2html-arch

# 2. Start all services
docker-compose up -d

# 3. Wait for health check to pass (~10s)
docker-compose ps

# 4. Verify server is up
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"2026-06-11T..."}
```

---

## Container Health

The container runs a **health check every 30 seconds**. If it fails 3 times consecutively, Docker marks the container unhealthy and restarts it automatically (`restart: unless-stopped`).

```bash
# Inspect container health
docker inspect doc2html-arch --format='{{.State.Health.Status}}'

# View health check logs
docker inspect doc2html-arch --format='{{range .State.Health.Log}}{{.ExitCode}}:{{.Output}}{{end}}'
```

---

## API Verification

```bash
# Health check
curl http://localhost:3000/health

# OpenAPI 3.0 documentation
curl http://localhost:3000/api-docs | jq . # or open in browser

# Render a document (example)
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{"documentId":"test-1","content":{"id":"test","title":"Hello"},"theme":"default"}'

# Batch render
curl -X POST http://localhost:3000/api/render/batch \
  -H "Content-Type: application/json" \
  -d '{"documents":[{"documentId":"a"},{"documentId":"b"}]}'

# Metrics
curl http://localhost:3000/api/metrics

# Batch conversion
curl -X POST http://localhost:3000/api/batch/convert \
  -H "Content-Type: application/json" \
  -d '{"files":[{"path":"/uploads/doc.pdf","mimeType":"application/pdf","size":102400}]}'
```

---

## Configuration

All settings are passed via environment variables (or `.env` file):

```bash
# .env file (create in project root)
PORT=3000
NODE_ENV=production
LOG_LEVEL=info          # debug | info | warn | error
MAX_FILE_SIZE_BYTES=52428800   # 50MB default
UPLOAD_DIR=./uploads
OUTPUT_DIR=./output
BASE_URL=http://localhost:3000
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `production` | Runtime environment |
| `LOG_LEVEL` | `info` | Minimum log level |
| `MAX_FILE_SIZE_BYTES` | `52428800` | Max uploaded file size |
| `LOG_FILE_PATH` | `/app/logs/app.log` | Path for structured log output |
| `UPLOAD_DIR` | `./uploads` | Host directory for file uploads |
| `OUTPUT_DIR` | `./output` | Host directory for converted output |

---

## Docker Compose Commands

```bash
# Start in background
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# View logs (follow mode)
docker-compose logs -f

# Stop and remove containers
docker-compose down

# Stop + remove containers + volumes (full clean)
docker-compose down -v

# Restart a running container
docker-compose restart doc2html

# Check resource usage
docker stats doc2html-arch
```

---

## Image Details

- **Base image**: `node:20-alpine` (small, ~180MB vs ~900MB for debian)
- **Multi-stage build**: production image contains only runtime files (~250MB)
- **Non-root user**: `appuser` (security best practice)
- **No shell access** in production container

```bash
# Check final image size
docker images doc2html-arch

# Inspect running container
docker exec doc2html-arch whoami
# → appuser
```

---

## Log Management

Logs are written to `/app/logs/app.log` inside the container (mounted as a Docker volume).

```bash
# View container logs
docker-compose logs doc2html

# Tail logs in real time
docker-compose logs -f doc2html

# Log rotation: automatic (10MB per file, keep 5 files)
# No external log driver required — rotation is handled by the app.
```

---

## Security Notes

- Container runs as non-root (`appuser`)
- `no-new-privileges` security option enabled
- Memory and CPU limits enforced
- File uploads mounted read-only (`:ro`)
- For production internet exposure, add a reverse proxy (nginx/Caddy) in front of the container with TLS termination

---

## Troubleshooting

```bash
# Container won't start
docker-compose logs doc2html

# Health check failing
docker inspect doc2html-arch --format='{{.State.Health.FailingStreak}}'
docker exec doc2html-arch wget -qO- http://localhost:3000/health

# Port already in use
PORT=3001 docker-compose up -d   # override port

# Rebuild from scratch
docker-compose down --rmi local
docker-compose up -d --build
```

---

## CI/CD Integration

```yaml
# Example GitHub Actions workflow (.github/workflows/docker.yml)
name: Docker Build & Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
      - run: docker build -t doc2html-arch:test .

  deploy:
    needs: build-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t myregistry/doc2html-arch:${{ github.sha }} .
      - run: docker push myregistry/doc2html-arch:${{ github.sha }}
      - run: docker pull myregistry/doc2html-arch:${{ github.sha }}
      - run: docker-compose up -d
```