import { DocumentRenderer, RenderOptions } from '../renderer/renderer';
import { Logger, LoggerConfig } from '../utils/logger';
import { DocumentService, Document, ProcessResult } from '../services/document.service';
import { BatchService, BatchFile, BatchConvertResponse } from './batch.service';

export interface DocumentControllerOptions {
  loggerConfig?: Partial<LoggerConfig>;
  service?: DocumentService;
}

export class DocumentController {
  private renderer: DocumentRenderer;
  private logger: Logger;
  private service: DocumentService;
  private batchService: BatchService;

  constructor(options: DocumentControllerOptions = {}) {
    this.renderer = new DocumentRenderer();
    this.service = options.service || new DocumentService();
    this.batchService = new BatchService(this.service);
    this.logger = new Logger('DocumentController', options.loggerConfig);
  }

  async getDocument(id: string): Promise<Document | null> {
    return this.service.getDocument(id);
  }

  async createDocument(newDoc: Partial<Document>): Promise<ProcessResult> {
    try {
      if (!newDoc.title || newDoc.title.trim() === '') {
        return { success: false, error: 'Title is required' };
      }
      const doc: Document = {
        id: newDoc.id || `doc-${Date.now()}`,
        title: newDoc.title,
        sections: newDoc.sections,
        meta: newDoc.meta,
        styles: newDoc.styles
      };
      const result = await this.service.process(doc);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateDocument(id: string, update: Partial<Document>): Promise<ProcessResult> {
    try {
      const existing = await this.service.getDocument(id);
      if (!existing) {
        return { success: false, id, error: 'Document not found' };
      }
      const merged: Document = { ...existing, ...update, id };
      return await this.service.save(merged);
    } catch (error: any) {
      return { success: false, id, error: error.message };
    }
  }

  async deleteDocument(id: string): Promise<ProcessResult> {
    try {
      const existing = await this.service.getDocument(id);
      if (!existing) {
        return { success: false, id, error: 'Document not found' };
      }
      await this.service.invalidateCache(id);
      return { success: true, id };
    } catch (error: any) {
      return { success: false, id, error: error.message };
    }
  }

  async listDocuments(): Promise<Document[]> {
    // Returns empty array in this simplified in-memory implementation
    return [];
  }

  async renderDocument(id: string): Promise<string> {
    let doc = await this.service.getDocument(id);
    if (!doc) {
      doc = { id, title: id, sections: [] };
    }
    return this.renderer.render(doc, {}).html;
  }

  render(document: any, options: RenderOptions = {}): string {
    try {
      this.logger.info('Rendering document', { documentId: document.id });
      const html = this.renderer.render(document, options).html;
      this.logger.info('Document rendered successfully', { size: html.length });
      return html;
    } catch (error) {
      this.logger.error('Failed to render document', error);
      throw error;
    }
  }

  validate(document: any): boolean {
    if (!document) {
      throw new Error('Document is required');
    }

    if (typeof document !== 'object') {
      throw new Error('Document must be an object');
    }

    if (!document.id) {
      throw new Error('Document must have an id');
    }

    return true;
  }

  getMetrics() {
    return this.renderer.getMetrics();
  }

  clearCache() {
    this.renderer.clearCache();
  }

  // ─── Batch Conversion ───────────────────────────────────────────────

  /**
   * POST /api/batch/convert
   * Start a batch conversion task. Returns immediately with taskId.
   */
  async batchConvert(
    files: BatchFile[],
    options?: { concurrency?: number; maxRetries?: number }
  ): Promise<BatchConvertResponse> {
    try {
      return await this.batchService.startBatch({
        files,
        concurrency: options?.concurrency ?? 5,
        maxRetries: options?.maxRetries ?? 3
      });
    } catch (error: any) {
      return { success: false, taskId: '', message: error.message };
    }
  }

  /**
   * GET /api/batch/progress/:taskId
   * Get progress for a batch task.
   */
  getBatchProgress(taskId: string): ReturnType<BatchService['getProgress']> {
    return this.batchService.getProgress(taskId);
  }

  /**
   * GET /api/batch/status/:taskId
   * Get full status details for a batch task.
   */
  getBatchStatus(taskId: string) {
    return this.batchService.getTaskDetails(taskId);
  }

  /**
   * POST /api/batch/retry/:taskId
   * Retry failed files in a batch task.
   */
  async retryBatch(taskId: string): Promise<BatchConvertResponse> {
    try {
      return await this.batchService.retryFailed(taskId);
    } catch (error: any) {
      return { success: false, taskId, message: error.message };
    }
  }
}

export function createDocumentController(options?: DocumentControllerOptions): DocumentController {
  return new DocumentController(options);
}