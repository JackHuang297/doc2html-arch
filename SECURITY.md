# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------- |
| 1.x | ✅ All versions |
| < 1.0   | ❌ Not supported    |

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, please report them privately:

1. Email the maintainer directly (if known)
2. Or use GitHub's **Private Vulnerability Reporting** (recommended):
   - Go to the repository → Security tab → " Advisories" → "Report a vulnerability"

We aim to respond within **48 hours** and will work with you to understand and mitigate the issue.

---

## Security Features

This project includes the following built-in security measures:

### File Validation
- **Extension whitelist** — only `.txt .html .htm .md .markdown .json .pdf .docx .xlsx .xls .csv .png .jpg .jpeg .gif .webp` are accepted
- **MIME type whitelist** — checked before processing
- **File size limit** — configurable, default **50MB**

### Content Scanning
- **XSS detection** — scans for `<script>`, `javascript:`, `on*=` event handlers, `<iframe>`, `<object>`, `<embed>`
- **Path traversal** — detects `../`, `..\\`, URL-encoded traversal sequences
- **Shell injection** — detects `;`, `|`, `` ` ``, `$(...)`, `$()`
- **Executable magic bytes** — detects Windows PE, ELF, Mach-O binaries embedded in uploads

### Container Security
- Container runs as **non-root user** (`appuser`)
- `no-new-privileges` security option enabled
- Memory and CPU limits enforced via docker-compose

---

## Known Limitations

- Content scanning is heuristic-based; do not rely on it as the sole security layer for untrusted user input
- For production internet exposure, add a reverse proxy (nginx/Caddy) with TLS termination in front of the container
- Rate limiting is not yet built in (`express-rate-limit` can be added as a future enhancement)

---

## Dependencies

We pin dependency versions and use [Dependabot](#) to automatically open PRs for security updates. We aim to apply security patches within **7 days** of disclosure.