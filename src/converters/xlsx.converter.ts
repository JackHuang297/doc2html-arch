import * as XLSX from 'xlsx';
import { IAsyncConverter } from './converter.factory';
import { OutputOptions } from './output.options';

export class XlsxConverter implements IAsyncConverter {
  async convert(
    source: Buffer | ArrayBuffer | string,
    _options?: Partial<OutputOptions>
  ): Promise<{ html: string; metadata: any }> {
    const buf = Buffer.isBuffer(source)
      ? source
      : typeof source === 'string'
      ? Buffer.from(source)
      : Buffer.from(new Uint8Array(source));

    const workbook = XLSX.read(buf, { type: 'buffer', cellStyles: true });

    const sheets: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawData: unknown[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true }) as unknown[];
      const data = (rawData as string[][]) ?? [];

      if (data.length === 0) {
        sheets.push(`<div class="xlsx-sheet"><h3>${this.escapeHtml(sheetName)}</h3><p class="xlsx-empty">No data</p></div>`);
        continue;
      }

      const headers = data[0] ?? [];
      const rows = data.slice(1);

      const _colCount = headers.length; void _colCount;
      const colWidths: number[] = headers.map((h, i) => {
        const maxLen = Math.max(
          this.strLen(String(h ?? '')),
          ...rows.map(r => this.strLen(String(r[i] ?? '')))
        );
        return Math.min(Math.max(maxLen, 8), 40);
      });

      const totalWidth = colWidths.reduce((a, b) => a + b, 0);

      let table = `<table class="xlsx-table" style="width:${totalWidth}ch;border-collapse:collapse;">`;
      // Header row
      table += '<thead><tr>';
      for (let i = 0; i < headers.length; i++) {
        table += `<th style="width:${colWidths[i]}ch">${this.escapeHtml(String(headers[i] ?? ''))}</th>`;
      }
      table += '</tr></thead>';
      // Data rows
      table += '<tbody>';
      for (const row of rows) {
        // Skip fully blank rows
        if (row.every(cell => String(cell ?? '').trim() === '')) continue;
        table += '<tr>';
        for (let i = 0; i < headers.length; i++) {
          table += `<td>${this.escapeHtml(String(row[i] ?? ''))}</td>`;
        }
        table += '</tr>';
      }
      table += '</tbody></table>';
      sheets.push(`<div class="xlsx-sheet"><h3>${this.escapeHtml(sheetName)}</h3>${table}</div>`);
    }

    let html = this.wrap(sheets.join('\n'), workbook.SheetNames.length, _options);
    return { html, metadata: { sheetCount: workbook.SheetNames.length, sheets: workbook.SheetNames } };
  }

  private wrap(content: string, sheetCount: number, options?: Partial<OutputOptions>): string {
    const title = options?.title ?? 'Spreadsheet';
    const lang = options?.lang ?? 'en';

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${this.escapeHtml(title)}</title>
<style>
  .xlsx-table { font-size: 14px; }
  .xlsx-table th { background: #f0f0f0; font-weight: 600; text-align: left;
                    border: 1px solid #ccc; padding: 6px 10px; white-space: nowrap; }
  .xlsx-table td { border: 1px solid #ddd; padding: 5px 10px;
                   max-width: ${40}ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .xlsx-table tr:nth-child(even) td { background: #fafafa; }
  .xlsx-sheet { margin-bottom: 2rem; }
  .xlsx-sheet h3 { margin: 0 0 0.5rem 0; font-size: 16px; color: #333; }
  .xlsx-empty { color: #999; font-style: italic; }
</style>
</head>
<body>
<div class="xlsx-document" data-sheet-count="${sheetCount}">
${content}
</div>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private strLen(str: string): number {
    return str.length;
  }
}