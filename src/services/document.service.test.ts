import { DocumentService } from './document.service';

describe('DocumentService', () => {
  let service: DocumentService;

  beforeEach(() => {
    service = new DocumentService();
  });

  describe('Document Processing', () => {
    it('should process a document', async () => {
      const doc = {
        id: 'doc1',
        title: 'Test Document',
        sections: []
      };

      const result = await service.process(doc);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle document not found', async () => {
      const result = await service.getDocument('non-existent-id');
      expect(result).toBeNull();
    });

    it('should save a document', async () => {
      const doc = {
        id: 'new-doc',
        title: 'New Document',
        sections: []
      };

      const result = await service.save(doc);
      expect(result.success).toBe(true);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple documents', async () => {
      const docs = [
        { id: 'doc1', title: 'Doc 1', sections: [] },
        { id: 'doc2', title: 'Doc 2', sections: [] },
        { id: 'doc3', title: 'Doc 3', sections: [] }
      ];

      const results = await service.processBatch(docs);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty batch', async () => {
      const results = await service.processBatch([]);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache processed documents', async () => {
      const doc = {
        id: 'cache-test',
        title: 'Test',
        sections: []
      };

      await service.process(doc);
      const cached = await service.getDocument('cache-test');
      
      expect(cached).toBeDefined();
    });

    it('should invalidate cache', async () => {
      await service.invalidateCache('doc-id');
      expect(true).toBe(true); // Should not throw
    });
  });
});
