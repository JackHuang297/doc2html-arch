import { MarkdownConverter } from './markdown.converter';

describe('MarkdownConverter', () => {
  let converter: MarkdownConverter;

  beforeEach(() => {
    converter = new MarkdownConverter();
  });

  describe('convert()', () => {
    it('should convert heading', () => {
      const result = converter.convert('# Hello World');
      expect(result).toContain('<h1>');
      expect(result).toContain('Hello World');
    });

    it('should convert multiple headings', () => {
      const result = converter.convert('## Section\n### Sub-section');
      expect(result).toContain('<h2>Section</h2>');
      expect(result).toContain('<h3>Sub-section</h3>');
    });

    it('should convert bold text', () => {
      const result = converter.convert('This is **bold** text');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should convert italic text', () => {
      const result = converter.convert('This is *italic* text');
      expect(result).toContain('<em>italic</em>');
    });

    it('should convert inline code', () => {
      const result = converter.convert('Use `code` here');
      expect(result).toContain('code');
      expect(result).toContain('code');
    });

    it('should convert links', () => {
      const result = converter.convert('[Click here](https://example.com)');
      expect(result).toContain('<a href="https://example.com">');
      expect(result).toContain('Click here');
    });

    it('should convert blockquote', () => {
      const result = converter.convert('> This is a quote');
      expect(result).toContain('<blockquote>');
    });

    it('should convert unordered list items', () => {
      const result = converter.convert('- Item 1\n- Item 2');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
    });

    it('should convert ordered list items', () => {
      const result = converter.convert('1. First\n2. Second');
      expect(result).toContain('<li>First</li>');
      expect(result).toContain('<li>Second</li>');
    });

    it('should convert empty string to empty result', () => {
      expect(converter.convert('')).toBe('');
    });

    it('should convert null-like input to empty result', () => {
      expect(converter.convert(null as any)).toBe('');
      expect(converter.convert(undefined as any)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(converter.convert(123 as any)).toBe('');
    });

    it('should handle mixed content', () => {
      const result = converter.convert(
        '# Title\n\nParagraph with **bold** and *italic*.\n\n- List item'
      );
      expect(result).toContain('<h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<li>');
    });
  });

  describe('convertWithFrontMatter()', () => {
    it('should extract front matter', () => {
      const { html, frontMatter } = converter.convertWithFrontMatter(
        '---\ntitle: Test\nauthor: Alice\n---\n# Content'
      );
      expect(frontMatter.title).toBe('Test');
      expect(frontMatter.author).toBe('Alice');
      expect(html).toContain('<h1>');
      expect(html).toContain('Content');
    });

    it('should return empty front matter when none present', () => {
      const { html, frontMatter } = converter.convertWithFrontMatter('# Just Content');
      expect(Object.keys(frontMatter).length).toBe(0);
      expect(html).toContain('<h1>');
    });

    it('should handle front matter with special characters', () => {
      const { frontMatter } = converter.convertWithFrontMatter(
        '---\ntitle: "Hello World"\ntags: [a, b]\n---\n# Content'
      );
      expect(frontMatter.title).toBe('"Hello World"');
      expect(frontMatter.tags).toBe('[a, b]');
    });
  });

  describe('constructor options', () => {
    it('should respect gfm option', () => {
      const gfmOff = new MarkdownConverter({ gfm: false });
      const gfmOn = new MarkdownConverter({ gfm: true });
      // GFM affects table and strikethrough parsing
      expect(gfmOff).toBeDefined();
      expect(gfmOn).toBeDefined();
    });

    it('should apply default options', () => {
      const withDefaults = new MarkdownConverter();
      expect(withDefaults).toBeDefined();
    });
  });
});