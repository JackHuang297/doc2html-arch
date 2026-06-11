import { AudienceFilter } from './services/audience-filter';
import { PerformanceOptimizer } from './services/performance';
import { Logger } from './utils/logger';

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

export class DocumentRenderer {
  private audienceFilter: AudienceFilter;
  private performanceOptimizer: PerformanceOptimizer;
  private logger: Logger;
  private cache: Map<string, RenderResult> = new Map();

  constructor() {
    this.audienceFilter = new AudienceFilter();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.logger = new Logger('DocumentRenderer');
  }

  async render(document: any, options: RenderOptions = {}): Promise<RenderResult> {
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

  private renderDocument(document: any, theme?: string): string {
    let html = '<!DOCTYPE html><html>';
    html += '<head>';
    html += '<meta charset="UTF-8">';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    html += `<title>${document.title || 'Document'}</title>`;
    
    if (theme) {
      html += `<link rel="stylesheet" href="/themes/${theme}.css">`;
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
    let html = `<section class="section" id="${section.id}">`;
    
    if (section.title) {
      html += `<h2>${this.escapeHtml(section.title)}</h2>`;
    }
    
    if (section.content && Array.isArray(section.content)) {
      html += section.content.map((item: any) => 
        this.renderContent(item)
      ).join('');
    }
    
    html += '</section>';
    return html;
  }

  private renderContent(content: any): string {
    if (typeof content === 'string') {
      return `<p>${this.escapeHtml(content)}</p>`;
    }
    
    if (content.type === 'heading') {
      const level = content.level || 3;
      return `<h${level}>${this.escapeHtml(content.text)}</h${level}>`;
    }
    
    if (content.type === 'paragraph') {
      return `<p>${this.escapeHtml(content.text)}</p>`;
    }
    
    if (content.type === 'list') {
      const tag = content.ordered ? 'ol' : 'ul';
      const items = content.items.map((item: string) => 
        `<li>${this.escapeHtml(item)}</li>`
      ).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    
    return '';
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
