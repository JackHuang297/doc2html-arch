import { DocumentRenderer } from './renderer';

describe('DocumentRenderer', () => {
  let renderer: DocumentRenderer;

  beforeEach(() => {
    renderer = new DocumentRenderer();
  });

  describe('Basic Rendering', () => {
    it('should render a document to HTML', () => {
      const doc = {
        id: 'doc1',
        title: 'Test Document',
        sections: [
          { heading: 'Section 1', content: 'Content 1' }
        ]
      };

      const html = renderer.render(doc).html;
      expect(html).toContain('<html');
      expect(html).toContain('Test Document');
    });

    it('should render empty document', () => {
      const doc = {
        id: 'empty',
        title: 'Empty',
        sections: []
      };

      const html = renderer.render(doc).html;
      expect(html).toBeDefined();
    });

    it('should include document title', () => {
      const doc = {
        id: 'doc1',
        title: 'My Title',
        sections: []
      };

      const html = renderer.render(doc).html;
      expect(html).toContain('My Title');
    });
  });

  describe('Section Rendering', () => {
    it('should render multiple sections', () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          { heading: 'Section 1', content: 'Content 1' },
          { heading: 'Section 2', content: 'Content 2' }
        ]
      };

      const html = renderer.render(doc).html;
      expect(html).toContain('Section 1');
      expect(html).toContain('Section 2');
    });

    it('should render section headings', () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [
          { heading: 'My Heading', content: 'Content' }
        ]
      };

      const html = renderer.render(doc).html;
      expect(html).toContain('My Heading');
    });
  });

  describe('Styling', () => {
    it('should include CSS styles', () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [],
        styles: 'body { color: blue; }'
      };

      const html = renderer.render(doc).html;
      expect(html).toContain('<style');
    });

    it('should render custom theme', () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [],
        theme: 'dark'
      };

      const html = renderer.render(doc).html;
      expect(html).toBeDefined();
    });
  });

  describe('Meta Tags', () => {
    it('should include meta tags', () => {
      const doc = {
        id: 'doc1',
        title: 'Test',
        sections: [],
        meta: {
          description: 'Test description',
          keywords: 'test, document'
        }
      };

      const html = renderer.render(doc).html;
      expect(html).toContain('meta');
    });
  });
});
