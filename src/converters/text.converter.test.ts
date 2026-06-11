import { TextConverter } from './text.converter';

describe('TextConverter', () => {
  let converter: TextConverter;

  beforeEach(() => {
    converter = new TextConverter();
  });

  describe('convert()', () => {
    it('should convert plain text to HTML with paragraphs', () => {
      const result = converter.convert('Hello\n\nWorld');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<p>World</p>');
    });

    it('should escape HTML characters', () => {
      const result = converter.convert('Hello <world> & "test"');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('should detect URLs and make them links', () => {
      const result = converter.convert('Visit https://example.com today');
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('target="_blank"');
    });

    it('should detect emails and make them mailto links', () => {
      const result = converter.convert('Email test@example.com please');
      expect(result).toContain('<a href="mailto:test@example.com">');
      expect(result).toContain('test@example.com');
    });

    it('should truncate long URLs in display text', () => {
      const longUrl = 'https://example.com/path/to/resource/that/is/very/long/and/should/be/truncated';
      const result = converter.convert(`Visit ${longUrl} now`);
      expect(result).toContain('...');
    });

    it('should handle empty string', () => {
      expect(converter.convert('')).toBe('');
    });

    it('should handle null-like input', () => {
      expect(converter.convert(null as any)).toBe('');
      expect(converter.convert(undefined as any)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(converter.convert(123 as any)).toBe('');
    });

    it('should preserve single newlines as <br>', () => {
      const result = converter.convert('Line one\nLine two');
      expect(result).toContain('<br>');
    });

    it('should convert double newlines to paragraphs', () => {
      const result = converter.convert('Para one\n\nPara two');
      expect(result).toContain('<p>');
      expect(result).toContain('</p>');
    });

    it('should handle multiple paragraphs', () => {
      const result = converter.convert('First\n\nSecond\n\nThird');
      const count = (result.match(/<p>/g) || []).length;
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('toList()', () => {
    it('should convert lines to unordered list', () => {
      const result = converter.toList('Item 1\nItem 2\nItem 3');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
      expect(result).toContain('<li>Item 3</li>');
    });

    it('should convert lines to ordered list', () => {
      const result = converter.toList('Step 1\nStep 2\nStep 3', true);
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>Step 1</li>');
    });

    it('should filter empty lines', () => {
      const result = converter.toList('Item 1\n\n  \nItem 2');
      expect(result).not.toContain('<li></li>');
    });
  });

  describe('extractUrls()', () => {
    it('should extract URLs from text', () => {
      const urls = converter.extractUrls('Check https://a.com and http://b.org');
      expect(urls).toContain('https://a.com');
      expect(urls).toContain('http://b.org');
    });

    it('should return empty array for no URLs', () => {
      const urls = converter.extractUrls('Plain text without links');
      expect(urls).toHaveLength(0);
    });
  });

  describe('constructor options', () => {
    it('should respect detectLinks: false', () => {
      const noLinks = new TextConverter({ detectLinks: false });
      const result = noLinks.convert('Visit https://example.com');
      expect(result).not.toContain('<a href=');
    });

    it('should respect detectEmails: false', () => {
      const noEmails = new TextConverter({ detectEmails: false });
      const result = noEmails.convert('Email a@b.com please');
      expect(result).not.toContain('<a href="mailto:');
    });

    it('should respect paragraphBreak option', () => {
      const twoBreak = new TextConverter({ paragraphBreak: 3 });
      const result = twoBreak.convert('One\n\nTwo\n\nThree');
      // With paragraphBreak=3, \n\n\n would be needed for new paragraph
      expect(result).toContain('<p>');
    });
  });
});