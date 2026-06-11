import sharp from 'sharp';
import { IAsyncConverter } from './converter.factory';
import { OutputOptions } from './output.options';

export type ImageFormat = 'png' | 'jpeg' | 'gif' | 'webp' | 'avif';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  sizeOriginal: number;
  sizeOptimized: number;
  hasAlpha: boolean;
}

export class ImageConverter implements IAsyncConverter {
  private maxWidth: number;
  private maxHeight: number;
  private quality: number;

  constructor(maxWidth = 1920, maxHeight = 1080, quality = 85) {
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this.quality = quality;
  }

  async convert(
    source: Buffer | ArrayBuffer | string,
    options?: Partial<OutputOptions>
  ): Promise<{ html: string; metadata: ImageMetadata }> {
    const buf = Buffer.isBuffer(source)
      ? source
      : typeof source === 'string'
      ? Buffer.from(source)
      : Buffer.from(new Uint8Array(source instanceof ArrayBuffer ? source : source as unknown as ArrayLike<number>));

    const metadata = await sharp(buf).metadata();
    const hasAlpha = metadata.format === 'png' || metadata.format === 'gif';

    // Resize if needed (preserve aspect ratio)
    let pipeline = sharp(buf);
    if ((metadata.width ?? 0) > this.maxWidth || (metadata.height ?? 0) > this.maxHeight) {
      pipeline = pipeline.resize(this.maxWidth, this.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to JPEG for photos, keep PNG/GIF for transparency
    const outputFormat = hasAlpha ? 'png' : 'jpeg';
    const quality = hasAlpha ? undefined : this.quality;

    const processed = await pipeline
      .toFormat(outputFormat as keyof sharp.FormatEnum, { quality })
      .toBuffer();

    const finalMeta = await sharp(processed).metadata();

    const dataUri = `data:image/${outputFormat};base64,${processed.toString('base64')}`;
    const html = this.wrap(dataUri, finalMeta.width ?? 0, finalMeta.height ?? 0, outputFormat, options);

    return {
      html,
      metadata: {
        width: finalMeta.width ?? 0,
        height: finalMeta.height ?? 0,
        format: outputFormat,
        sizeOriginal: buf.length,
        sizeOptimized: processed.length,
        hasAlpha,
      },
    };
  }

  private wrap(
    dataUri: string,
    width: number,
    height: number,
    format: string,
    options?: Partial<OutputOptions>
  ): string {
    const title = options?.title ?? 'Image';
    const theme = options?.theme ?? 'light';
    const lang = options?.lang ?? 'en';

    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${this.escapeHtml(title)}</title>
<style>
  body { margin: 0; background: ${bgColor}; display: flex; flex-direction: column;
         align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
  .image-wrapper { max-width: 100%; padding: 1rem; text-align: center; }
  img { max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .image-meta { margin-top: 0.5rem; font-size: 12px; color: ${theme === 'dark' ? '#aaa' : '#666'}; }
</style>
</head>
<body>
<div class="image-wrapper">
  <img src="${dataUri}" alt="${this.escapeHtml(title)}" width="${width}" height="${height}" loading="lazy">
  <div class="image-meta">${width}×${height} · ${format.toUpperCase()}</div>
</div>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}