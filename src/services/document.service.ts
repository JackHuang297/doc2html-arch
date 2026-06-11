import { DocumentRenderer, RenderOptions, RenderResult, FileRenderOptions } from '../renderer/renderer';
import { Logger } from '../utils/logger';

export interface Document {
  id: string;
  title?: string;
  sections?: Section[];
  meta?: {
    description?: string;
    keywords?: string;
  };
  styles?: string;
}

export interface Section {
  id?: string;
  heading?: string;
  content?: string;
}

export interface ProcessResult {
  success: boolean;
  id?: string;
  html?: string;
  error?: string;
}

export interface FileUploadResult {
  success: boolean;
  id?: string;
  html?: string;
  fileType?: string;
  originalSize?: number;
  convertedSize?: number;
  error?: string;
}

export class DocumentService {
  private renderer: DocumentRenderer;
  private logger: Logger;
  private documents: Map<string, Document> = new Map();

  constructor() {
    this.renderer = new DocumentRenderer();
    this.logger = new Logger('DocumentService');
  }

  async process(doc: Document): Promise<ProcessResult> {
    try {
      this.validate(doc);
      const html = this.renderer.render(doc, {}).html;
      this.documents.set(doc.id, doc);
      return { success: true, id: doc.id, html };
    } catch (error: any) {
      this.logger.error('Process failed', error);
      return { success: false, id: doc.id, error: error.message };
    }
  }

  async getDocument(id: string): Promise<Document | null> {
    return this.documents.get(id) || null;
  }

  async save(doc: Document): Promise<ProcessResult> {
    try {
      this.validate(doc);
      this.documents.set(doc.id, doc);
      return { success: true, id: doc.id };
    } catch (error: any) {
      return { success: false, id: doc.id, error: error.message };
    }
  }

  async processBatch(docs: Document[]): Promise<ProcessResult[]> {
    return Promise.all(docs.map(doc => this.process(doc)));
  }

  async invalidateCache(id: string): Promise<void> {
    this.documents.delete(id);
  }

  /**
   * Convert a file's raw content (markdown, HTML, or plain text) to HTML.
   * Auto-detects file type from filename, mimeType, or content.
   */
  async convertFile(
    content: string,
    options: FileRenderOptions = {}
  ): Promise<FileUploadResult> {
    try {
      if (!content || typeof content !== 'string') {
        return { success: false, error: 'Content must be a non-empty string' };
      }

      const result = this.renderer.convertFile(content, options);
      const id = options.filename
        ? `file-${Buffer.from(options.filename).toString('base64').slice(0, 12)}`
        : `file-${Date.now()}`;

      return {
        success: true,
        id,
        html: result.html,
        fileType: result.metadata.fileType as string,
        originalSize: result.metadata.originalLength,
        convertedSize: result.metadata.convertedLength
      };
    } catch (error: any) {
      this.logger.error('File conversion failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload and convert a file — alias for convertFile with extra metadata.
   */
  async uploadFile(
    content: Buffer | string,
    filename: string,
    mimeType?: string
  ): Promise<FileUploadResult> {
    const textContent = typeof content === 'string' ? content : content.toString('utf-8');
    return this.convertFile(textContent, { filename, mimeType });
  }

  render(document: Document, options?: RenderOptions): RenderResult {
    try {
      this.validate(document);
      const result = this.renderer.render(document, options);
      return {
        html: result.html,
        metadata: { size: result.html.length, title: document.title }
      };
    } catch (error) {
      this.logger.error('Failed to render document', error);
      throw error;
    }
  }

  validate(document: any): boolean {
    if (!document) {
      throw new Error('Document is required');
    }

    if (!document.id) {
      throw new Error('Document must have an id');
    }

    return true;
  }

  transform(document: any, transformFn: (doc: any) => any): Document {
    try {
      return transformFn(document);
    } catch (error) {
      this.logger.error('Transform failed', error);
      throw error;
    }
  }
}