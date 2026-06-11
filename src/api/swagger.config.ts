export interface SwaggerEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description?: string;
  tags?: string[];
  requestBody?: {
    description?: string;
    required?: boolean;
    contentType?: string;
    schema?: Record<string, any>;
    example?: any;
  };
  parameters?: SwaggerParameter[];
  responses: Record<string, SwaggerResponse>;
}

export interface SwaggerParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: Record<string, any>;
  example?: any;
}

export interface SwaggerResponse {
  description: string;
  contentType?: string;
  schema?: Record<string, any>;
  example?: any;
  headers?: Record<string, { description: string; schema: Record<string, any> }>;
}

export interface SwaggerDocConfig {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: SwaggerEndpoint[];
}

/**
 * Auto-generates OpenAPI 3.0 compatible documentation from endpoint definitions.
 */
export function generateOpenAPIDoc(config: SwaggerDocConfig): Record<string, any> {
  const paths: Record<string, any> = {};

  for (const ep of config.endpoints) {
    const pathItem: Record<string, any> = {};

    const operation: Record<string, any> = {
      summary: ep.summary,
      description: ep.description || '',
      tags: ep.tags || [],
      parameters: (ep.parameters || []).map(p => ({
        name: p.name,
        in: p.in,
        description: p.description || '',
        required: p.required ?? false,
        schema: p.schema || { type: 'string' },
        example: p.example,
      })),
      responses: Object.fromEntries(
        Object.entries(ep.responses).map(([code, resp]) => [
          code,
          {
            description: resp.description,
            content: resp.contentType ? {
              [resp.contentType]: resp.schema ? { schema: resp.schema, example: resp.example } : {},
            } : undefined,
            headers: resp.headers,
          },
        ])
      ),
    };

    if (ep.requestBody) {
      operation.requestBody = {
        description: ep.requestBody.description || '',
        required: ep.requestBody.required ?? true,
        content: ep.requestBody.contentType ? {
          [ep.requestBody.contentType]: {
            schema: ep.requestBody.schema || {},
            example: ep.requestBody.example,
          },
        } : {},
      };
    }

    pathItem[ep.method.toLowerCase()] = operation;
    paths[ep.path] = pathItem;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: config.title,
      version: config.version,
      description: config.description,
    },
    servers: [{ url: config.baseUrl }],
    paths,
    components: {
      schemas: {},
    },
  };
}

// ─── API Endpoint Definitions ─────────────────────────────────────────────────

export const API_ENDPOINTS: SwaggerEndpoint[] = [
  // ── Document ──────────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/documents',
    summary: 'Create a new document',
    description: 'Create a new document with the given title and sections.',
    tags: ['Documents'],
    requestBody: {
      description: 'Document creation payload',
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', description: 'Document title' },
          sections: { type: 'array', items: { type: 'object' } },
          meta: { type: 'object' },
          styles: { type: 'object' },
        },
      },
      example: {
        title: 'My Document',
        sections: [{ heading: 'Introduction', content: 'Hello world' }],
        meta: { author: 'Jane Doe' },
      },
    },
    responses: {
      '201': {
        description: 'Document created successfully',
        contentType: 'application/json',
        schema: { type: 'object', properties: { success: { type: 'boolean' }, id: { type: 'string' } } },
        example: { success: true, id: 'doc-12345' },
      },
      '400': { description: 'Invalid request body' },
      '500': { description: 'Internal server error' },
    },
  },
  {
    method: 'GET',
    path: '/api/documents/{id}',
    summary: 'Get a document by ID',
    tags: ['Documents'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'Document ID',
        required: true,
        schema: { type: 'string' },
        example: 'doc-12345',
      },
    ],
    responses: {
      '200': {
        description: 'Document found',
        contentType: 'application/json',
        schema: { type: 'object' },
        example: { id: 'doc-12345', title: 'My Document', sections: [] },
      },
      '404': { description: 'Document not found' },
    },
  },
  {
    method: 'PUT',
    path: '/api/documents/{id}',
    summary: 'Update a document',
    tags: ['Documents'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: { type: 'object' },
      example: { title: 'Updated Title' },
    },
    responses: {
      '200': { description: 'Document updated', contentType: 'application/json' },
      '404': { description: 'Document not found' },
    },
  },
  {
    method: 'DELETE',
    path: '/api/documents/{id}',
    summary: 'Delete a document',
    tags: ['Documents'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      '200': { description: 'Document deleted', contentType: 'application/json' },
      '404': { description: 'Document not found' },
    },
  },

  // ── Render ────────────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/render',
    summary: 'Render a document to HTML',
    tags: ['Rendering'],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string' },
          content: { type: 'object' },
          theme: { type: 'string', enum: ['default', 'minimal', 'dark'] },
          audiences: { type: 'array', items: { type: 'string' } },
          format: { type: 'string' },
          minify: { type: 'boolean' },
        },
      },
      example: { documentId: 'doc-123', theme: 'default', minify: false },
    },
    responses: {
      '200': {
        description: 'Rendered HTML',
        contentType: 'text/html',
        schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } },
        example: { success: true, data: { html: '<h1>Hello</h1>', metadata: {} } },
      },
      '500': { description: 'Render failed' },
    },
  },
  {
    method: 'POST',
    path: '/api/render/batch',
    summary: 'Batch render multiple documents',
    tags: ['Rendering'],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['documents'],
        properties: {
          documents: { type: 'array', items: { type: 'object' } },
          concurrency: { type: 'integer', default: 5 },
        },
      },
      example: { documents: [{ documentId: 'doc-1' }, { documentId: 'doc-2' }], concurrency: 5 },
    },
    responses: {
      '200': { description: 'Batch render results', contentType: 'application/json' },
    },
  },

  // ── Batch ─────────────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/batch/convert',
    summary: 'Start a batch file conversion task',
    tags: ['Batch'],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['files'],
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                mimeType: { type: 'string' },
                size: { type: 'integer' },
              },
            },
          },
          concurrency: { type: 'integer', default: 5 },
          maxRetries: { type: 'integer', default: 3 },
        },
      },
      example: {
        files: [{ path: '/uploads/doc.pdf', mimeType: 'application/pdf', size: 102400 }],
        concurrency: 5,
      },
    },
    responses: {
      '202': {
        description: 'Batch task accepted',
        contentType: 'application/json',
        schema: { type: 'object', properties: { success: { type: 'boolean' }, taskId: { type: 'string' } } },
        example: { success: true, taskId: 'batch-abc123' },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/batch/progress/{taskId}',
    summary: 'Get batch task progress',
    tags: ['Batch'],
    parameters: [
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      '200': {
        description: 'Progress data',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
            total: { type: 'integer' },
            completed: { type: 'integer' },
            failed: { type: 'integer' },
            percent: { type: 'number' },
          },
        },
        example: { taskId: 'batch-abc123', status: 'running', total: 10, completed: 3, failed: 0, percent: 30 },
      },
      '404': { description: 'Task not found' },
    },
  },
  {
    method: 'GET',
    path: '/api/batch/status/{taskId}',
    summary: 'Get full batch task status',
    tags: ['Batch'],
    parameters: [
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      '200': { description: 'Full status object', contentType: 'application/json' },
      '404': { description: 'Task not found' },
    },
  },
  {
    method: 'POST',
    path: '/api/batch/retry/{taskId}',
    summary: 'Retry failed files in a batch task',
    tags: ['Batch'],
    parameters: [
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      '200': { description: 'Retry started', contentType: 'application/json' },
      '404': { description: 'Task not found' },
    },
  },

  // ── Metrics ────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/metrics',
    summary: 'Get renderer performance metrics',
    tags: ['Metrics'],
    responses: {
      '200': {
        description: 'Metrics object',
        contentType: 'application/json',
        schema: { type: 'object' },
        example: { totalRenders: 42, cacheHits: 38, cacheMisses: 4, avgRenderTime: '12ms' },
      },
    },
  },

  // ── Batch Upload (ZIP) ───────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/batch/upload',
    summary: 'Upload a ZIP file for batch conversion',
    description: 'Upload a ZIP archive containing multiple files. Each file is converted to HTML and returned as a new ZIP.',
    tags: ['Batch'],
    requestBody: {
      description: 'ZIP file binary',
      required: true,
      contentType: 'application/zip',
      schema: { type: 'string', format: 'binary' },
    },
    responses: {
      '200': {
        description: 'Batch conversion result',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            taskId: { type: 'string' },
            totalFiles: { type: 'integer' },
            successCount: { type: 'integer' },
            failedCount: { type: 'integer' },
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  success: { type: 'boolean' },
                  error: { type: 'string' },
                  sizeOriginal: { type: 'integer' },
                  sizeConverted: { type: 'integer' },
                },
              },
            },
          },
        },
        example: {
          success: true,
          taskId: 'zip-20260611-abc123',
          totalFiles: 5,
          successCount: 4,
          failedCount: 1,
          entries: [
            { name: 'report.xlsx', success: true, sizeOriginal: 24576, sizeConverted: 18432 },
            { name: 'data.csv', success: true, sizeOriginal: 4096, sizeConverted: 8192 },
          ],
        },
      },
    },
  },


  // ── WebSocket Preview ──────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/ws/preview',
    summary: 'WebSocket for real-time document preview',
    description: 'Connect via WebSocket to receive real-time conversion results. Send `{type:"render", id, content, theme}` messages.',
    tags: ['Preview'],
    responses: {
      '101': { description: 'Switching Protocols — WebSocket upgrade' },
    },
  },
];

/**
 * Generate the full OpenAPI document for doc2html-arch.
 */
export function getSwaggerDoc(baseUrl = 'http://localhost:3000'): Record<string, any> {
  return generateOpenAPIDoc({
    title: 'doc2html-arch API',
    version: '1.0.0',
    description: 'Multi-format document to HTML rendering API. Supports Markdown, HTML, Text, PDF, DOCX, JSON, XLSX, CSV, and image formats with batch processing, theme customization, WebSocket preview, and audience filtering.',
    baseUrl,
    endpoints: API_ENDPOINTS,
  });
}