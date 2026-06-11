import sanitizeHtml from 'sanitize-html';

export interface HtmlConverterOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedStyles?: { [index: string]: { [index: string]: RegExp[] } };
  stripComments?: boolean;
  stripScripts?: boolean;
}

export class HtmlConverter {
  private options: Required<HtmlConverterOptions>;

  private static readonly DEFAULT_ALLOWED_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'pre', 'code',
    'div', 'span',
    'sup', 'sub'
  ];

  private static readonly DEFAULT_ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'th': ['colspan', 'rowspan', 'scope'],
    'td': ['colspan', 'rowspan'],
    'div': ['class'],
    'span': ['class'],
    'code': ['class'],
    'pre': ['class']
  };

  constructor(options: HtmlConverterOptions = {}) {
    this.options = {
      allowedTags: options.allowedTags ?? HtmlConverter.DEFAULT_ALLOWED_TAGS,
      allowedAttributes: options.allowedAttributes ?? HtmlConverter.DEFAULT_ALLOWED_ATTRIBUTES,
      allowedStyles: options.allowedStyles ?? {},
      stripComments: options.stripComments ?? true,
      stripScripts: options.stripScripts ?? true
    };
  }

  convert(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    let result = html;

    // Strip comments if enabled
    if (this.options.stripComments) {
      result = result.replace(/<!--[\s\S]*?-->/g, '');
    }

    // Strip script tags if enabled
    if (this.options.stripScripts) {
      result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
    }

    // Sanitize with allowed tags and attributes
    result = sanitizeHtml(result, {
      allowedTags: this.options.allowedTags,
      allowedAttributes: this.options.allowedAttributes,
      allowedStyles: this.options.allowedStyles
    });

    return result.trim();
  }

  validate(html: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof html !== 'string') {
      errors.push('Input must be a string');
      return { valid: false, errors };
    }

    // Check for unclosed tags
    const openTags = html.match(/<([a-z][a-z0-9]*)[^>]*>/gi) || [];
    const closeTags = html.match(/<\/([a-z][a-z0-9]*)>/gi) || [];

    const openTagNames = openTags.map(t => t.match(/<([a-z][a-z0-9]*)/)![1].toLowerCase());
    const closeTagNames = closeTags.map(t => t.match(/\/([a-z][a-z0-9]*)/)![1].toLowerCase());

    for (const name of openTagNames) {
      if (!['br', 'hr', 'img', 'input'].includes(name)) {
        if (!closeTagNames.includes(name)) {
          errors.push(`Unclosed tag: <${name}>`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  minify(html: string): string {
    if (!html) return '';
    return html
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
  }
}