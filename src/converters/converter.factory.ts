import { MarkdownConverter } from './markdown.converter';
import { HtmlConverter } from './html.converter';
import { TextConverter } from './text.converter';
import { PdfConverter } from './pdf.converter';
import { DocxConverter } from './docx.converter';
import { JsonConverter } from './json.converter';
import { XlsxConverter } from './xlsx.converter';
import { ImageConverter } from './image.converter';
import { OutputOptions } from './output.options';

export type ConverterType =
  | 'markdown' | 'html' | 'text' | 'document'
  | 'pdf' | 'docx' | 'json'
  | 'xlsx' | 'image';
export type FileMimeType =
  | 'text/markdown'
  | 'text/x-markdown'
  | 'text/html'
  | 'text/plain'
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/json'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'text/csv'
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'application/octet-stream';

export interface ConverterResult {
  html: string;
  converter: ConverterType;
  metadata: {
    sourceType: ConverterType;
    originalLength: number;
    convertedLength: number;
    charset?: string;
  };
}

export interface IConverter {
  convert(content: string, options?: Partial<OutputOptions>): string;
}

export interface IAsyncConverter {
  convert(source: Buffer | ArrayBuffer | string, options?: Partial<OutputOptions>): Promise<{ html: string; metadata: any }>;
}

export class ConverterFactory {
  private converters: Map<ConverterType, IConverter> = new Map();
  private mimeMap: Map<string, ConverterType> = new Map();
  private extMap: Map<string, ConverterType> = new Map();
  private asyncConverters: Map<ConverterType, IAsyncConverter> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // Register built-in converters (sync)
    this.register('markdown', new MarkdownConverter());
    this.register('html', new HtmlConverter());
    this.register('text', new TextConverter());

    // Register async converters (binary formats)
    this.registerAsync('pdf', new PdfConverter() as any);
    this.registerAsync('docx', new DocxConverter() as any);
    this.registerAsync('json', new JsonConverter() as any);
    this.registerAsync('xlsx', new XlsxConverter() as any);
    this.registerAsync('image', new ImageConverter() as any);

    // MIME type mappings
    this.mimeMap.set('text/markdown', 'markdown');
    this.mimeMap.set('text/x-markdown', 'markdown');
    this.mimeMap.set('text/html', 'html');
    this.mimeMap.set('text/plain', 'text');
    this.mimeMap.set('application/pdf', 'pdf');
    this.mimeMap.set('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx');
    this.mimeMap.set('application/json', 'json');
    this.mimeMap.set('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx');
    this.mimeMap.set('text/csv', 'xlsx');
    this.mimeMap.set('image/png', 'image');
    this.mimeMap.set('image/jpeg', 'image');
    this.mimeMap.set('image/gif', 'image');
    this.mimeMap.set('image/webp', 'image');

    // File extension mappings
    this.extMap.set('md', 'markdown');
    this.extMap.set('markdown', 'markdown');
    this.extMap.set('mdown', 'markdown');
    this.extMap.set('mkd', 'markdown');
    this.extMap.set('html', 'html');
    this.extMap.set('htm', 'html');
    this.extMap.set('txt', 'text');
    this.extMap.set('text', 'text');
    this.extMap.set('log', 'text');
    this.extMap.set('pdf', 'pdf');
    this.extMap.set('docx', 'docx');
    this.extMap.set('json', 'json');
    this.extMap.set('xlsx', 'xlsx');
    this.extMap.set('xls', 'xlsx');
    this.extMap.set('csv', 'xlsx');
    this.extMap.set('png', 'image');
    this.extMap.set('jpg', 'image');
    this.extMap.set('jpeg', 'image');
    this.extMap.set('gif', 'image');
    this.extMap.set('webp', 'image');
  }

  register(type: ConverterType, converter: IConverter): void {
    this.converters.set(type, converter);
  }

  registerAsync(type: ConverterType, converter: IAsyncConverter): void {
    this.asyncConverters.set(type, converter as any);
  }

  unregister(type: ConverterType): boolean {
    return this.converters.delete(type) || this.asyncConverters.delete(type);
  }

  get(type: ConverterType): IConverter | undefined {
    return this.converters.get(type);
  }

  getAsync(type: ConverterType): IAsyncConverter | undefined {
    return this.asyncConverters.get(type) as IAsyncConverter | undefined;
  }

  has(type: ConverterType): boolean {
    return this.converters.has(type) || this.asyncConverters.has(type);
  }

  isAsyncType(type: ConverterType): boolean {
    return this.asyncConverters.has(type);
  }

  detectFromExtension(filename: string): ConverterType | null {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return this.extMap.get(ext) || null;
  }

  detectFromMimeType(mimeType: string): ConverterType | null {
    return this.mimeMap.get(mimeType.toLowerCase()) || null;
  }

  detectFromContent(content: string): ConverterType {
    const trimmed = content.trim();

    // Markdown heuristics
    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('---') ||
      /^[*\-+]\s/.test(trimmed) ||
      /^\d+\.\s/.test(trimmed) ||
      trimmed.includes('```') ||
      trimmed.includes('**') ||
      trimmed.includes('__')
    ) {
      return 'markdown';
    }

    // HTML heuristics
    if (
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      /<[a-z][a-z0-9]*[^>]*>/i.test(trimmed)
    ) {
      return 'html';
    }

    return 'text';
  }

  convert(content: string, type?: ConverterType, options?: Partial<OutputOptions>): ConverterResult {
    const detectedType = type || this.detectFromContent(content);
    const converter = this.converters.get(detectedType);

    if (!converter) {
      throw new Error(`No converter registered for type: ${detectedType}`);
    }

    const html = converter.convert(content, options);

    return {
      html,
      converter: detectedType,
      metadata: {
        sourceType: detectedType,
        originalLength: content.length,
        convertedLength: html.length
      }
    };
  }

  /**
   * Async convert for binary formats (PDF, DOCX, etc.).
   * Also works for text formats if content is passed as Buffer.
   */
  async convertAsync(
    source: Buffer | ArrayBuffer | string,
    type: ConverterType,
    options?: Partial<OutputOptions>
  ): Promise<{ html: string; metadata: any; converter: ConverterType }> {
    const converter = this.asyncConverters.get(type);
    if (!converter) {
      throw new Error(`No async converter registered for type: ${type}`);
    }

    const result = await converter.convert(source, options);
    return {
      html: result.html,
      metadata: result.metadata,
      converter: type
    };
  }

  /**
   * Auto-detect and convert any source (sync or async).
   */
  async autoConvert(
    source: Buffer | ArrayBuffer | string,
    filename?: string,
    mimeType?: string,
    options?: Partial<OutputOptions>
  ): Promise<{ html: string; metadata: any; converter: ConverterType }> {
    let type: ConverterType | null = null;

    if (filename) type = this.detectFromExtension(filename);
    if (!type && mimeType) type = this.detectFromMimeType(mimeType);
    if (!type && Buffer.isBuffer(source)) {
      // Can't auto-detect binary formats reliably from content
      type = 'text';
    }

    if (!type) {
      throw new Error('Cannot detect file type: provide filename or mimeType for binary files');
    }

    if (this.isAsyncType(type)) {
      return this.convertAsync(source, type, options);
    }

    // Sync converter — need string content
    const content = typeof source === 'string'
      ? source
      : Buffer.isBuffer(source)
        ? source.toString('utf-8')
        : Buffer.from(new Uint8Array(source instanceof ArrayBuffer ? source : source)).toString('utf-8');
    const result = this.convert(content, type, options);
    return { html: result.html, metadata: result.metadata, converter: type };
  }

  listRegistered(): ConverterType[] {
    return Array.from(this.converters.keys());
  }

  getMimeMap(): Map<string, ConverterType> {
    return new Map(this.mimeMap);
  }

  getExtMap(): Map<string, ConverterType> {
    return new Map(this.extMap);
  }
}

// Singleton instance for convenience
export const defaultConverterFactory = new ConverterFactory();