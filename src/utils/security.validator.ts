import * as path from 'path';

export interface SecurityConfig {
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  enableContentScan: boolean;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'text/plain',
    'text/html',
    'text/markdown',
    'application/json',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
  ],
  allowedExtensions: [
    '.txt', '.html', '.htm', '.md', '.markdown', '.json', '.pdf', '.docx',
    '.xlsx', '.xls', '.csv',
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
  ],
  enableContentScan: true,
};

export interface ScanResult {
  safe: boolean;
  threats: string[];
}

export class SecurityValidator {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Validate file extension against whitelist.
   */
  isExtensionAllowed(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.allowedExtensions.includes(ext);
  }

  /**
   * Validate MIME type against whitelist.
   */
  isMimeTypeAllowed(mimeType: string): boolean {
    return this.config.allowedMimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Validate file size limit.
   */
  isFileSizeAllowed(sizeBytes: number): boolean {
    return sizeBytes <= this.config.maxFileSizeBytes;
  }

  /**
   * Scan file content for malicious patterns (XSS, path traversal, etc.).
   * Returns a ScanResult indicating whether the content is safe.
   */
  scanContent(content: string | Buffer): ScanResult {
    const threats: string[] = [];

    const text = typeof content === 'string' ? content : content.toString('utf-8');

    // XSS patterns
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[\s\S]*?>/gi,
      /<object[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
      /<link[\s\S]*?(rel\s*=\s*["']?stylesheet[\s\S]*?)?[\s\S]*?>/gi,
      /<base[\s\S]*?>/gi,
      /<meta[\s\S]*?(http-equiv|refresh)[\s\S]*?>/gi,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(text)) {
        threats.push(`XSS pattern detected: ${pattern.toString()}`);
      }
    }

    // Path traversal
    const traversalPattern = /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\\\.\\\.\\|\\0)/gi;
    if (traversalPattern.test(text)) {
      threats.push('Path traversal pattern detected');
    }

    // Shell injection patterns
    const shellPatterns = [
      /[;&|`$]/g,
      /\$\([\s\S]*?\)/g,
      /`[\s\S]*?`/g,
    ];
    for (const pattern of shellPatterns) {
      if (pattern.test(text)) {
        threats.push(`Shell injection pattern detected`);
        break;
      }
    }

    // Embedded executable magic bytes (PE, ELF, etc.)
    const execMagicBytes: Array<{ bytes: Buffer; name: string }> = [
      { bytes: Buffer.from([0x4d, 0x5a]), name: 'Windows PE' },
      { bytes: Buffer.from([0x7f, 0x45, 0x4c, 0x46]), name: 'ELF' },
      { bytes: Buffer.from([0xca, 0xfe, 0xba, 0xbe]), name: 'Mach-O' },
    ];

    if (Buffer.isBuffer(content)) {
      for (const { bytes, name } of execMagicBytes) {
        if (content.subarray(0, bytes.length).equals(bytes)) {
          threats.push(`Executable magic bytes detected: ${name}`);
        }
      }
    }

    return {
      safe: threats.length === 0,
      threats,
    };
  }

  /**
   * Full validation: extension + size + MIME + content scan.
   */
  validate(filePath: string, content: string | Buffer, sizeBytes: number, mimeType?: string): ScanResult {
    const results: ScanResult[] = [];

    if (!this.isExtensionAllowed(filePath)) {
      results.push({ safe: false, threats: [`Disallowed file extension: ${path.extname(filePath)}`] });
    }

    if (!this.isFileSizeAllowed(sizeBytes)) {
      results.push({ safe: false, threats: [`File exceeds size limit: ${sizeBytes} > ${this.config.maxFileSizeBytes}`] });
    }

    if (mimeType && !this.isMimeTypeAllowed(mimeType)) {
      results.push({ safe: false, threats: [`Disallowed MIME type: ${mimeType}`] });
    }

    if (this.config.enableContentScan) {
      results.push(this.scanContent(content));
    }

    const allThreats = results.flatMap(r => r.threats);
    return {
      safe: allThreats.length === 0,
      threats: allThreats,
    };
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}