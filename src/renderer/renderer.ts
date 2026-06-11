import { AudienceFilter } from '../services/audience-filter';
import { PerformanceOptimizer } from '../services/performance';
import { Logger } from '../utils/logger';
import {
  ConverterFactory,
  ConverterType
} from '../converters';

export interface RenderOptions {
  theme?: string;
  audiences?: string[];
  format?: string;
  minify?: boolean;
  enableCache?: boolean;
}

export interface RenderResult {
  html: string;
  metadata: any;
}

export interface FileRenderOptions extends RenderOptions {
  fileType?: ConverterType;
  mimeType?: string;
  filename?: string;
}

export class DocumentRenderer {
  private audienceFilter: AudienceFilter;
  private performanceOptimizer: PerformanceOptimizer;
  private logger: Logger;
  private cache: Map<string, RenderResult> = new Map();
  private converterFactory: ConverterFactory;

  constructor() {
    this.audienceFilter = new AudienceFilter();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.logger = new Logger('DocumentRenderer');
    this.converterFactory = new ConverterFactory();
  }

  render(document: any, options: RenderOptions = {}): RenderResult {
    const startTime = performance.now();

    try {
      const cacheKey = this.getCacheKey(document, options);
      if (options.enableCache && this.cache.has(cacheKey)) {
        this.logger.info('Cache hit');
        return this.cache.get(cacheKey)!;
      }

      let filteredDoc = document;
      if (options.audiences && options.audiences.length > 0) {
        filteredDoc = this.audienceFilter.filter(document, options.audiences);
      }

      let html = this.renderDocument(filteredDoc, options.theme);

      if (options.minify) {
        html = this.performanceOptimizer.minify(html);
      }

      html = this.performanceOptimizer.lazyLoadImages(html);
      html = this.performanceOptimizer.deferScripts(html);

      const result: RenderResult = {
        html,
        metadata: {
          renderTime: performance.now() - startTime,
          theme: options.theme,
          audiences: options.audiences,
          size: html.length
        }
      };

      if (options.enableCache) {
        this.cache.set(cacheKey, result);
      }

      this.performanceOptimizer.recordMetric('render_time', performance.now() - startTime);
      return result;
    } catch (error) {
      this.logger.error('Render failed', error);
      throw error;
    }
  }

  /**
   * Convert raw file content (markdown, html, or plain text) to HTML.
   * Auto-detects file type from filename, mimeType, or content if not specified.
   */
  convertFile(
    content: string,
    options: FileRenderOptions = {}
  ): RenderResult {
    const startTime = performance.now();

    // Detect file type
    let fileType: ConverterType | undefined = options.fileType;
    if (!fileType && options.filename) {
      fileType = this.converterFactory.detectFromExtension(options.filename) ?? undefined;
    }
    if (!fileType && options.mimeType) {
      fileType = this.converterFactory.detectFromMimeType(options.mimeType) ?? undefined;
    }
    if (!fileType) {
      fileType = this.converterFactory.detectFromContent(content);
    }

    // Convert via factory
    const converted = this.converterFactory.convert(content, fileType);
    let html = converted.html;

    // Wrap in full HTML document
    if (options.theme) {
      html = this.wrapInDocument(html, options.theme);
    } else {
      html = this.wrapInDocument(html);
    }

    // Apply performance optimizations
    if (options.minify) {
      html = this.performanceOptimizer.minify(html);
    }
    html = this.performanceOptimizer.lazyLoadImages(html);
    html = this.performanceOptimizer.deferScripts(html);

    return {
      html,
      metadata: {
        converter: converted.converter,
        originalLength: converted.metadata.originalLength,
        convertedLength: converted.metadata.convertedLength,
        renderTime: performance.now() - startTime,
        fileType,
        filename: options.filename
      }
    };
  }

  /**
   * Register a custom converter for a specific file type.
   */
  registerConverter(type: ConverterType, converter: any): void {
    this.converterFactory.register(type, converter);
  }

  /**
   * List all registered converter types.
   */
  listConverters(): ConverterType[] {
    return this.converterFactory.listRegistered();
  }

  /**
   * Detect file type from content, filename, or mimeType.
   */
  detectFileType(
    content: string,
    filename?: string,
    mimeType?: string
  ): ConverterType {
    if (filename) {
      const fromExt = this.converterFactory.detectFromExtension(filename) ?? undefined;
      if (fromExt) return fromExt;
    }
    if (mimeType) {
      const fromMime = this.converterFactory.detectFromMimeType(mimeType) ?? undefined;
      if (fromMime) return fromMime;
    }
    return this.converterFactory.detectFromContent(content);
  }

  private wrapInDocument(html: string, theme?: string): string {
    const themeTag = theme
      ? `<link rel="stylesheet" href="/themes/${theme}.css">`
      : '';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\
<title>Converted Document</title>${themeTag}</head><body>${html}</body></html>`;
  }

  private renderDocument(document: any, theme?: string): string {
    let html = '<!DOCTYPE html><html>';
    html += '<head>';
    html += '<meta charset="UTF-8">';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    html += `<title>${document.title || 'Document'}</title>`;

    if (theme) {
      html += `<link rel="stylesheet" href="/themes/${theme}.css">`;
    }

    if (document.styles) {
      html += `<style>${document.styles}</style>`;
    }

    if (document.meta) {
      if (document.meta.description) {
        html += `<meta name="description" content="${document.meta.description}">`;
      }
      if (document.meta.keywords) {
        html += `<meta name="keywords" content="${document.meta.keywords}">`;
      }
    }

    html += '</head><body>';

    if (document.sections && Array.isArray(document.sections)) {
      html += document.sections.map((section: any) =>
        this.renderSection(section)
      ).join('');
    }

    html += '</body></html>';
    return html;
  }

  private renderSection(section: any): string {
    let html = `<section class="section" id="${section.id || ''}">`;

    if (section.heading) {
      html += `<h2>${this.escapeHtml(section.heading)}</h2>`;
    }

    if (section.content) {
      html += `<p>${this.escapeHtml(section.content)}</p>`;
    }

    html += '</section>';
    return html;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  private getCacheKey(document: any, options: RenderOptions): string {
    return `${document.id}-${options.theme}-${(options.audiences || []).join(',')}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getMetrics() {
    return this.performanceOptimizer.getMetrics('render_time');
  }
}