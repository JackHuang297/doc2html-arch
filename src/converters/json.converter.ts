import { OutputOptions, mergeOptions } from './output.options';
import { ConverterTemplate } from '../templates/converter.template';

export interface JsonConverterResult {
  html: string;
  metadata: {
    nodeCount: number;
    depth: number;
    type: string;
  };
}

export class JsonConverter {
  private template: ConverterTemplate;

  constructor() {
    this.template = new ConverterTemplate();
  }

  convert(
    json: string | object,
    options?: Partial<OutputOptions>
  ): JsonConverterResult {
    const opts = mergeOptions(options);

    let parsed: any;
    if (typeof json === 'string') {
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error('Invalid JSON string');
      }
    } else {
      parsed = json;
    }

    const { html, stats } = this.renderNode(parsed, 0, true);
    let fullHtml = this.template.wrapDocument(html, 'JSON Data');

    if (opts.customCss || opts.theme !== 'none') {
      fullHtml = this.template.apply(fullHtml, opts);
    }

    return {
      html: fullHtml,
      metadata: {
        nodeCount: stats.nodeCount,
        depth: stats.maxDepth,
        type: Array.isArray(parsed) ? 'array' : typeof parsed
      }
    };
  }

  private renderNode(node: any, depth: number, isRoot = false): { html: string; stats: { nodeCount: number; maxDepth: number } } {
    let html = '';
    let nodeCount = 1;
    let maxDepth = depth;

    if (node === null) {
      html = '<span class="json-null">null</span>';
    } else if (node === undefined) {
      html = '<span class="json-undefined">undefined</span>';
    } else if (typeof node === 'boolean') {
      html = `<span class="json-boolean">${node}</span>`;
    } else if (typeof node === 'number') {
      html = `<span class="json-number">${node}</span>`;
    } else if (typeof node === 'string') {
      const display = node.length > 200 ? node.slice(0, 200) + '...' : node;
      html = `<span class="json-string">"${this.escapeHtml(display)}"</span>`;
    } else if (Array.isArray(node)) {
      if (node.length === 0) {
        html = '<span class="json-bracket">[]</span>';
      } else {
        const items = node.map((item: any) => {
          const child = this.renderNode(item, depth + 1);
          nodeCount += child.stats.nodeCount;
          maxDepth = Math.max(maxDepth, child.stats.maxDepth);
          return `<li class="json-item">${child.html}</li>`;
        });
        html = `<span class="json-toggle" onclick="this.parentElement.classList.toggle('collapsed')">▶</span><ul class="json-array">${items.join('')}</ul>`;
      }
    } else if (typeof node === 'object') {
      const keys = Object.keys(node);
      if (keys.length === 0) {
        html = '<span class="json-bracket">{}</span>';
      } else {
        const items = keys.map(key => {
          const value = node[key];
          const child = this.renderNode(value, depth + 1);
          nodeCount += child.stats.nodeCount;
          maxDepth = Math.max(maxDepth, child.stats.maxDepth);
          return `<li class="json-entry"><span class="json-key">"${this.escapeHtml(key)}"</span>: ${child.html}</li>`;
        });
        html = `<span class="json-toggle" onclick="this.parentElement.classList.toggle('collapsed')">▶</span><ul class="json-object">${items.join('')}</ul>`;
      }
    }

    if (isRoot) {
      html = `<div class="json-tree" data-depth="${depth}">${html}</div>`;
    }

    return { html, stats: { nodeCount, maxDepth } };
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    };
    return text.replace(/[&<>"']/g, c => map[c]);
  }

  /**
   * Render JSON as a simple table view (for flat/small objects).
   */
  toTable(json: string | object): string {
    let parsed: any;
    if (typeof json === 'string') {
      parsed = JSON.parse(json);
    } else {
      parsed = json;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return `<pre>${this.escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return '<p>Empty array</p>';
      const headers = Object.keys(parsed[0]);
      const rows = parsed.map(item =>
        '<tr>' + headers.map(h => `<td>${this.escapeHtml(String(item[h] ?? ''))}</td>`).join('') + '</tr>'
      ).join('');
      return `<table><thead><tr>${headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
    }

    const rows = Object.entries(parsed).map(([k, v]) =>
      `<tr><th>${this.escapeHtml(k)}</th><td>${this.escapeHtml(JSON.stringify(v))}</td></tr>`
    ).join('');
    return `<table><tbody>${rows}</tbody></table>`;
  }
}