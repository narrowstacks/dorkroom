/**
 * Geometry for the negative inverter (issue #527): proxy sizing, export size
 * fitting, render tiling, coordinate mapping, and crop handle dragging.
 *
 * Plain numbers only, no DOM: the web page and the iOS screen both work from a
 * downscaled proxy of the photo and export from the original, so both need the
 * same mapping between the two and the same export limits.
 */

import { clampRect, type PixelRect } from './negative-inversion';

export interface PixelSize {
  width: number;
  height: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

/** A box on screen, in CSS pixels (the fields of a `DOMRect`). */
export interface ScreenBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Long edge of the interactive proxy, in pixels. */
export const PREVIEW_LONG_EDGE = 2048;

/**
 * Largest canvas iOS Safari will allocate, 4096 x 4096 pixels. Above it the
 * canvas silently stays blank or the tab is killed, so exports are fitted
 * under it on every browser for a predictable result.
 */
export const MAX_CANVAS_PIXELS = 16_777_216;

/** Longest canvas side every current browser accepts. */
export const MAX_CANVAS_SIDE = 16_384;

/** Smallest crop side, in proxy pixels. */
export const MIN_CROP_SIDE = 16;

/**
 * Scale a size down so its long edge is at most `longEdge`, keeping the aspect
 * ratio. Never scales up. Both sides stay at least one pixel.
 */
export function fitLongEdge(size: PixelSize, longEdge: number): PixelSize {
  const long = Math.max(size.width, size.height);
  if (long <= longEdge) {
    return { width: size.width, height: size.height };
  }
  const scale = longEdge / long;
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

export interface ExportLimits {
  maxPixels: number;
  maxSide: number;
}

export const DEFAULT_EXPORT_LIMITS: ExportLimits = {
  maxPixels: MAX_CANVAS_PIXELS,
  maxSide: MAX_CANVAS_SIDE,
};

export interface ExportPlan {
  /** Output size. */
  width: number;
  height: number;
  /** Size of the region at full resolution. */
  sourceWidth: number;
  sourceHeight: number;
  /** True when the output is smaller than the source. */
  downscaled: boolean;
}

/**
 * The largest output size, at the source's aspect ratio, that fits under the
 * canvas limits. A source that already fits is exported at its own size.
 */
export function planExportSize(
  source: PixelSize,
  limits: ExportLimits = DEFAULT_EXPORT_LIMITS
): ExportPlan {
  const sourceWidth = Math.max(1, Math.round(source.width));
  const sourceHeight = Math.max(1, Math.round(source.height));
  const scale = Math.min(
    1,
    Math.sqrt(limits.maxPixels / (sourceWidth * sourceHeight)),
    limits.maxSide / sourceWidth,
    limits.maxSide / sourceHeight
  );
  if (scale >= 1) {
    return {
      width: sourceWidth,
      height: sourceHeight,
      sourceWidth,
      sourceHeight,
      downscaled: false,
    };
  }
  let width = Math.max(1, Math.floor(sourceWidth * scale));
  let height = Math.max(1, Math.floor(sourceHeight * scale));
  // Floating point can leave the product a hair over the cap.
  while (width * height > limits.maxPixels) {
    if (width >= height) width--;
    else height--;
  }
  return { width, height, sourceWidth, sourceHeight, downscaled: true };
}

/**
 * Split an image into tiles no larger than `maxTile` on a side, row by row.
 * Used to render an export through a GPU whose texture or renderbuffer limit
 * is smaller than the image, and to bound the memory of each step.
 */
export function planTiles(size: PixelSize, maxTile: number): PixelRect[] {
  const tile = Math.max(1, Math.floor(maxTile));
  const tiles: PixelRect[] = [];
  for (let y = 0; y < size.height; y += tile) {
    for (let x = 0; x < size.width; x += tile) {
      tiles.push({
        x,
        y,
        width: Math.min(tile, size.width - x),
        height: Math.min(tile, size.height - y),
      });
    }
  }
  return tiles;
}

/** Map a point between two images of the same picture at different sizes. */
export function scalePoint(
  point: PixelPoint,
  from: PixelSize,
  to: PixelSize
): PixelPoint {
  return {
    x: (point.x * to.width) / from.width,
    y: (point.y * to.height) / from.height,
  };
}

/**
 * Map a rectangle between two images of the same picture at different sizes,
 * rounded outward to whole pixels and clamped to the target image.
 */
export function scaleRect(
  rect: PixelRect,
  from: PixelSize,
  to: PixelSize
): PixelRect {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  // Round to a micro-pixel first so float noise (e.g. 2.0000000001) does not
  // grow the rectangle by a whole pixel.
  const snap = (v: number) => Math.round(v * 1e6) / 1e6;
  const x0 = Math.floor(snap(rect.x * sx));
  const y0 = Math.floor(snap(rect.y * sy));
  const x1 = Math.ceil(snap((rect.x + rect.width) * sx));
  const y1 = Math.ceil(snap((rect.y + rect.height) * sy));
  return clampRect(
    { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
    to.width,
    to.height
  );
}

/**
 * Map a pointer position on screen to image pixels, for an image drawn to fill
 * `box` exactly. The result is clamped to the image.
 */
export function screenToImagePoint(
  client: PixelPoint,
  box: ScreenBox,
  image: PixelSize
): PixelPoint {
  const fx = box.width > 0 ? (client.x - box.left) / box.width : 0;
  const fy = box.height > 0 ? (client.y - box.top) / box.height : 0;
  return {
    x: Math.max(0, Math.min(image.width - 1, fx * image.width)),
    y: Math.max(0, Math.min(image.height - 1, fy * image.height)),
  };
}

/**
 * Megapixels, rounded down the way cameras are marketed (an 8064 x 6048
 * sensor is "48 MP"): whole numbers from 10 up, one decimal below.
 */
export function formatMegapixels(size: PixelSize): string {
  const mp = (size.width * size.height) / 1_000_000;
  if (mp >= 10) return `${Math.floor(mp)} MP`;
  return `${Math.max(0.1, Math.floor(mp * 10) / 10)} MP`;
}

/** Which part of the crop rectangle is being dragged. */
export type CropHandle =
  'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const CROP_HANDLES: readonly CropHandle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

/**
 * The crop rectangle after dragging `handle` by (dx, dy) image pixels from
 * `start`. Edges stay inside `bounds` and at least `minSide` apart; a move
 * slides the whole rectangle and stops at the image edges.
 */
export function dragCropRect(
  start: PixelRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  bounds: PixelSize,
  minSide = MIN_CROP_SIDE
): PixelRect {
  const minW = Math.min(minSide, bounds.width);
  const minH = Math.min(minSide, bounds.height);
  let x0 = start.x;
  let y0 = start.y;
  let x1 = start.x + start.width;
  let y1 = start.y + start.height;

  if (handle === 'move') {
    const nx = Math.max(0, Math.min(bounds.width - start.width, x0 + dx));
    const ny = Math.max(0, Math.min(bounds.height - start.height, y0 + dy));
    return {
      x: Math.round(nx),
      y: Math.round(ny),
      width: start.width,
      height: start.height,
    };
  }
  if (handle.includes('w')) x0 = Math.max(0, Math.min(x1 - minW, x0 + dx));
  if (handle.includes('e')) {
    x1 = Math.min(bounds.width, Math.max(x0 + minW, x1 + dx));
  }
  if (handle.includes('n')) y0 = Math.max(0, Math.min(y1 - minH, y0 + dy));
  if (handle.includes('s')) {
    y1 = Math.min(bounds.height, Math.max(y0 + minH, y1 + dy));
  }
  const rx0 = Math.round(x0);
  const ry0 = Math.round(y0);
  return {
    x: rx0,
    y: ry0,
    width: Math.round(x1) - rx0,
    height: Math.round(y1) - ry0,
  };
}

/** True when a crop covers the whole image. */
export function isFullCrop(crop: PixelRect, image: PixelSize): boolean {
  return (
    crop.x <= 0 &&
    crop.y <= 0 &&
    crop.width >= image.width &&
    crop.height >= image.height
  );
}
