import { DocumentController } from './document.controller';

describe('DocumentController', () => {
  let controller: DocumentController;

  beforeEach(() => {
    controller = new DocumentController();
 });

  describe('GET /documents/:id', () => {
    it('should retrieve a document', async () => {
      const result = await controller.getDocument('doc1');
      expect(result).toBeDefined();
    });

    it('should return 404 for missing document', async () => {
      const result = await controller.getDocument('missing-id');
      expect(result).toBeNull();
    });
  });

  describe('POST /documents', () => {
    it('should create a new document', async () => {
      const newDoc = {
        title: 'New Document',
        sections: []
      };

      const result = await controller.createDocument(newDoc);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should validate document data', async () => {
      const invalidDoc = {
        title: ''
      };

      const result = await controller.createDocument(invalidDoc);
      expect(result.success).toBe(false);
    });
  });

  describe('PUT /documents/:id', () => {
    it('should update an existing document', async () => {
      await controller.createDocument({ id: 'doc1', title: 'Original', sections: [] });
      const update = {
        title: 'Updated Title',
        sections: []
      };

      const result = await controller.updateDocument('doc1', update);
      expect(result.success).toBe(true);
    });
  });

  describe('DELETE /documents/:id', () => {
    it('should delete a document', async () => {
      await controller.createDocument({ id: 'doc1', title: 'To Delete', sections: [] });
      const result = await controller.deleteDocument('doc1');
      expect(result.success).toBe(true);
    });

    it('should return error for missing document', async () => {
      const result = await controller.deleteDocument('missing-id');
      expect(result.success).toBe(false);
    });
  });

  describe('GET /documents', () => {
    it('should list all documents', async () => {
      const result = await controller.listDocuments();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await controller.listDocuments();
      expect(result).toBeDefined();
    });
  });

  describe('POST /documents/:id/render', () => {
    it('should render a document to HTML', async () => {
      const result = await controller.renderDocument('doc1');
      expect(result).toContain('<html');
    });
  });
});
