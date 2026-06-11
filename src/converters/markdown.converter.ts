import { marked, MarkedOptions } from 'marked';

export interface MarkdownConverterOptions {
  breaks?: boolean;       // Convert \n to <br>
  gfm?: boolean;           // GitHub Flavored Markdown
  tables?: boolean;        // Tables support
  codeBlocks?: boolean;    // Code blocks with syntax highlighting hint
}

export class MarkdownConverter {
  private options: Required<MarkdownConverterOptions>;

  constructor(options: MarkdownConverterOptions = {}) {
    this.options = {
      breaks: options.breaks ?? true,
      gfm: options.gfm ?? true,
      tables: options.tables ?? true,
      codeBlocks: options.codeBlocks ?? true
    };
  }

  convert(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    const opts: MarkedOptions = {
      gfm: this.options.gfm,
      breaks: this.options.breaks
    };

    let html = marked.parse(markdown, opts) as string;

    // Post-process: wrap code blocks for styling
    if (this.options.codeBlocks) {
      html = html.replace(
        /<code>([\s\S]*?)<\/code>/g,
        (_, code) => {
          if (!code.startsWith('<pre')) {
            return `<code class="code-inline">${code}</code>`;
          }
          return `<code>${code}</code>`;
        }
      );
    }

    return html.trim();
  }

  convertWithFrontMatter(markdown: string): { html: string; frontMatter: Record<string, string> } {
    const frontMatter: Record<string, string> = {};
    let content = markdown;

    const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
    if (fmMatch) {
      const lines = fmMatch[1].split('\n');
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          frontMatter[key] = value;
        }
      }
      content = markdown.slice(fmMatch[0].length);
    }

    return {
      html: this.convert(content),
      frontMatter
    };
  }
}