# Features Guide — doc2html-arch

> Detailed usage instructions for all major features added after v1.0.0

---

## Supported File Formats

| Format | Extensions | MIME Type | Converter |
|--------|-----------|-----------|-----------|
| Markdown | `.md`, `.markdown` | `text/markdown` | `MarkdownConverter` |
| HTML | `.html`, `.htm` | `text/html` | `HtmlConverter` |
| Plain Text | `.txt` | `text/plain` | `TextConverter` |
| PDF | `.pdf` | `application/pdf` | `PdfConverter` |
| DOCX | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `DocxConverter` |
| JSON | `.json` | `application/json` | `JsonConverter` |
| **Excel** | **`.xlsx`**, **`.xls`**, **`.csv`** | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv` | **`XlsxConverter`** |
| **Images** | **`.png`**, **`.jpg`**, **`.jpeg`**, **`.gif`**, **`.webp`** | `image/png`, `image/jpeg`, `image/gif`, `image/webp` | **`ImageConverter`** |

---

## Excel / CSV Conversion (`XlsxConverter`)

Converts `.xlsx`, `.xls`, and `.csv` files to HTML tables.

### Usage via API

```bash
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "spreadsheet-1",
    "content": { "source": "base64-or-buffer" },
    "theme": "light"
  }'
```

> For file-based conversion, use the batch upload endpoint.

### Features

- First row automatically used as column headers
- Column widths auto-calculated (8–40 chars)
- Empty rows skipped
- Multiple sheets → multiple HTML sections
- Built-in table styling (zebra striping)

### Output HTML structure

```html
<div class="xlsx-document" data-sheet-count="2">
  <div class="xlsx-sheet">
    <h3>Sheet Name</h3>
    <table class="xlsx-table">
      <thead><tr><th>Column A</th><th>Column B</th></tr></thead>
      <tbody>
        <tr><td>Value 1</td><td>Value 2</td></tr>
        ...
      </tbody>
    </table>
  </div>
</div>
```

---

## Image Conversion (`ImageConverter`)

Converts PNG, JPEG, GIF, and WebP images to responsive HTML pages.

### Features

- Auto-resize to max 1920×1080 (preserves aspect ratio)
- Photos → JPEG (quality 85)
- Transparency (PNG/GIF) → preserved as PNG
- Embedded as `data:image/...;base64` URI
- Responsive wrapper with dark/light theme background
- Displays dimensions and format in caption

### Usage

```bash
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "photo-1",
    "content": { "source": "base64-or-buffer" },
    "theme": "dark"
  }'
```

---

## Batch ZIP Conversion

Upload a ZIP file containing multiple documents. Each file is converted to HTML and returned in a batch result.

### Endpoint

```
POST /api/batch/upload
Content-Type: application/zip
Body: <ZIP file binary>
```

### Example

```bash
curl -X POST http://localhost:3000/api/batch/upload \
  --data-binary @documents.zip
```

### Response

```json
{
  "success": true,
  "taskId": "zip-20260611-abc123",
  "totalFiles": 5,
  "successCount": 4,
  "failedCount": 1,
  "entries": [
    {
      "name": "report.xlsx",
      "path": "folder/report.xlsx",
      "success": true,
      "html": "<!DOCTYPE html>...",
      "sizeOriginal": 24576,
      "sizeConverted": 18432
    },
    {
      "name": "unknown.exe",
      "path": "unknown.exe",
      "success": false,
      "error": "Unsupported file type: .exe",
      "sizeOriginal": 102400,
      "sizeConverted": 0
    }
  ],
  "totalOriginalSize": 292864,
  "totalConvertedSize": 73472
}
```

### Supported files inside ZIP

All supported formats (Markdown, HTML, Text, PDF, DOCX, JSON, XLSX, CSV, PNG, JPG, GIF, WebP). Executable extensions (`.exe`, `.dll`, `.so`, `.dylib`) are skipped with an error.

---

## Real-Time Preview (WebSocket)

Connect via WebSocket to get instant conversion results without polling.

### Endpoint

```
ws://localhost:3000/ws/preview
```

### Client → Server Messages

**Render request:**
```json
{
  "type": "render",
  "id": "preview-1",
  "content": {
    "id": "preview-1",
    "title": "My Document",
    "sections": [{ "heading": "Hello", "content": "World" }]
  },
  "theme": "default",
  "options": { "minify": false }
}
```

**Ping:**
```json
{ "type": "ping" }
```

### Server → Client Messages

**Rendered result:**
```json
{
  "type": "rendered",
  "id": "preview-1",
  "success": true,
  "html": "<!DOCTYPE html>...",
  "metadata": { "renderTime": 4.5, "size": 1234 }
}
```

**Pong:**
```json
{ "type": "pong" }
```

**Error:**
```json
{
  "type": "rendered",
  "id": "preview-1",
  "success": false,
  "error": "Document must have an id"
}
```

### JavaScript Example

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/preview');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'render',
    id: 'doc-1',
    content: { id: 'doc-1', title: 'Hello', sections: [] },
    theme: 'default'
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'rendered') {
    document.getElementById('preview').innerHTML = msg.html;
  }
};
```

---

## Theme System

Themes apply CSS styling to the rendered HTML output.

### Available Themes

| Theme | Description |
|-------|-------------|
| `light` | Clean white background, system fonts, subtle borders |
| `dark` | Dark background (`#1e1e1e`), light text |
| `minimal` | Serif font, centered, max-width 720px |
| `none` | No theme CSS applied |

### Usage

```bash
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "doc-1",
    "content": { "id": "doc-1", "title": "My Doc" },
    "theme": "dark"
  }'
```

### Custom CSS Injection

Pass `customCss` in the render options to inject additional CSS:

```json
{
  "documentId": "doc-1",
  "content": { "id": "doc-1", "title": "Report" },
  "customCss": ".xlsx-table { font-size: 18px; }"
}
```

---

## Security

The security validator enforces:

- **Extension whitelist** — only listed extensions are accepted
- **MIME type whitelist** — checked on upload
- **File size limit** — configurable, default 50MB
- **Content scanning** — XSS, path traversal, shell injection, executable magic bytes

To configure, edit `DEFAULT_SECURITY_CONFIG` in `src/utils/security.validator.ts` or pass a custom `SecurityConfig` when constructing `SecurityValidator`.

---

## Environment Variables

```bash
PORT=3000                    # Server port
NODE_ENV=production           # development | production
LOG_LEVEL=info                # debug | info | warn | error
LOG_FILE_PATH=./logs          # Enable file logging
MAX_FILE_SIZE_BYTES=52428800  # 50MB default
```

---

## Architecture Notes

### Converter Factory

All converters are registered in `ConverterFactory`. Binary formats (PDF, DOCX, XLSX, images) are **async**; text formats (Markdown, HTML, text) are **sync**.

```typescript
import { defaultConverterFactory } from './converters';

// Auto-detect by filename
const result = await defaultConverterFactory.autoConvert(
  buffer,
  'report.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
);

// List all registered types
defaultConverterFactory.listRegistered();
// → ['markdown', 'html', 'text', 'pdf', 'docx', 'json', 'xlsx', 'image']
```

### Async vs Sync Converters

| Type | Interface | Examples |
|------|-----------|---------|
| Sync | `IConverter` | Markdown, HTML, Text |
| Async | `IAsyncConverter` | PDF, DOCX, XLSX, Image |
| Auto | `autoConvert()` | Detects and routes automatically |