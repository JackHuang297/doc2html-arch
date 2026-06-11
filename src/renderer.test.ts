import { DocumentRenderer, RenderOptions } from './renderer';

describe('DocumentRenderer', () => {
  let renderer: DocumentRenderer;

  beforeEach(() => {
    renderer = new DocumentRenderer();
  });

  describe('Basic Rendering', () => {
    it('should render a simple document to HTML', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test Document',
        sections: []
      };

      const result = await renderer.render(doc);
      
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<title>Test Document</title>');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.size).toBeGreaterThan(0);
    });

    it('should include viewport meta tag', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('viewport');
      expect(result.html).toContain('width=device-width');
    });

    it('should apply theme if specified', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      const options: RenderOptions = { theme: 'dark' };
      const result = await renderer.render(doc, options);
      
      expect(result.html).toContain('themes/dark.css');
      expect(result.metadata.theme).toBe('dark');
    });
  });

  describe('Section Rendering', () => {
    it('should render sections with titles', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          {
            id: 'sec1',
            title: 'Section One',
            content: []
          }
        ]
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('Section One');
      expect(result.html).toContain('section');
    });

    it('should generate section IDs', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          {
            id: 'custom-section',
            title: 'My Section',
            content: []
          }
        ]
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('id="custom-section"');
    });
  });

  describe('Content Rendering', () => {
    it('should render simple string content as paragraphs', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          {
            id: 'sec1',
            title: 'Test Section',
            content: ['Hello world']
          }
        ]
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('<p>Hello world</p>');
    });

    it('should handle HTML escaping', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          {
            id: 'sec1',
            content: ['<script>alert("xss")</script>']
          }
        ]
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>alert');
    });

    it('should render heading objects', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          {
            id: 'sec1',
            content: [
              { type: 'heading', level: 3, text: 'Heading' }
            ]
          }
        ]
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('<h3>Heading</h3>');
    });
  });
});
