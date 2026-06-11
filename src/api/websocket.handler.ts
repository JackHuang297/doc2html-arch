import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { DocumentRenderAPI } from '../api';
import { Logger, LogLevel } from '../utils/logger';

export type WSClientMessage =
  | { type: 'render'; id: string; content: any; theme?: string; options?: any }
  | { type: 'ping' };

export type WSServerMessage =
  | { type: 'rendered'; id: string; success: boolean; html?: string; metadata?: any; error?: string }
  | { type: 'pong' }
  | { type: 'error'; id: string; message: string };

export class WebSocketHandler {
  private wss: WebSocketServer;
  private api: DocumentRenderAPI;
  private logger: Logger;
  private clients: Map<WebSocket, Set<string>> = new Map(); // client → subscribed channels

  constructor(server: HttpServer, api: DocumentRenderAPI, logger?: Logger) {
    this.api = api;
    this.logger = logger ?? new Logger('WebSocketHandler', { level: LogLevel.INFO });

    this.wss = new WebSocketServer({ server, path: '/ws/preview' });

    this.wss.on('connection', (ws: WebSocket, _req) => {
      this.logger.info('WebSocket client connected');

      ws.on('message', (data: RawData) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.logger.info('WebSocket client disconnected');
      });

      ws.on('error', (err: Error) => {
        this.logger.error('WebSocket error', err);
      });

      // Send welcome
      this.send(ws, { type: 'rendered', id: '', success: true, metadata: { welcome: 'doc2html-arch WS' } });
    });

    this.logger.info('WebSocket handler ready at /ws/preview');
  }

  private handleMessage(ws: WebSocket, data: RawData): void {
    let msg: WSClientMessage;
    try {
      const raw = data.toString('utf-8');
      msg = JSON.parse(raw);
    } catch {
      this.send(ws, { type: 'error', id: '', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'ping':
        this.send(ws, { type: 'pong' });
        break;

      case 'render': {
        const { id, content, theme, options } = msg;
        this.handleRender(ws, id, content, theme, options);
        break;
      }

      default:
        this.send(ws, { type: 'error', id: (msg as any).id ?? '', message: `Unknown message type: ${(msg as any).type}` });
    }
  }

  private async handleRender(ws: WebSocket, id: string, content: any, theme?: string, options?: any): Promise<void> {
    try {
      const result = await this.api.render({
        documentId: id,
        content,
        theme,
        minify: options?.minify,
        audiences: options?.audiences,
      });

      this.send(ws, {
        type: 'rendered',
        id,
        success: result.success,
        html: result.data?.html,
        metadata: result.data?.metadata,
        error: result.error,
      });
    } catch (err: any) {
      this.send(ws, {
        type: 'rendered',
        id,
        success: false,
        error: err.message,
      });
    }
  }

  private send(ws: WebSocket, msg: WSServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  close(): void {
    this.wss.close();
    this.logger.info('WebSocket handler closed');
  }

  getClientCount(): number {
    return this.wss.clients.size;
  }
}