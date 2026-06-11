import { OutputOptions, mergeOptions } from './output.options';
import { ConverterTemplate } from '../templates/converter.template';

export interface DocxMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  creationDate?: Date;
}

export interface DocxConverterResult {
  html: string;
  metadata: DocxMetadata;
}

export type DocxSource = Buffer | ArrayBuffer | string;

export class DocxConverter {
  private template: ConverterTemplate;

  constructor() {
    this.template = new ConverterTemplate();
  }

  async convert(
    source: DocxSource,
    options?: Partial<OutputOptions>
  ): Promise<DocxConverterResult> {
    const opts = mergeOptions(options);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AdmZip = require('adm-zip');

    const zipBuffer = Buffer.isBuffer(source)
      ? source
      : source instanceof ArrayBuffer
        ? Buffer.from(source)
        : Buffer.from(source, 'base64');

    const zip = new AdmZip(zipBuffer);
    const docXml = zip.readAsText('word/document.xml');

    if (!docXml) {
      throw new Error('Could not read word/document.xml from DOCX file');
    }

    const { metadata, bodyHtml } = this.parseDocXml(docXml);
    let html = this.template.wrapDocument(bodyHtml, metadata.title);

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

  private parseDocXml(xml: string): { metadata: DocxMetadata; bodyHtml: string } {
    const metadata: DocxMetadata = {};
    const parts: string[] = [];
    let listBuffer: string[] = [];
    let currentListType: 'ul' | 'ol' = 'ul';

    // Simple regex-based XML parsing (no DOM parser dependency)
    // Extract core properties from app.xml / core.xml if available

    // Remove XML declaration and namespaces
    const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/i);
    if (!bodyMatch) {
      return { metadata, bodyHtml: '<p>Empty document</p>' };
    }

    const body = bodyMatch[1];

    // Split into paragraph and table elements
    const elements = body.split(/(?=<w:p[>\s])/i).filter(s => s.trim());

    for (const element of elements) {
      const trimmed = element.trim();
      if (!trimmed) continue;

      if (/^<w:p[>\s]/i.test(trimmed)) {
        const rendered = this.renderParagraph(trimmed, parts, listBuffer, () => {
          // flush list
          if (listBuffer.length > 0) {
            const tag = currentListType;
            parts.push(`<${tag}>${listBuffer.join('')}</${tag}>`);
            listBuffer = [];
          }
        }, (type) => { currentListType = type; });
        if (rendered) {
          // list item already buffered in renderParagraph
        } else {
          // flush happens inside
        }
      } else if (/^<w:tbl/i.test(trimmed)) {
        // flush any list first
        if (listBuffer.length > 0) {
          parts.push(`<${currentListType}>${listBuffer.join('')}</${currentListType}>`);
          listBuffer = [];
        }
        const tableHtml = this.renderTable(trimmed);
        if (tableHtml) parts.push(tableHtml);
      }
    }

    // flush remaining list
    if (listBuffer.length > 0) {
      parts.push(`<${currentListType}>${listBuffer.join('')}</${currentListType}>`);
    }

    return { metadata, bodyHtml: parts.join('\n') };
  }

  private renderParagraph(
    xml: string,
    parts: string[],
    listBuffer: string[],
    flushList: () => void,
    setListType: (t: 'ul' | 'ol') => void
  ): boolean {
    // Extract text content
    const texts = (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || []).map((t: string) =>
      t.replace(/<[^>]+>/g, '')
    );
    const text = texts.join('').trim();

    // Check paragraph style
    const styleMatch = xml.match(/<w:pStyle[^>]*w:val="([^"]*)"/i);
    const styleId = styleMatch ? styleMatch[1].toLowerCase() : '';

    // Check if it's a list item (list paragraph or has numPr)
    const isList = styleId.includes('list') || xml.includes('<w:numPr');
    const isHeading = styleId.includes('heading') || /^heading/i.test(styleId);

    if (isHeading) {
      flushList();
      const levelMatch = styleId.match(/heading(\d)/i);
      const level = levelMatch ? parseInt(levelMatch[1], 10) : 2;
      if (text) parts.push(`<h${level}>${this.escapeHtml(text)}</h${level}>`);
      return true;
    }

    if (isList) {
      if (!text) return false;
      const isOrdered = xml.includes('<w:numId');
      setListType(isOrdered ? 'ol' : 'ul');
      listBuffer.push(`<li>${this.escapeHtml(text)}</li>`);
      return true;
    }

    // Regular paragraph
    flushList();
    if (text) parts.push(`<p>${this.escapeHtml(text)}</p>`);
    return true;
  }

  private renderTable(xml: string): string {
    const rows: string[] = [];
    const rowMatches = xml.matchAll(/<w:tr[^>]*>([\s\S]*?)<\/w:tr>/gi);

    for (const rowMatch of rowMatches) {
      const cells: string[] = [];
      const cellMatches = rowMatch[1].matchAll(/<w:tc[^>]*>([\s\S]*?)<\/w:tc>/gi);
      for (const cellMatch of cellMatches) {
        const texts = (cellMatch[1].match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || []).map((t: string) =>
          t.replace(/<[^>]+>/g, '')
        );
        cells.push(`<td>${this.escapeHtml(texts.join(''))}</td>`);
      }
      rows.push(`<tr>${cells.join('')}</tr>`);
    }

    if (rows.length === 0) return '';

    const headerCells = rows[0].replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rows.slice(1).join('')}</tbody></table>`;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    };
    return text.replace(/[&<>"']/g, c => map[c]);
  }
}