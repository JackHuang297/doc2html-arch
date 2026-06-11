import { HtmlConverter } from './html.converter';

describe('HtmlConverter', () => {
  let converter: HtmlConverter;

  beforeEach(() => {
    converter = new HtmlConverter();
  });

  describe('convert()', () => {
    it('should pass through valid HTML', () => {
      const input = '<div><p>Hello <strong>world</strong></p></div>';
      const result = converter.convert(input);
      expect(result).toContain('<div>');
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>world</strong>');
    });

    it('should strip script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = converter.convert(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should strip comments', () => {
      const input = '<p>Hello</p><!-- comment --><div>World</div>';
      const result = converter.convert(input);
      expect(result).not.toContain('<!--');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<div>World</div>');
    });

    it('should handle empty string', () => {
      expect(converter.convert('')).toBe('');
    });

    it('should handle null-like input', () => {
      expect(converter.convert(null as any)).toBe('');
      expect(converter.convert(undefined as any)).toBe('');
    });

    it('should allow safe tags by default', () => {
      const input = '<h1>Title</h1><p>Paragraph</p><ul><li>Item</li></ul>';
      const result = converter.convert(input);
      expect(result).toContain('<h1>');
      expect(result).toContain('<p>');
      expect(result).toContain('<ul>');
    });

    it('should remove disallowed tags', () => {
      const input = '<p>Hello</p><iframe src="evil.com"></iframe>';
      const result = converter.convert(input);
      expect(result).not.toContain('<iframe>');
      expect(result).toContain('<p>');
    });

    it('should preserve allowed attributes', () => {
      const input = '<a href="https://example.com" title="Example">Link</a>';
      const result = converter.convert(input);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('title="Example"');
    });

    it('should remove disallowed attributes', () => {
      const input = '<img src="pic.jpg" onerror="alert(1)">';
      const result = converter.convert(input);
      expect(result).toContain('src="pic.jpg"');
      expect(result).not.toContain('onerror');
    });

    it('should strip onclick handlers', () => {
      const input = '<div onclick="bad()">content</div>';
      const result = converter.convert(input);
      expect(result).not.toContain('onclick');
    });

    it('should handle mixed safe and unsafe content', () => {
      const input = '<p>Safe</p><script>evil()</script><a href="ok">Link</a>';
      const result = converter.convert(input);
      expect(result).toContain('<p>Safe</p>');
      expect(result).toContain('<a href="ok">');
      expect(result).not.toContain('<script>');
    });
  });

  describe('validate()', () => {
    it('should validate properly structured HTML', () => {
      const result = converter.validate('<div><p>Hello</p></div>');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unclosed tags', () => {
      const result = converter.validate('<div><p>Hello</div>');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept null-like input', () => {
      const result = converter.validate(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should allow self-closing tags', () => {
      const result = converter.validate('<br><hr><img src="x.jpg">');
      expect(result.valid).toBe(true);
    });

    it('should detect multiple unclosed tags', () => {
      const result = converter.validate('<div><span><p>Text</span></p>');
      expect(result.valid).toBe(false);
    });
  });

  describe('minify()', () => {
    it('should remove whitespace between tags', () => {
      const input = '<div>\n  <p>  Hello </p>\n</div>';
      const result = converter.minify(input);
      expect(result).not.toContain('\n');
      expect(result).toContain('<div>');
      expect(result).toContain('<p>');
    });

    it('should strip comments during minification', () => {
      const input = '<div><!-- comment --><p>Text</p></div>';
      const result = converter.minify(input);
      expect(result).not.toContain('<!--');
    });

    it('should handle empty string', () => {
      expect(converter.minify('')).toBe('');
    });
  });

  describe('constructor options', () => {
    it('should accept custom allowed tags', () => {
      const custom = new HtmlConverter({ allowedTags: ['p', 'br'] });
      const result = custom.convert('<p>Para<br>break</p><div>Block</div>');
      expect(result).toContain('<p>');
      expect(result).not.toContain('<div>');
    });

    it('should accept stripComments option', () => {
      const noComments = new HtmlConverter({ stripComments: true });
      const withComments = new HtmlConverter({ stripComments: false });
      const input = '<p>Text</p><!-- comment -->';
      expect(noComments.convert(input)).not.toContain('<!--');
      expect(withComments.convert(input)).not.toContain('<!--'); // still stripped by sanitize-html
    });

    it('should accept stripScripts option', () => {
      const noScripts = new HtmlConverter({ stripScripts: true });
      const input = '<p>Text</p><script>evil()</script>';
      expect(noScripts.convert(input)).not.toContain('<script>');
    });
  });
});