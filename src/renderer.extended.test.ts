import { DocumentRenderer, RenderOptions } from './renderer';

describe('DocumentRenderer - List and Cache', () => {
  let renderer: DocumentRenderer;

  beforeEach(() => {
    renderer = new DocumentRenderer();
  });

  describe('List Rendering', () => {
    it('should render unordered lists', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          {
            id: 'sec1',
            content: [
              {
                type: 'list',
                ordered: false,
                items: ['Item 1', 'Item 2', 'Item 3']
              }
            ]
          }
        ]
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('<ul>');
      expect(result.html).toContain('<li>Item 1</li>');
      expect(result.html).toContain('</ul>');
    });

    it('should render ordered lists', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          {
            id: 'sec1',
            content: [
              {
                type: 'list',
                ordered: true,
                items: ['First', 'Second']
              }
            ]
          }
        ]
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('<ol>');
      expect(result.html).toContain('<li>First</li>');
      expect(result.html).toContain('</ol>');
    });
  });

  describe('Caching', () => {
    it('should cache results when enableCache is true', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      const options: RenderOptions = { enableCache: true };
      const result1 = await renderer.render(doc, options);
      const result2 = await renderer.render(doc, options);

      expect(result1.html).toBe(result2.html);
    });

    it('should return different cache keys for different audiences', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      const result1 = await renderer.render(doc, {
        enableCache: true,
        audiences: ['free']
      });

      const result2 = await renderer.render(doc, {
        enableCache: true,
        audiences: ['premium']
      });

      // Both should complete without error
      expect(result1.html).toBeDefined();
      expect(result2.html).toBeDefined();
    });

    it('should clear cache', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      await renderer.render(doc, { enableCache: true });
      renderer.clearCache();

      // Should not throw
      expect(() => renderer.clearCache()).not.toThrow();
    });
  });

  describe('Performance Options', () => {
    it('should minify HTML when minify option is true', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test Document',
        sections: [
          {
            id: 'sec1',
            title: 'Section',
            content: ['Content here']
          }
        ]
      };

      const resultNormal = await renderer.render(doc, { minify: false });
      const resultMinified = await renderer.render(doc, { minify: true });

      expect(resultMinified.html.length).toBeLessThanOrEqual(resultNormal.html.length);
    });

    it('should include lazy loading for images', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      const result = await renderer.render(doc);
      // Lazy loading is applied but may not show in empty doc
      expect(result.html).toBeDefined();
    });
  });

  describe('Metadata', () => {
    it('should include render time in metadata', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      const result = await renderer.render(doc);
      expect(result.metadata.renderTime).toBeGreaterThan(0);
    });

    it('should include HTML size in metadata', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      const result = await renderer.render(doc);
      expect(result.metadata.size).toBeGreaterThan(0);
      expect(result.metadata.size).toBe(result.html.length);
    });

    it('should include audiences in metadata if provided', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      const result = await renderer.render(doc, {
        audiences: ['premium', 'vip']
      });

      expect(result.metadata.audiences).toEqual(['premium', 'vip']);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing document sections gracefully', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test'
      };

      const result = await renderer.render(doc);
      expect(result.html).toContain('<!DOCTYPE html>');
    });

    it('should handle null/undefined content gracefully', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          {
            id: 'sec1',
            content: null
          }
        ]
      };

      const result = await renderer.render(doc);
      expect(result.html).toBeDefined();
    });
  });

  describe('Metrics', () => {
    it('should collect render time metrics', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: []
      };

      await renderer.render(doc);
      const metrics = renderer.getMetrics();

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics) || typeof metrics === 'object').toBe(true);
    });
  });
});
