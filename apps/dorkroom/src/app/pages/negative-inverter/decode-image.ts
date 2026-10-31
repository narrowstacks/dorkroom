import {
  fitLongEdge,
  type PixelSize,
  PREVIEW_LONG_EDGE,
} from '@dorkroom/logic';

/** Why a photo could not be opened. */
export type DecodeFailure = 'heic' | 'unreadable' | 'unsupported-browser';

export class ImageDecodeFailure extends Error {
  readonly reason: DecodeFailure;

  constructor(reason: DecodeFailure, options?: ErrorOptions) {
    super(decodeFailureMessage(reason), options);
    this.name = 'ImageDecodeFailure';
    this.reason = reason;
  }
}

export function decodeFailureMessage(reason: DecodeFailure): string {
  switch (reason) {
    case 'heic':
      return 'This browser cannot open HEIC photos. Open the page in Safari, or set your camera to save JPEG ("Most Compatible") and try again.';
    case 'unsupported-browser':
      return 'This browser cannot decode photos for this tool. Try a current version of Safari, Chrome, Firefox, or Edge.';
    case 'unreadable':
      return 'This file could not be opened as a photo. Try a JPEG or PNG.';
  }
}

/** HEIC/HEIF by MIME type or file name; browsers often leave the type empty. */
export function isHeicFile(file: Pick<File, 'name' | 'type'>): boolean {
  return (
    /^image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  );
}

/**
 * Decode a photo with its EXIF orientation applied, so a portrait phone shot
 * is processed upright. Optional resize options let the browser decode
 * straight to a smaller size where it supports them.
 */
export async function decodeImageFile(
  file: File,
  resize?: { width: number; height: number }
): Promise<ImageBitmap> {
  if (!('createImageBitmap' in window)) {
    throw new ImageDecodeFailure('unsupported-browser');
  }
  const options: ImageBitmapOptions = { imageOrientation: 'from-image' };
  if (resize) {
    options.resizeWidth = resize.width;
    options.resizeHeight = resize.height;
    options.resizeQuality = 'high';
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, options);
  } catch {
    // Browsers from before `imageOrientation: 'from-image'` was specified
    // reject the option value itself, so retry once with their defaults.
    try {
      bitmap = await createImageBitmap(file);
    } catch (cause) {
      throw new ImageDecodeFailure(isHeicFile(file) ? 'heic' : 'unreadable', {
        cause,
      });
    }
  }
  if (bitmap.width === 0 || bitmap.height === 0) {
    bitmap.close();
    throw new ImageDecodeFailure(isHeicFile(file) ? 'heic' : 'unreadable');
  }
  return bitmap;
}

/** A photo of a negative, ready for the interactive steps. */
export interface LoadedNegative {
  file: File;
  /** Size of the decoded original, orientation applied. */
  original: PixelSize;
  /** Downscaled RGBA proxy for the preview, picking, and statistics. */
  proxy: ImageData;
}

/** Release a canvas's backing store now rather than at garbage collection.
 *  iOS Safari counts live canvas memory against a small budget. */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Decode a photo and build its proxy (long edge {@link PREVIEW_LONG_EDGE}).
 * The full-size bitmap is closed before this returns: the original is decoded
 * again only at export.
 */
export async function loadNegative(file: File): Promise<LoadedNegative> {
  const bitmap = await decodeImageFile(file);
  const original = { width: bitmap.width, height: bitmap.height };
  const size = fitLongEdge(original, PREVIEW_LONG_EDGE);
  const canvas = document.createElement('canvas');
  try {
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new ImageDecodeFailure('unsupported-browser');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const proxy = ctx.getImageData(0, 0, size.width, size.height);
    return { file, original, proxy };
  } finally {
    bitmap.close();
    releaseCanvas(canvas);
  }
}
