import {
  type PixelRect,
  type PixelSize,
  planExportSize,
  planTiles,
} from '@dorkroom/logic';
import {
  type Orientation,
  orientationMatrix,
  orientedSize,
  orientRect,
} from './orientation';

/**
 * How a full-resolution export is rendered on iOS. Plain numbers, no Skia, so
 * the plan is testable; `exportPositive` in `src/lib/negative-inverter.ts`
 * carries it out.
 *
 * The positive is drawn by the GPU (Metal) through Skia, then encoded on the
 * CPU. Metal refuses textures over 16384 on a side, and one GPU surface the
 * size of a 48 MP photo plus its readback costs several hundred megabytes at
 * once, so anything larger than {@link SINGLE_PASS_MAX_PIXELS} is drawn in
 * tiles, each read back into one CPU bitmap that is then encoded.
 */

/** Metal's texture side limit on every iPhone that runs iOS 26. */
export const METAL_MAX_TEXTURE_SIDE = 16_384;

/** Side of an export tile, in pixels. 64 MB of RGBA per tile. */
export const EXPORT_TILE_SIDE = 4096;

/**
 * Largest export drawn in one GPU pass: a 12 MP iPhone photo is one pass, a
 * 24 or 48 MP one is tiled.
 */
export const SINGLE_PASS_MAX_PIXELS = 16_777_216;

/**
 * Largest export at all. A 48 MP photo is 194 MB as RGBA; past 100 MP the
 * CPU bitmap alone would risk the app being killed, so larger sources (scans,
 * stitched files) are scaled down to fit.
 */
export const MAX_EXPORT_PIXELS = 100_000_000;

/** JPEG quality, 0..100. */
export const JPEG_QUALITY = 92;

export type ExportFormat = 'jpeg' | 'png';

export interface ExportRenderPlan {
  width: number;
  height: number;
  /** Output pixels per source pixel; 1 unless the source was too large. */
  scale: number;
  downscaled: boolean;
  /** Regions of the output to draw, in output pixels. */
  tiles: PixelRect[];
  /** True when the tiles must be assembled into a CPU bitmap. */
  tiled: boolean;
}

export function planExportRender(source: PixelSize): ExportRenderPlan {
  const size = planExportSize(source, {
    maxPixels: MAX_EXPORT_PIXELS,
    maxSide: METAL_MAX_TEXTURE_SIDE,
  });
  const { width, height } = size;
  const scale = width / size.sourceWidth;
  const single =
    width * height <= SINGLE_PASS_MAX_PIXELS &&
    width <= EXPORT_TILE_SIDE * 2 &&
    height <= EXPORT_TILE_SIDE * 2;
  return {
    width,
    height,
    scale,
    downscaled: size.downscaled,
    tiles: single
      ? [{ x: 0, y: 0, width, height }]
      : planTiles({ width, height }, EXPORT_TILE_SIDE),
    tiled: !single,
  };
}

/**
 * The crop, chosen on the proxy, as a region of the full-resolution photo:
 * scaled up and snapped outward to whole pixels, inside the photo.
 */
export function cropToSource(
  crop: PixelRect,
  proxy: PixelSize,
  full: PixelSize
): PixelRect {
  const sx = full.width / proxy.width;
  const sy = full.height / proxy.height;
  const clampX = (v: number) => Math.min(full.width, Math.max(0, v));
  const clampY = (v: number) => Math.min(full.height, Math.max(0, v));
  // A hair of tolerance, so a crop on a pixel edge is not widened by float
  // error in the scale.
  const x0 = clampX(Math.floor(crop.x * sx + 1e-6));
  const y0 = clampY(Math.floor(crop.y * sy + 1e-6));
  const x1 = clampX(Math.ceil((crop.x + crop.width) * sx - 1e-6));
  const y1 = clampY(Math.ceil((crop.y + crop.height) * sy - 1e-6));
  return {
    x: x0,
    y: y0,
    width: Math.max(1, x1 - x0),
    height: Math.max(1, y1 - y0),
  };
}

export interface CroppedExportPlan extends ExportRenderPlan {
  /** The crop, in full-resolution source pixels. */
  region: PixelRect;
  orientation: Orientation;
  /** The file's size: the rendered crop, oriented. */
  output: PixelSize;
  /** Skia matrix from rendered (unoriented) pixels to file pixels. */
  matrix: number[];
}

/**
 * How to export a crop of the photo, oriented. The tiles cover the crop
 * only, in rendered pixels; `tileSource` says which source pixels each one
 * reads, and `orientRect(tile, plan, orientation)` where it lands in the
 * file. Quarter turns and mirrors keep whole pixels whole, so tiles land on
 * the pixel grid without resampling.
 */
export function planCroppedExport(
  region: PixelRect,
  orientation: Orientation
): CroppedExportPlan {
  const plan = planExportRender({
    width: region.width,
    height: region.height,
  });
  const rendered = { width: plan.width, height: plan.height };
  return {
    ...plan,
    region,
    orientation,
    output: orientedSize(rendered, orientation),
    matrix: orientationMatrix(rendered, orientation),
  };
}

/** The source pixels a rectangle of rendered pixels reads. */
export function tileSource(
  rect: PixelRect,
  plan: Pick<CroppedExportPlan, 'region' | 'scale'>
): PixelRect {
  return {
    x: plan.region.x + rect.x / plan.scale,
    y: plan.region.y + rect.y / plan.scale,
    width: rect.width / plan.scale,
    height: rect.height / plan.scale,
  };
}

/** Where a rendered tile lands in the file. */
export function tilePlacement(
  tile: PixelRect,
  plan: Pick<CroppedExportPlan, 'width' | 'height' | 'orientation'>
): PixelRect {
  return orientRect(
    tile,
    { width: plan.width, height: plan.height },
    plan.orientation
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `dorkroom-positive-20261031-221502.jpg`, from the local time. */
export function exportFileName(date: Date, format: ExportFormat): string {
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `dorkroom-positive-${stamp}.${format === 'png' ? 'png' : 'jpg'}`;
}
