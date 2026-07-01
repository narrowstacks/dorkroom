import { describe, expect, it } from 'vitest';
import { computePreviewRects } from '../aspect-preview-geometry';

describe('computePreviewRects', () => {
  it('scales both rects by a shared factor and centers them in the box', () => {
    const { orig, target } = computePreviewRects(4, 6, 6, 9, 120);
    // shared scale = 120 / max(4,6,6,9) = 120/9
    expect(target.w).toBeCloseTo(80, 5);
    expect(target.h).toBeCloseTo(120, 5);
    expect(target.x).toBeCloseTo(20, 5);
    expect(target.y).toBeCloseTo(0, 5);
    expect(orig.w).toBeCloseTo(53.3333, 3);
    expect(orig.h).toBeCloseTo(80, 5);
    expect(orig.x).toBeCloseTo(33.3333, 3);
    expect(orig.y).toBeCloseTo(20, 5);
  });

  it('returns zero rects for non-positive input', () => {
    const { orig, target } = computePreviewRects(0, 0, 0, 0, 120);
    expect(orig).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(target).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it('returns zero rects when a dimension is not finite', () => {
    const { orig, target } = computePreviewRects(4, Number.NaN, 6, 9, 120);
    expect(orig).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(target).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});
