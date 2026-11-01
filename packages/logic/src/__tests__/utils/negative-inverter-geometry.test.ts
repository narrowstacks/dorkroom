import { describe, expect, it } from 'vitest';
import {
  dragCropRect,
  fitLongEdge,
  formatMegapixels,
  isFullCrop,
  MAX_CANVAS_PIXELS,
  planExportSize,
  planTiles,
  scalePoint,
  scaleRect,
  screenToImagePoint,
} from '../../utils/negative-inverter-geometry';

describe('fitLongEdge', () => {
  it('scales a landscape photo so its long edge matches', () => {
    expect(fitLongEdge({ width: 8064, height: 6048 }, 2048)).toEqual({
      width: 2048,
      height: 1536,
    });
  });

  it('scales a portrait photo by its height', () => {
    expect(fitLongEdge({ width: 3000, height: 4000 }, 2048)).toEqual({
      width: 1536,
      height: 2048,
    });
  });

  it('never scales a small photo up', () => {
    expect(fitLongEdge({ width: 800, height: 600 }, 2048)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('keeps an extreme panorama at least one pixel tall', () => {
    expect(fitLongEdge({ width: 100_000, height: 10 }, 2048).height).toBe(1);
  });
});

describe('planExportSize', () => {
  it('exports a 12 MP photo at its own size', () => {
    expect(planExportSize({ width: 4032, height: 3024 })).toEqual({
      width: 4032,
      height: 3024,
      sourceWidth: 4032,
      sourceHeight: 3024,
      downscaled: false,
    });
  });

  it('exports exactly at the cap without scaling', () => {
    const plan = planExportSize({ width: 4096, height: 4096 });
    expect(plan.downscaled).toBe(false);
    expect(plan.width * plan.height).toBe(MAX_CANVAS_PIXELS);
  });

  it('fits a 48 MP photo under the iOS Safari canvas cap', () => {
    const plan = planExportSize({ width: 8064, height: 6048 });
    expect(plan.downscaled).toBe(true);
    expect(plan.width * plan.height).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
    // As large as possible: one more pixel on either side would not fit, or
    // would break the aspect ratio by more than a pixel.
    expect((plan.width + 1) * (plan.height + 1)).toBeGreaterThan(
      MAX_CANVAS_PIXELS
    );
    expect(plan.width / plan.height).toBeCloseTo(8064 / 6048, 2);
    expect(plan.sourceWidth).toBe(8064);
    expect(plan.sourceHeight).toBe(6048);
  });

  it('respects the longest side limit for a long strip', () => {
    const plan = planExportSize(
      { width: 30_000, height: 1000 },
      { maxPixels: MAX_CANVAS_PIXELS, maxSide: 16_384 }
    );
    expect(plan.width).toBe(16_384);
    expect(plan.height).toBe(546);
    expect(plan.downscaled).toBe(true);
  });

  it('honours custom limits', () => {
    const plan = planExportSize(
      { width: 1000, height: 1000 },
      { maxPixels: 250_000, maxSide: 10_000 }
    );
    expect(plan).toMatchObject({ width: 500, height: 500, downscaled: true });
  });
});

describe('planTiles', () => {
  it('covers the image exactly, row by row, with no overlap', () => {
    const tiles = planTiles({ width: 5000, height: 3000 }, 2048);
    expect(tiles).toHaveLength(6);
    expect(tiles[0]).toEqual({ x: 0, y: 0, width: 2048, height: 2048 });
    expect(tiles[2]).toEqual({ x: 4096, y: 0, width: 904, height: 2048 });
    expect(tiles[5]).toEqual({ x: 4096, y: 2048, width: 904, height: 952 });
    const area = tiles.reduce((sum, t) => sum + t.width * t.height, 0);
    expect(area).toBe(5000 * 3000);
  });

  it('returns one tile when the image fits', () => {
    expect(planTiles({ width: 800, height: 600 }, 4096)).toEqual([
      { x: 0, y: 0, width: 800, height: 600 },
    ]);
  });
});

describe('coordinate mapping', () => {
  const proxy = { width: 2048, height: 1536 };
  const original = { width: 8064, height: 6048 };

  it('maps a proxy point to the original', () => {
    expect(scalePoint({ x: 1024, y: 768 }, proxy, original)).toEqual({
      x: 4032,
      y: 3024,
    });
  });

  it('maps a proxy crop to the original, rounding outward', () => {
    const rect = scaleRect(
      { x: 100, y: 50, width: 1000, height: 700 },
      proxy,
      original
    );
    expect(rect).toEqual({ x: 393, y: 196, width: 3939, height: 2758 });
  });

  it('maps the full proxy to the full original', () => {
    expect(
      scaleRect({ x: 0, y: 0, width: 2048, height: 1536 }, proxy, original)
    ).toEqual({ x: 0, y: 0, width: 8064, height: 6048 });
  });

  it('round-trips a crop without growing it', () => {
    const crop = { x: 512, y: 384, width: 1024, height: 768 };
    const there = scaleRect(crop, proxy, original);
    expect(scaleRect(there, original, proxy)).toEqual(crop);
  });

  it('maps a pointer on a scaled-down element to image pixels', () => {
    const box = { left: 20, top: 100, width: 512, height: 384 };
    expect(screenToImagePoint({ x: 276, y: 292 }, box, proxy)).toEqual({
      x: 1024,
      y: 768,
    });
  });

  it('clamps a pointer outside the element to the image', () => {
    const box = { left: 0, top: 0, width: 100, height: 75 };
    expect(screenToImagePoint({ x: -50, y: 500 }, box, proxy)).toEqual({
      x: 0,
      y: 1535,
    });
  });
});

describe('formatMegapixels', () => {
  it('rounds down to whole megapixels from 10 up, like camera specs', () => {
    expect(formatMegapixels({ width: 8064, height: 6048 })).toBe('48 MP');
    expect(formatMegapixels({ width: 4096, height: 4096 })).toBe('16 MP');
    expect(formatMegapixels({ width: 4032, height: 3024 })).toBe('12 MP');
  });

  it('keeps one decimal below 10 MP', () => {
    expect(formatMegapixels({ width: 2048, height: 1536 })).toBe('3.1 MP');
    expect(formatMegapixels({ width: 10, height: 10 })).toBe('0.1 MP');
  });
});

describe('dragCropRect', () => {
  const bounds = { width: 1000, height: 800 };
  const start = { x: 100, y: 100, width: 400, height: 300 };

  it('moves the whole rectangle', () => {
    expect(dragCropRect(start, 'move', 50, -20, bounds)).toEqual({
      x: 150,
      y: 80,
      width: 400,
      height: 300,
    });
  });

  it('stops a move at the image edge', () => {
    expect(dragCropRect(start, 'move', 5000, -5000, bounds)).toEqual({
      x: 600,
      y: 0,
      width: 400,
      height: 300,
    });
  });

  it('drags a corner, moving only its two edges', () => {
    expect(dragCropRect(start, 'nw', -50, 30, bounds)).toEqual({
      x: 50,
      y: 130,
      width: 450,
      height: 270,
    });
    expect(dragCropRect(start, 'se', 20, 40, bounds)).toEqual({
      x: 100,
      y: 100,
      width: 420,
      height: 340,
    });
  });

  it('drags one edge', () => {
    expect(dragCropRect(start, 'e', 1000, 999, bounds)).toEqual({
      x: 100,
      y: 100,
      width: 900,
      height: 300,
    });
    expect(dragCropRect(start, 'n', 0, -500, bounds)).toEqual({
      x: 100,
      y: 0,
      width: 400,
      height: 400,
    });
  });

  it('keeps a minimum size when an edge is dragged past its opposite', () => {
    const rect = dragCropRect(start, 'w', 1000, 0, bounds, 16);
    expect(rect).toEqual({ x: 484, y: 100, width: 16, height: 300 });
  });
});

describe('isFullCrop', () => {
  it('detects a crop that covers the image', () => {
    const size = { width: 100, height: 50 };
    expect(isFullCrop({ x: 0, y: 0, width: 100, height: 50 }, size)).toBe(true);
    expect(isFullCrop({ x: 1, y: 0, width: 99, height: 50 }, size)).toBe(false);
  });
});
