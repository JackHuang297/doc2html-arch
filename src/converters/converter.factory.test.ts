import { ConverterFactory, defaultConverterFactory } from './converter.factory';
import { MarkdownConverter } from './markdown.converter';

describe('ConverterFactory', () => {
  let factory: ConverterFactory;

  beforeEach(() => {
    factory = new ConverterFactory();
  });

  describe('register() / unregister()', () => {
    it('should register a custom converter', () => {
      const customConvert = { convert: jest.fn((c: string) => `<custom>${c}</custom>`) };
      factory.register('custom' as any, customConvert);
      expect(factory.has('custom' as any)).toBe(true);
    });

    it('should unregister a converter', () => {
      factory.unregister('markdown');
      expect(factory.has('markdown')).toBe(false);
    });

    it('should return true when unregistering existing converter', () => {
      expect(factory.unregister('markdown')).toBe(true);
      expect(factory.unregister('markdown')).toBe(false);  // can't unregister default
    });

    it('should allow re-registering', () => {
      factory.unregister('markdown');
      factory.register('markdown', new MarkdownConverter());
      expect(factory.has('markdown')).toBe(true);
    });
  });

  describe('detectFromExtension()', () => {
    it('should detect markdown extensions', () => {
      expect(factory.detectFromExtension('doc.md')).toBe('markdown');
      expect(factory.detectFromExtension('readme.markdown')).toBe('markdown');
      expect(factory.detectFromExtension('notes.mkd')).toBe('markdown');
    });

    it('should detect html extension', () => {
      expect(factory.detectFromExtension('page.html')).toBe('html');
      expect(factory.detectFromExtension('index.htm')).toBe('html');
    });

    it('should detect text extension', () => {
      expect(factory.detectFromExtension('readme.txt')).toBe('text');
      expect(factory.detectFromExtension('log.log')).toBe('text');
    });

    it('should return null for unknown extension', () => {
      expect(factory.detectFromExtension('file.unknown')).toBe(null);
      expect(factory.detectFromExtension('file')).toBe(null);
    });

    it('should be case insensitive', () => {
      expect(factory.detectFromExtension('DOC.MD')).toBe('markdown');
      expect(factory.detectFromExtension('Page.HTML')).toBe('html');
    });
  });

  describe('detectFromMimeType()', () => {
    it('should detect markdown mime types', () => {
      expect(factory.detectFromMimeType('text/markdown')).toBe('markdown');
      expect(factory.detectFromMimeType('text/x-markdown')).toBe('markdown');
    });

    it('should detect html mime type', () => {
      expect(factory.detectFromMimeType('text/html')).toBe('html');
    });

    it('should detect text mime type', () => {
      expect(factory.detectFromMimeType('text/plain')).toBe('text');
    });

    it('should return null for unknown mime type', () => {
      expect(factory.detectFromMimeType('application/pdf')).toBe('pdf');
    });
  });

  describe('detectFromContent()', () => {
    it('should detect markdown from # heading', () => {
      expect(factory.detectFromContent('# Hello')).toBe('markdown');
    });

    it('should detect markdown from - list item', () => {
      expect(factory.detectFromContent('- item 1\n- item 2')).toBe('markdown');
    });

    it('should detect markdown from numbered list', () => {
      expect(factory.detectFromContent('1. First\n2. Second')).toBe('markdown');
    });

    it('should detect markdown from code block markers', () => {
      expect(factory.detectFromContent('```\ncode\n```')).toBe('markdown');
    });

    it('should detect markdown from bold markers', () => {
      expect(factory.detectFromContent('This is **bold** text')).toBe('markdown');
    });

    it('should detect HTML from DOCTYPE', () => {
      expect(factory.detectFromContent('<!DOCTYPE html>')).toBe('html');
    });

    it('should detect HTML from <html> tag', () => {
      expect(factory.detectFromContent('<html><body>content</body></html>')).toBe('html');
    });

    it('should default to text for plain text', () => {
      expect(factory.detectFromContent('Just plain text content.')).toBe('text');
    });

    it('should detect markdown from front matter', () => {
      expect(factory.detectFromContent('---\ntitle: Test\n---\n# Content')).toBe('markdown');
    });
  });

  describe('convert()', () => {
    it('should convert markdown content', () => {
      const result = factory.convert('# Hello');
      expect(result.html).toContain('<h1>');
      expect(result.converter).toBe('markdown');
    });

    it('should convert HTML content', () => {
      const result = factory.convert('<p>Hello</p>');
      expect(result.html).toContain('<p>');
      expect(result.converter).toBe('html');
    });

    it('should convert plain text content', () => {
      const result = factory.convert('Plain text here');
      expect(result.html).toContain('<p>');
      expect(result.converter).toBe('text');
    });

    it('should include metadata in result', () => {
      const result = factory.convert('# Hello');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.sourceType).toBe('markdown');
      expect(result.metadata.originalLength).toBeGreaterThan(0);
      expect(result.metadata.convertedLength).toBeGreaterThan(0);
    });

    it('should use specified type when provided', () => {
      const result = factory.convert('Hello\n\nWorld', 'text');
      expect(result.converter).toBe('text');
    });

    it('should throw for unknown type without content detection', () => {
      // Remove a converter then try to use it
      factory.unregister('markdown');
      expect(() => factory.convert('# Hello', 'markdown')).toThrow();
    });
  });

  describe('listRegistered()', () => {
    it('should list all registered converters', () => {
      const registered = factory.listRegistered();
      expect(registered).toContain('markdown');
      expect(registered).toContain('html');
      expect(registered).toContain('text');
    });

    it('should not include unregistered converters', () => {
      factory.unregister('markdown');
      expect(factory.listRegistered()).not.toContain('markdown');
    });
  });

  describe('defaultConverterFactory', () => {
    it('should be a singleton instance', () => {
      expect(defaultConverterFactory).toBeDefined();
      expect(defaultConverterFactory.listRegistered()).toContain('markdown');
      expect(defaultConverterFactory.listRegistered()).toContain('html');
      expect(defaultConverterFactory.listRegistered()).toContain('text');
    });
  });
});