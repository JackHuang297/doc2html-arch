# doc2html-arch

[![Test](https://github.com/YOUR_USERNAME/doc2html-arch/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/doc2html-arch/actions/workflows/test.yml)
[![Build & Push](https://github.com/YOUR_USERNAME/doc2html-arch/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/doc2html-arch/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/doc2html-arch)](https://www.npmjs.com/package/doc2html-arch)
[![Docker Pulls](https://img.shields.io/docker/pulls/YOUR_USERNAME/doc2html-arch)](https://hub.docker.com/r/YOUR_USERNAME/doc2html-arch)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Multi-format document to HTML rendering API — Markdown, HTML, Text, PDF, DOCX, XLSX, CSV, and images

A production-ready Node.js/TypeScript server with a REST API, batch processing, theme customization, audience filtering, and Docker deployment support.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-format** | Markdown, HTML, Text, PDF, DOCX, XLSX, CSV, PNG, JPG, GIF, WebP → HTML |
| **REST API** | Full HTTP API with OpenAPI 3.0 docs |
| **Batch conversion** | Concurrent file processing with retry & progress tracking |
| **Themes** | `default`, `minimal`, `dark` built-in themes |
| **Audience filtering** | Per-segment content visibility |
| **Performance** | Caching, lazy loading, minification |
| **Security** | File type/size whitelist, content XSS scanning |
| **Structured logging** | JSON or text, console + file with rotation |
| **Docker** | Multi-stage build, healthcheck, non-root user |
| **Swagger** | Auto-generated OpenAPI 3.0 spec at `/api-docs` |

---

## Supported File Formats

| Format | Extensions | MIME Type |
|--------|-----------|-----------|
| Markdown | `.md`, `.markdown` | `text/markdown` |
| HTML | `.html`, `.htm` | `text/html` |
| Plain Text | `.txt` | `text/plain` |
| PDF | `.pdf` | `application/pdf` |
| Word (DOCX) | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| JSON | `.json` | `application/json` |
| **Excel** | **`.xlsx`, `.xls`, `.csv`** | **`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`**, `text/csv` |
| **Images** | **`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`** | `image/png`, `image/jpeg`, `image/gif`, `image/webp` |

---

## Quick Start

### 1. Install & Build

```bash
npm install
npm run build
```

### 2. Start the server

```bash
# Development
node dist/server.js

# Or with env vars
PORT=3000 LOG_LEVEL=debug LOG_FILE_PATH=./logs node dist/server.js
```

### 3. Verify

```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"2026-06-11T..."}
```

---

## Docker

```bash
# Build and start
docker-compose up -d

# Verify healthy
docker-compose ps
# → doc2html-arch ... Up (healthy)

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.

---

## API Reference

All endpoints are documented at **`http://localhost:3000/api-docs`** (OpenAPI 3.0).

### Core Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | OpenAPI 3.0 specification |
| `GET` | `/api/metrics` | Renderer performance metrics |
| `POST` | `/api/batch/upload` | Upload ZIP for batch conversion |
| `WS` | `/ws/preview` | Real-time preview via WebSocket |
| `POST` | `/api/render` | Render a document to HTML |
| `POST` | `/api/render/batch` | Batch render multiple documents |
| `POST` | `/api/batch/convert` | Start a batch file conversion task |
| `GET` | `/api/batch/progress/:taskId` | Get batch task progress |
| `GET` | `/api/batch/status/:taskId` | Get full batch task status |
| `POST` | `/api/batch/retry/:taskId` | Retry failed files in a batch task |

### Example: Render a document

```bash
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "my-doc",
    "content": {
      "id": "my-doc",
      "title": "Hello World",
      "sections": [
        { "heading": "Introduction", "content": "Welcome to doc2html-arch." }
      ]
    },
    "theme": "default",
    "minify": false
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "html": "<div class=\"doc2html-rendered\">...</div>",
    "metadata": {}
  }
}
```

### Example: Batch render

```bash
curl -X POST http://localhost:3000/api/render/batch \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      { "documentId": "doc-1", "content": { "id": "doc-1", "title": "A" } },
      { "documentId": "doc-2", "content": { "id": "doc-2", "title": "B" } }
    ]
  }'
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `production` | `development` or `production` |
| `BASE_URL` | `http://localhost:3000` | Used in OpenAPI docs |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `LOG_FILE_PATH` | _(none)_ | Path for log files (e.g. `./logs`) |
| `MAX_FILE_SIZE_BYTES` | `52428800` | Max file upload size (50MB) |

---

## Project Structure

```
src/
├── server.ts                    # HTTP server + WebSocket
├── api.ts                       # DocumentRenderAPI class
├── renderer.ts                  # Core rendering engine
├── index.ts                     # Library exports
├── api/
│   ├── document.controller.ts   # Document + batch CRUD
│   ├── batch.service.ts         # Batch conversion logic
│   ├── progress.tracker.ts      # Progress tracking
│   ├── error.handler.ts         # Error handling + retry
│   ├── swagger.config.ts        # OpenAPI 3.0 doc generator
│   └── websocket.handler.ts     # WebSocket real-time preview
├── converters/                  # Format-specific converters
│   ├── markdown.converter.ts
│   ├── html.converter.ts
│   ├── text.converter.ts
│   ├── pdf.converter.ts
│   ├── docx.converter.ts
│   ├── json.converter.ts
│   ├── xlsx.converter.ts         # Excel / CSV → HTML table
│   ├── image.converter.ts        # PNG/JPG/GIF → HTML
│   └── converter.factory.ts
├── services/
│   ├── document.service.ts
│   ├── audience-filter.ts
│   └── performance.ts
├── components/
│   └── registry.ts            # Component registry
└── utils/
    ├── logger.ts             # Structured logger (JSON/file rotation)
    ├── security.validator.ts # File whitelist + XSS scan
    ├── zip.handler.ts         # ZIP batch processor
    └── event.emitter.ts
    ├── security.validator.ts # File whitelist + content scan
    └── event.emitter.ts
config/
└── rendering.config.json     # Theme and rendering config
Dockerfile                    # Multi-stage production build
docker-compose.yml            # Container orchestration
.env.example                  # Environment variable template
DEPLOYMENT.md                 # Full deployment guide
DEPLOYMENT_VERIFICATION.md    # Verified deployment checklist
```

---

## Scripts

```bash
npm run build        # TypeScript → JavaScript
npm run test         # Run all tests (Jest)
npm run test:watch   # Watch mode
npm run dev          # TypeScript watch mode
npm run lint         # ESLint
npm run format       # Prettier
```

---

## Testing

```bash
npm test
```

**Coverage threshold:** 70% branches, functions, lines, statements

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, commit conventions, and adding new converters.

---

## License

MIT — see [LICENSE](LICENSE) file for details.