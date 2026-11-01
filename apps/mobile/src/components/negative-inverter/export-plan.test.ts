import { describe, expect, it } from 'vitest';
import {
  cropToSource,
  EXPORT_TILE_SIDE,
  exportFileName,
  MAX_EXPORT_PIXELS,
  METAL_MAX_TEXTURE_SIDE,
  planCroppedExport,
  planExportRender,
  tilePlacement,
  tileSource,
} from './export-plan';
import { applyMatrix, type Orientation } from './orientation';

function coverage(plan: ReturnType<typeof planExportRender>): number {
  return plan.tiles.reduce((sum, t) => sum + t.width * t.height, 0);
}

describe('planExportRender', () => {
  it('draws a 12 MP photo in one pass at full size', () => {
    const plan = planExportRender({ width: 4032, height: 3024 });
    expect(plan).toMatchObject({
      width: 4032,
      height: 3024,
      scale: 1,
      downscaled: false,
      tiled: false,
    });
    expect(plan.tiles).toEqual([{ x: 0, y: 0, width: 4032, height: 3024 }]);
  });

  it('tiles a 48 MP photo at full size', () => {
    const plan = planExportRender({ width: 8064, height: 6048 });
    expect(plan.width).toBe(8064);
    expect(plan.height).toBe(6048);
    expect(plan.downscaled).toBe(false);
    expect(plan.tiled).toBe(true);
    expect(plan.tiles).toHaveLength(4);
    expect(coverage(plan)).toBe(8064 * 6048);
    for (const tile of plan.tiles) {
      expect(tile.width).toBeLessThanOrEqual(EXPORT_TILE_SIDE);
      expect(tile.height).toBeLessThanOrEqual(EXPORT_TILE_SIDE);
    }
  });

  it('tiles a long panorama that fits in pixels but not on one side', () => {
    const plan = planExportRender({ width: 12_000, height: 1000 });
    expect(plan.tiled).toBe(true);
    expect(plan.width).toBe(12_000);
    expect(coverage(plan)).toBe(12_000 * 1000);
  });

  it('scales a source down under the pixel and texture limits', () => {
    const huge = planExportRender({ width: 20_000, height: 15_000 });
    expect(huge.downscaled).toBe(true);
    expect(huge.width * huge.height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    expect(huge.width).toBeLessThanOrEqual(METAL_MAX_TEXTURE_SIDE);
    expect(huge.scale).toBeCloseTo(huge.width / 20_000, 10);
    const strip = planExportRender({ width: 30_000, height: 500 });
    expect(strip.width).toBeLessThanOrEqual(METAL_MAX_TEXTURE_SIDE);
  });
});

describe('exportFileName', () => {
  it('stamps the local time, a sequence number and the format', () => {
    const date = new Date(2026, 9, 31, 22, 15, 2);
    expect(exportFileName(date, 'jpeg', 1)).toBe(
      'dorkroom-positive-20261031-221502-1.jpg'
    );
    expect(exportFileName(date, 'png', 2)).toBe(
      'dorkroom-positive-20261031-221502-2.png'
    );
  });

  it('keeps two exports in the same second apart', () => {
    const date = new Date(2026, 9, 31, 22, 15, 2);
    expect(exportFileName(date, 'jpeg', 1)).not.toBe(
      exportFileName(date, 'jpeg', 2)
    );
  });
});

describe('cropped, oriented exports', () => {
  const full = { width: 8064, height: 6048 };
  const proxy = { width: 2048, height: 1536 };

  it('scales the proxy crop to whole source pixels', () => {
    expect(
      cropToSource({ x: 0, y: 0, width: 2048, height: 1536 }, proxy, full)
    ).toEqual({ x: 0, y: 0, ...full });
    const region = cropToSource(
      { x: 100.5, y: 200, width: 1000, height: 700 },
      proxy,
      full
    );
    expect(region.x).toBe(Math.floor(100.5 * 3.9375));
    expect(region.x + region.width).toBe(Math.ceil(1100.5 * 3.9375));
    expect(region.y).toBe(787);
    expect(region.height).toBe(2757);
  });

  it('never leaves the photo', () => {
    const region = cropToSource(
      { x: -5, y: 1500, width: 3000, height: 100 },
      proxy,
      full
    );
    expect(region.x).toBe(0);
    expect(region.x + region.width).toBe(full.width);
    expect(region.y + region.height).toBe(full.height);
  });

  const orientations: Orientation[] = ([0, 1, 2, 3] as const).flatMap(
    (quarterTurns) =>
      [false, true].map((mirrored) => ({ quarterTurns, mirrored }))
  );

  it.each(orientations)(
    'tiles only the crop, offset by its origin (%o)',
    (orientation) => {
      const region = { x: 1000, y: 500, width: 6000, height: 4500 };
      const plan = planCroppedExport(region, orientation);
      expect(plan.tiled).toBe(true);
      expect(coverage(plan)).toBe(region.width * region.height);
      for (const tile of plan.tiles) {
        const src = tileSource(tile, plan);
        expect(src.x).toBeGreaterThanOrEqual(region.x);
        expect(src.y).toBeGreaterThanOrEqual(region.y);
        expect(src.x + src.width).toBeLessThanOrEqual(region.x + region.width);
        expect(src.y + src.height).toBeLessThanOrEqual(
          region.y + region.height
        );
      }
      expect(tileSource(plan.tiles[0], plan)).toMatchObject({
        x: 1000,
        y: 500,
      });
    }
  );

  it.each(orientations)(
    'places the tiles to fill the oriented file exactly once (%o)',
    (orientation) => {
      const plan = planCroppedExport(
        { x: 0, y: 0, width: 9000, height: 5000 },
        orientation
      );
      expect(plan.output).toEqual(
        orientation.quarterTurns % 2
          ? { width: 5000, height: 9000 }
          : { width: 9000, height: 5000 }
      );
      const placed = plan.tiles.map((t) => tilePlacement(t, plan));
      let area = 0;
      for (const p of placed) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x + p.width).toBeLessThanOrEqual(plan.output.width);
        expect(p.y + p.height).toBeLessThanOrEqual(plan.output.height);
        expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
        area += p.width * p.height;
      }
      expect(area).toBe(plan.output.width * plan.output.height);
      // No two tiles overlap.
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i];
          const b = placed[j];
          const apart =
            a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y;
          expect(apart).toBe(true);
        }
      }
    }
  );

  it('places a tile where the matrix sends it', () => {
    const orientation: Orientation = { quarterTurns: 1, mirrored: true };
    const plan = planCroppedExport(
      { x: 0, y: 0, width: 9000, height: 5000 },
      orientation
    );
    const tile = plan.tiles[1];
    const placed = tilePlacement(tile, plan);
    const a = applyMatrix(plan.matrix, tile);
    const b = applyMatrix(plan.matrix, {
      x: tile.x + tile.width,
      y: tile.y + tile.height,
    });
    expect(Math.min(a.x, b.x)).toBe(placed.x);
    expect(Math.min(a.y, b.y)).toBe(placed.y);
  });
});
