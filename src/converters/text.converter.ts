export interface TextConverterOptions {
  preserveWhitespace?: boolean;
  detectLinks?: boolean;
  detectEmails?: boolean;
  paragraphBreak?: number;  // Number of newlines to start a new paragraph
}

export class TextConverter {
  private options: Required<TextConverterOptions>;

  // Regex patterns
  private static readonly URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`]+/gi;
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  constructor(options: TextConverterOptions = {}) {
    this.options = {
      preserveWhitespace: options.preserveWhitespace ?? true,
      detectLinks: options.detectLinks ?? true,
      detectEmails: options.detectEmails ?? true,
      paragraphBreak: options.paragraphBreak ?? 2
    };
  }

  convert(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let result = this.escapeHtml(text);

    // Detect and link emails
    if (this.options.detectEmails) {
      result = result.replace(
        TextConverter.EMAIL_REGEX,
        email => `<a href="mailto:${email}">${email}</a>`
      );
    }

    // Detect and link URLs
    if (this.options.detectLinks) {
      result = result.replace(
        TextConverter.URL_REGEX,
        url => {
          const display = url.length > 60 ? url.slice(0, 57) + '...' : url;
          return `<a href="${url}" target="_blank" rel="noopener">${display}</a>`;
        }
      );
    }

    // Convert newlines to paragraphs or <br>
    result = this.processNewlines(result);

    return result;
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

  private processNewlines(text: string): string {
    const paragraphs = text.split(/\n{2,}/);
    return paragraphs
      .map(p => p.replace(/\n/g, '<br>\n'))
      .map(p => `<p>${p.trim()}</p>`)
      .join('\n');
  }

  toList(text: string, ordered = false): string {
    const items = text
      .split(/\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const tag = ordered ? 'ol' : 'ul';
    return `<${tag}>\n${items.map(item => `  <li>${item}</li>`).join('\n')}\n</${tag}>`;
  }

  extractUrls(text: string): string[] {
    return (text.match(TextConverter.URL_REGEX) || []).filter(Boolean);
  }
}