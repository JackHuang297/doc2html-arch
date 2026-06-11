import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { defaultConverterFactory } from '../converters';
import { OutputOptions } from '../converters/output.options';

export interface ZipEntryResult {
  name: string;
  path: string;
  success: boolean;
  html?: string;
  error?: string;
  sizeOriginal: number;
  sizeConverted: number;
}

export interface ZipBatchResult {
  success: boolean;
  taskId: string;
  entries: ZipEntryResult[];
  totalFiles: number;
  successCount: number;
  failedCount: number;
  totalOriginalSize: number;
  totalConvertedSize: number;
}

const OUTPUT_DIR = path.resolve(process.env.OUTPUT_DIR || './output');

/**
 * Extracts a ZIP file, converts each entry, and returns a ZipBatchResult.
 */
export async function processZipBatch(
  zipBuffer: Buffer,
  options?: Partial<OutputOptions>
): Promise<ZipBatchResult> {
  const taskId = `zip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entries: ZipEntryResult[] = [];

  // Ensure temp directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  let successCount = 0;
  let failedCount = 0;
  let totalOriginalSize = 0;
  let totalConvertedSize = 0;

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    const name = entry.name;
    const ext = path.extname(name).toLowerCase().slice(1);

    // Skip unsupported binary extensions that we can't handle
    if (['exe', 'dll', 'so', 'dylib', 'zip', 'tar', 'gz'].includes(ext)) {
      entries.push({
        name,
        path: entry.entryName,
        success: false,
        error: `Unsupported file type: .${ext}`,
        sizeOriginal: entry.header.size,
        sizeConverted: 0,
      });
      failedCount++;
      continue;
    }

    try {
      const content = entry.getData();
      const result = await defaultConverterFactory.autoConvert(
        content,
        name,
        undefined,
        options
      );

      const htmlBytes = Buffer.byteLength(result.html, 'utf-8');
      totalOriginalSize += content.length;
      totalConvertedSize += htmlBytes;

      entries.push({
        name,
        path: entry.entryName,
        success: true,
        html: result.html,
        sizeOriginal: content.length,
        sizeConverted: htmlBytes,
      });
      successCount++;
    } catch (err: any) {
      entries.push({
        name,
        path: entry.entryName,
        success: false,
        error: err.message,
        sizeOriginal: entry.header.size,
        sizeConverted: 0,
      });
      failedCount++;
    }
  }

  return {
    success: failedCount === 0,
    taskId,
    entries,
    totalFiles: entries.length,
    successCount,
    failedCount,
    totalOriginalSize,
    totalConvertedSize,
  };
}

/**
 * Writes a ZipBatchResult entries to a ZIP file for download.
 */
export function writeResultZip(result: ZipBatchResult): Buffer {
  const zip = new AdmZip();

  for (const entry of result.entries) {
    if (!entry.success || !entry.html) continue;

    const outName = entry.name.replace(/\.[^.]+$/, '') + '.html';
    zip.addFile(outName, Buffer.from(entry.html, 'utf-8'), `Converted from ${entry.name}`);
  }

  return zip.toBuffer();
}

/**
 * Writes a single HTML result to the output directory.
 */
export function writeOutputFile(filename: string, html: string): string {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const safeName = path.basename(filename, path.extname(filename)) + '.html';
  const outPath = path.join(OUTPUT_DIR, safeName);
  fs.writeFileSync(outPath, html, 'utf-8');
  return outPath;
}