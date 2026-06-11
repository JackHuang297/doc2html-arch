import { DocumentRenderer } from './renderer';
import { Logger, LoggerConfig } from './utils/logger';

export interface RenderRequest {
  documentId: string;
  content: any;
  theme?: string;
  audiences?: string[];
  format?: string;
  minify?: boolean;
}

export interface RenderResponse {
  success: boolean;
  data?: {
    html: string;
    metadata: any;
  };
  error?: string;
}

export interface DocumentRenderAPIOptions {
  loggerConfig?: Partial<LoggerConfig>;
}

export class DocumentRenderAPI {
  private renderer: DocumentRenderer;
  private logger: Logger;

  constructor(options: DocumentRenderAPIOptions = {}) {
    this.renderer = new DocumentRenderer();
    this.logger = new Logger('DocumentRenderAPI', options.loggerConfig);
  }

  async render(request: RenderRequest): Promise<RenderResponse> {
    try {
      this.logger.info(`Rendering document: ${request.documentId}`);

      const result = await this.renderer.render(request.content, {
        theme: request.theme,
        audiences: request.audiences,
        format: request.format,
        minify: request.minify,
        enableCache: true
      });

      return {
        success: true,
        data: {
          html: result.html,
          metadata: result.metadata
        }
      };
    } catch (error) {
      this.logger.error('Render request failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async renderBatch(requests: RenderRequest[]): Promise<RenderResponse[]> {
    this.logger.info(`Rendering batch of ${requests.length} documents`);
    return Promise.all(requests.map(req => this.render(req)));
  }

  clearCache(): void {
    this.renderer.clearCache();
    this.logger.info('Cache cleared');
  }
}
