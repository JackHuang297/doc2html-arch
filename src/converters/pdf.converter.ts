import { OutputOptions, mergeOptions } from './output.options';
import { ConverterTemplate } from '../templates/converter.template';

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modDate?: string;
  pageCount?: number;
}

export interface PdfConverterResult {
  html: string;
  metadata: PdfMetadata;
}

/** Synchronous buffer source for pdf converter */
export type PdfSource = Buffer | ArrayBuffer | string;

export class PdfConverter {
  private template: ConverterTemplate;

  constructor() {
    this.template = new ConverterTemplate();
  }

  async convert(
    source: PdfSource,
    options?: Partial<OutputOptions>
  ): Promise<PdfConverterResult> {
    const opts = mergeOptions(options);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PDFParse } = require('pdf-parse');

    let doc: any;
    const metadata: PdfMetadata = {};

    if (typeof source === 'string') {
      // Treat as file path
      doc = await PDFParse.getFromFile(source);
    } else {
      const buffer = Buffer.isBuffer(source)
        ? source
        : Buffer.from(source instanceof ArrayBuffer ? source : Buffer.from(source).buffer);
      const parser = new PDFParse({ data: buffer });
      doc = await parser.load();
    }

    const text = await doc.getText();
    metadata.pageCount = doc.numPages;

    // Try to get info
    try {
      const info = await doc.getInfo();
      metadata.title = info?.Title;
      metadata.author = info?.Author;
      metadata.subject = info?.Subject;
      metadata.keywords = info?.Keywords;
      metadata.creator = info?.Creator;
      metadata.producer = info?.Producer;
      metadata.creationDate = info?.CreationDate;
      metadata.modDate = info?.ModDate;
    } catch {
      // getInfo optional
    }

    const body = this.buildHtml(text);
    let html = this.template.wrapDocument(body, metadata.title);

    if (opts.includeToc) {
      const headings = this.template.extractHeadings(html);
      if (headings.length > 0) {
        const anchored = this.template.anchorHeadings(html);
        const toc = this.template.buildToc(headings);
        html = anchored.replace('<body>', `<body>${toc}`);
      }
    }

    html = this.template.apply(html, opts);

    return { html, metadata };
  }

  private buildHtml(text: string): string {
    const lines = text.split('\n');
    const parts: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (this.isTableRow(trimmed)) {
        if (!inTable) { inTable = true; tableRows = []; }
        tableRows.push(trimmed);
        continue;
      } else if (inTable) {
        parts.push(this.renderTable(tableRows));
        tableRows = [];
        inTable = false;
      }

      if (/^[A-Z][A-Z\s\d]{3,}$/.test(trimmed) && trimmed.length < 100) {
        parts.push(`<h2>${this.escapeHtml(trimmed)}</h2>`);
      } else if (/^[-•*]\s/.test(trimmed)) {
        const item = trimmed.replace(/^[-•*]\s+/, '');
        parts.push(`<li>${this.escapeHtml(item)}</li>`);
      } else if (trimmed.length > 0) {
        parts.push(`<p>${this.escapeHtml(trimmed)}</p>`);
      }
    }

    if (inTable && tableRows.length > 0) {
      parts.push(this.renderTable(tableRows));
    }

    return this.wrapLists(parts.join('\n'));
  }

  private isTableRow(line: string): boolean {
    const tabCount = (line.match(/\t/g) || []).length;
    const pipeCount = (line.match(/\|/g) || []).length;
    return tabCount >= 2 || pipeCount >= 2;
  }

  private renderTable(rows: string[]): string {
    if (rows.length === 0) return '';
    const delim = rows[0].includes('\t') ? '\t' : '|';
    const headers = rows[0].split(delim).map(c => `<th>${this.escapeHtml(c.trim())}</th>`);
    const body = rows.slice(1).map(row =>
      '<tr>' + row.split(delim).map(c => `<td>${this.escapeHtml(c.trim())}</td>`).join('') + '</tr>'
    ).join('\n');
    return `<table><thead><tr>${headers.join('')}</tr></thead><tbody>${body}</tbody></table>`;
  }

  private wrapLists(html: string): string {
    return html.replace(/(<li>.*?<\/li>\n?)+/gs, match => `<ul>${match}</ul>`);
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    };
    return text.replace(/[&<>"']/g, c => map[c]);
  }
}