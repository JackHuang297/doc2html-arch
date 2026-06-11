import { OutputOptions, mergeOptions, applyTheme, injectCustomCss, wrapWithHeaderFooter } from '../converters/output.options';

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

export class ConverterTemplate {
  constructor() {}

  /**
   * Apply full output options pipeline to HTML.
   */
  apply(html: string, options?: Partial<OutputOptions>): string {
    const opts = mergeOptions(options);

    if (opts.theme && opts.theme !== 'none') {
      html = applyTheme(html, opts.theme);
    }

    if (opts.customCss) {
      html = injectCustomCss(html, opts.customCss);
    }

    if (opts.header || opts.footer) {
      html = wrapWithHeaderFooter(html, opts.header, opts.footer);
    }

    if (opts.title) {
      html = html.replace('<title>Converted Document</title>', `<title>${opts.title}</title>`);
    }

    if (opts.lang) {
      html = html.replace('<html>', `<html lang="${opts.lang}">`);
    }

    return html;
  }

  /**
   * Wrap raw content in a full HTML document shell.
   */
  wrapDocument(body: string, title = 'Converted Document'): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\
<title>${title}</title></head><body>${body}</body></html>`;
  }

  /**
   * Build a Table of Contents from heading entries.
   */
  buildToc(entries: TocEntry[]): string {
    if (entries.length === 0) return '';

    let html = '<nav class="toc"><h2>Table of Contents</h2><ul>';
    for (const entry of entries) {
      const indent = entry.level > 1 ? ` style="padding-left: ${(entry.level - 1) * 1.5}rem"` : '';
      html += `<li${indent}><a href="#${entry.id}">${entry.text}</a></li>`;
    }
    html += '</ul></nav>';
    return html;
  }

  /**
   * Extract headings from HTML for TOC generation.
   */
  extractHeadings(html: string): TocEntry[] {
    const entries: TocEntry[] = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      entries.push({ level, text, id });
    }

    return entries;
  }

  /**
   * Apply heading IDs to HTML for anchor links.
   */
  anchorHeadings(html: string): string {
    return html.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/gi, (_, level, attrs, content) => {
      const text = content.replace(/<[^>]+>/g, '').trim();
      const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
    });
  }

  /**
   * Minify HTML output.
   */
  minifyHtml(html: string): string {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
  }

  /**
   * Wrap code blocks with syntax highlighting classes.
   */
  highlightCode(html: string): string {
    // placeholder - actual highlighting done by highlight.js at render time
    return html;
  }

  /**
   * Add syntax highlighting script and theme link.
   */
  addHighlightAssets(html: string, _theme = 'github'): string {
    const hlCss = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${_theme}.min.css">`;
    const hlScript = `<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script><script>hljs.highlightAll();</script>`;
    return html.replace('</head>', `${hlCss}${hlScript}</head>`);
  }
}