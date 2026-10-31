import {
  DEFAULT_EXPORT_LIMITS,
  type ExportLimits,
  type ExportPlan,
  type InversionCoefficients,
  type PixelRect,
  type PixelSize,
  planExportSize,
  planTiles,
} from '@dorkroom/logic';
import { decodeImageFile, releaseCanvas } from './decode-image';
import {
  createInversionRenderer,
  type InversionRenderer,
} from './inversion-renderer';

export type ExportFormat = 'jpeg' | 'png';

/** JPEG quality: high enough that re-encoding a phone photo is not obvious. */
export const JPEG_QUALITY = 0.92;

/**
 * Tile side for the export pass. Each tile is read back as one `ImageData`
 * (16 MB at 2048 px), so this bounds the extra memory the export needs on top
 * of the output canvas. A multiple of 4 keeps the dither pattern seamless.
 */
export const EXPORT_TILE_SIDE = 2048;

export interface ExportRequest {
  file: File;
  /** Size of the decoded original. */
  original: PixelSize;
  /** Region of the original to export, in original pixels. */
  region: PixelRect;
  coefficients: InversionCoefficients;
  format: ExportFormat;
  limits?: ExportLimits;
  /** Called after each tile with the fraction done, 0..1. */
  onProgress?: (fraction: number) => void;
}

export interface ExportResult {
  blob: Blob;
  plan: ExportPlan;
}

const MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
} satisfies Record<ExportFormat, string>;

/** Yield to the event loop so the page can paint progress between tiles. */
function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The browser could not encode the image.'));
      },
      MIME[format],
      format === 'jpeg' ? JPEG_QUALITY : undefined
    );
  });
}

/**
 * Render the positive from the original file and encode it.
 *
 * The original is decoded again here (the page only keeps the proxy), cropped
 * and, when it is over the canvas cap, scaled to the largest size that fits,
 * all in one `drawImage` into the output canvas. The pixel pass then runs over
 * that canvas in tiles, so GPUs with small texture limits still work and no
 * step holds more than one tile of extra pixels. Every bitmap, canvas and GL
 * context is released before this resolves or rejects.
 */
export async function exportPositive({
  file,
  original,
  region,
  coefficients,
  format,
  limits = DEFAULT_EXPORT_LIMITS,
  onProgress,
}: ExportRequest): Promise<ExportResult> {
  const plan = planExportSize(region, limits);
  const scale = plan.width / region.width;

  const output = document.createElement('canvas');
  let bitmap: ImageBitmap | null = null;
  let renderer: InversionRenderer | null = null;
  try {
    // Ask the browser to decode at the export scale when that saves memory.
    // Browsers that ignore the resize options return the full size, which
    // the source rectangle below accounts for.
    bitmap = await decodeImageFile(
      file,
      plan.downscaled
        ? {
            width: Math.max(1, Math.round(original.width * scale)),
            height: Math.max(1, Math.round(original.height * scale)),
          }
        : undefined
    );
    const sx = bitmap.width / original.width;
    const sy = bitmap.height / original.height;

    output.width = plan.width;
    output.height = plan.height;
    const ctx = output.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('The browser could not create a canvas.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      bitmap,
      region.x * sx,
      region.y * sy,
      region.width * sx,
      region.height * sy,
      0,
      0,
      plan.width,
      plan.height
    );
    bitmap.close();
    bitmap = null;

    renderer = createInversionRenderer({ preserveDrawingBuffer: true });
    if (!renderer) throw new Error('The browser could not create a canvas.');
    const tiles = planTiles(
      plan,
      Math.min(EXPORT_TILE_SIDE, renderer.maxSourceSide)
    );
    for (const [index, tile] of tiles.entries()) {
      const pixels = ctx.getImageData(tile.x, tile.y, tile.width, tile.height);
      renderer.setSource(pixels);
      renderer.render(coefficients);
      ctx.drawImage(renderer.canvas, tile.x, tile.y);
      onProgress?.((index + 1) / tiles.length);
      await nextTask();
    }
    renderer.dispose();
    renderer = null;

    const blob = await canvasToBlob(output, format);
    return { blob, plan };
  } finally {
    bitmap?.close();
    renderer?.dispose();
    releaseCanvas(output);
  }
}

/** `negative.jpg` becomes `negative-positive.jpg`. */
export function exportFileName(sourceName: string, format: ExportFormat) {
  const stem = sourceName.replace(/\.[^./\\]+$/, '').trim() || 'negative';
  return `${stem}-positive.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

/** Hand a blob to the browser as a download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // iOS Safari may open the blob in a new tab rather than saving it, and
  // needs the URL alive until that tab has loaded it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
