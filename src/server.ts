import * as http from 'http';
import * as path from 'path';
import { DocumentRenderAPI } from './api';
import { createDocumentController } from './api/document.controller';
import { getSwaggerDoc } from './api/swagger.config';
import { WebSocketHandler } from './api/websocket.handler';
import { Logger, LogLevel } from './utils/logger';
import { processZipBatch } from './utils/zip.handler';

const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── Logger bootstrap ────────────────────────────────────────────────────────
const LOG_FILE_PATH = process.env.LOG_FILE_PATH;
const LOG_LEVEL_NAME = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};
const logLevel = LOG_LEVEL_MAP[LOG_LEVEL_NAME] ?? LogLevel.INFO;

const loggerConfig = {
  level: logLevel,
  jsonFormat: process.env.NODE_ENV === 'production',
  ...(LOG_FILE_PATH ? { filePath: path.resolve(LOG_FILE_PATH) } : {}),
};

// Bootstrap API instances with file logging
const logger = new Logger('server', loggerConfig);
const api = new DocumentRenderAPI({ loggerConfig });
const controller = createDocumentController({ loggerConfig });

// ─── Request Helpers ─────────────────────────────────────────────────────────

function parseBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body) as T); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res: http.ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// ─── Router ─────────────────────────────────────────────────────────────────

async function router(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', BASE_URL);
  const path = url.pathname;
  const method = req.method || 'GET';

  // ── CORS preflight ────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // ── Health ────────────────────────────────────────────────────────────────
  if (path === '/health') {
    sendJSON(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  // ── OpenAPI Docs ──────────────────────────────────────────────────────────
  if (path === '/api-docs' || path === '/swagger.json') {
    sendJSON(res, 200, getSwaggerDoc(BASE_URL));
    return;
  }

  // ── Metrics ─────────────────────────────────────────────────────────────
  if (path === '/api/metrics') {
    const metrics = controller.getMetrics() ?? {};
    sendJSON(res, 200, metrics);
    return;
  }

  // ── POST /api/render ─────────────────────────────────────────────────────
  if (path === '/api/render' && method === 'POST') {
    try {
      const body = await parseBody<any>(req);
      const result = await api.render({
        documentId: body.documentId || 'inline',
        content: body.content,
        theme: body.theme,
        audiences: body.audiences,
        format: body.format,
        minify: body.minify,
      });
      sendJSON(res, result.success ? 200 : 500, result);
    } catch (err: any) {
      sendJSON(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // ── POST /api/render/batch ───────────────────────────────────────────────
  if (path === '/api/render/batch' && method === 'POST') {
    try {
      const { documents } = await parseBody<any>(req);
      const results = await api.renderBatch(documents || []);
      sendJSON(res, 200, { success: true, results });
    } catch (err: any) {
      sendJSON(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // ── Batch conversion endpoints ───────────────────────────────────────────
  if (path === '/api/batch/convert' && method === 'POST') {
    try {
      const { files, concurrency, maxRetries } = await parseBody<any>(req);
      const result = await controller.batchConvert(files || [], { concurrency, maxRetries });
      sendJSON(res, 202, result);
    } catch (err: any) {
      sendJSON(res, 500, { success: false, error: err.message });
    }
    return;
  }

  if (path.startsWith('/api/batch/progress/') && method === 'GET') {
    const taskId = path.split('/').pop()!;
    const progress = controller.getBatchProgress(taskId) ?? { taskId, status: 'unknown' };
    sendJSON(res, 200, progress);
    return;
  }

  if (path.startsWith('/api/batch/status/') && method === 'GET') {
    const taskId = path.split('/').pop()!;
    const status = controller.getBatchStatus(taskId) ?? { taskId, status: 'unknown' };
    sendJSON(res, 200, status);
    return;
  }

  if (path.startsWith('/api/batch/retry/') && method === 'POST') {
    const taskId = path.split('/').pop()!;
    const result = await controller.retryBatch(taskId);
    sendJSON(res, 200, result);
    return;
  }

  // ── POST /api/batch/upload ──────────────────────────────────────────────
  // Upload a ZIP file for batch conversion
  if (path === '/api/batch/upload' && method === 'POST') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
      }
      const zipBuffer = Buffer.concat(chunks);
      const result = await processZipBatch(zipBuffer);
      sendJSON(res, 200, result);
    } catch (err: any) {
      sendJSON(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // ── GET /api/batch/download/:taskId ──────────────────────────────────────
  // Returns a ZIP of converted HTML files (stub — stores results in memory)
  if (path.startsWith('/api/batch/download/') && method === 'GET') {
    sendJSON(res, 501, { error: 'Not yet implemented — results are in-memory. Use /api/batch/upload for full batch flow.' });
    return;
  }

  // ──404 ─────────────────────────────────────────────────────────────────
  sendJSON(res, 404, { error: 'Not found', path });
}

// ─── Server ─────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  await router(req, res);
});

server.listen(PORT, () => {
  logger.info(`doc2html-arch server running at ${BASE_URL}`);
  logger.info(`  Health: ${BASE_URL}/health`);
  logger.info(`  API docs: ${BASE_URL}/api-docs`);
  logger.info(`  Metrics: ${BASE_URL}/api/metrics`);
  logger.info(`  WebSocket: ${BASE_URL}/ws/preview`);
  if (LOG_FILE_PATH) {
    logger.info(`  Log file: ${path.resolve(LOG_FILE_PATH)}`);
  }
});

// ─── WebSocket ───────────────────────────────────────────────────────────────
// Side-effect: registers WebSocket handler on the HTTP server
new WebSocketHandler(server, api, logger);
logger.info(`WebSocket handler initialized`);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.close();
    process.exit(0);
  });
});

export { server };