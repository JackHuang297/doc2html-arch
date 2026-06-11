# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (nothing yet)

---

## [1.0.0] - 2026-06-11

### Added

#### Core Features
- **Multi-format conversion** — Markdown, HTML, Text, PDF, DOCX, JSON → HTML
- **Component system** — `ComponentRegistry` with named, tagged components
- **Audience filtering** — Per-segment content visibility (`free`, `premium`, `vip`)
- **Performance optimization** — Caching, lazy loading, minification, script deferring
- **Security validator** — File whitelist, size limits, XSS/path traversal/shell injection scanning
- **Structured logger** — JSON/text format, console + file output,10MB log rotation (5 files)

#### API Endpoints
- `GET /health` — Health check
- `GET /api-docs` — OpenAPI 3.0 documentation
- `GET /api/metrics` — Renderer performance metrics
- `POST /api/render` — Single document render
- `POST /api/render/batch` — Batch document render
- `POST /api/batch/convert` — Start batch file conversion
- `GET /api/batch/progress/:taskId` — Batch progress
- `GET /api/batch/status/:taskId` — Batch full status
- `POST /api/batch/retry/:taskId` — Retry failed batch files

#### Docker & Deployment
- `Dockerfile` — Multi-stage Node.js 20 Alpine build (~390MB image)
- `docker-compose.yml` — Container orchestration with healthcheck, resource limits
- `DEPLOYMENT.md` — Full deployment guide
- `DEPLOYMENT_VERIFICATION.md` — Verified deployment test results
- `CHECKLIST.md` — Production readiness checklist (49 items)

#### Documentation
- `README.md` — Project overview with usage examples
- `CONTRIBUTING.md` — Contribution guidelines + commit convention
- `SECURITY.md` — Security policy + vulnerability reporting instructions
- `FEATURES.md` — Detailed feature usage guide

#### Dependencies
- `marked` — Markdown parsing
- `highlight.js` — Syntax highlighting
- `sanitize-html` — HTML sanitization
- `pdf-parse` — PDF parsing
- `docx` — DOCX parsing
- `adm-zip` — ZIP batch processing

### Changed
- TypeScript strict mode enforced (no `any` leaks)
- Jest test suite: 17 test suites, 215 tests passing
- Coverage threshold: 70% branches, functions, lines, statements

### Security
- Non-root container user (`appuser`)
- `no-new-privileges` Docker security option enabled
- Memory/CPU limits in docker-compose

---

## [0.0.1] - 2026-06-10

### Added
- Initial project skeleton
- Basic document rendering engine
- Markdown and HTML converters

---

<!--
Types of changes:
- Added for new features
- Changed for changes in existing functionality
- Deprecated for soon-to-be removed features
- Removed   for now removed features
- Fixed     for any bug fixes
- Security for changes related to security
-->