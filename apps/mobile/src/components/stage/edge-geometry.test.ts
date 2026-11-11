import { describe, expect, it } from 'vitest';
import type { Edge } from './edge-drag';
import { edgeBarRect, edgeHitRects, type EdgeRect } from './edge-geometry';

const overlap = (a: EdgeRect, b: EdgeRect) =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

const EDGES: Edge[] = ['left', 'right', 'top', 'bottom'];

describe('edgeHitRects with a left limit', () => {
  it('never starts a target left of it, and still never overlaps', () => {
    for (const left of [0, 5, 14, 30]) {
      const rects = edgeHitRects(
        { left, top: 40, width: 200, height: 150 },
        44,
        14
      );
      for (const a of EDGES) {
        expect(rects[a].left, `${a} at ${left}`).toBeGreaterThanOrEqual(14);
        expect(rects[a].width).toBeGreaterThanOrEqual(0);
        for (const b of EDGES) {
          if (a !== b) expect(overlap(rects[a], rects[b])).toBe(false);
        }
      }
    }
  });

  it('leaves the target alone when it is already clear', () => {
    const r = edgeHitRects(
      { left: 60, top: 40, width: 200, height: 150 },
      44,
      14
    );
    expect(r.left.left).toBe(38);
    expect(r.left.width).toBe(44);
  });
});

describe('edgeHitRects', () => {
  it('centres a 44pt target on each edge of a roomy rectangle, short of the corners', () => {
    const r = edgeHitRects({ left: 40, top: 60, width: 200, height: 150 }, 44);
    expect(r.left).toEqual({ left: 18, top: 82, width: 44, height: 106 });
    expect(r.right).toEqual({ left: 218, top: 82, width: 44, height: 106 });
    expect(r.top).toEqual({ left: 62, top: 38, width: 156, height: 44 });
    expect(r.bottom).toEqual({ left: 62, top: 188, width: 156, height: 44 });
  });

  it('never overlaps two targets, at any size down to nothing', () => {
    for (const width of [0, 1, 7, 20, 43, 44, 60, 87, 88, 100, 200, 340]) {
      for (const height of [0, 1, 6, 20, 43, 44, 70, 87, 88, 150, 300]) {
        const rects = edgeHitRects({ left: 33, top: 61, width, height }, 44);
        for (const a of EDGES) {
          for (const b of EDGES) {
            if (a === b) continue;
            expect(
              overlap(rects[a], rects[b]),
              `${a}/${b} ${width}x${height}`
            ).toBe(false);
          }
        }
      }
    }
  });

  it('keeps each target on its own side of a zero-size rectangle', () => {
    const r = edgeHitRects({ left: 100, top: 200, width: 0, height: 0 }, 44);
    // Left and right sit either side of the point, top and bottom above and below.
    expect(r.left.left + r.left.width).toBeLessThanOrEqual(100);
    expect(r.right.left).toBeGreaterThanOrEqual(100);
    expect(r.top.top + r.top.height).toBeLessThanOrEqual(200);
    expect(r.bottom.top).toBeGreaterThanOrEqual(200);
    for (const e of EDGES) {
      expect(Math.min(r[e].width, r[e].height)).toBe(44);
      expect(Math.max(r[e].width, r[e].height)).toBe(44);
    }
  });

  it('keeps a target across its edge while the rectangle is big enough', () => {
    const rect = { left: 40, top: 60, width: 100, height: 100 };
    const r = edgeHitRects(rect, 44);
    expect(r.left.left).toBeLessThan(rect.left);
    expect(r.left.left + r.left.width).toBeGreaterThan(rect.left);
  });
});

describe('edgeBarRect', () => {
  it('draws the bar on the edge line, centred along it', () => {
    const rect = { left: 40, top: 60, width: 200, height: 150 };
    expect(edgeBarRect('left', rect, 4)).toEqual({
      left: 38,
      top: 135 - 14,
      width: 4,
      height: 28,
    });
    expect(edgeBarRect('bottom', rect, 4)).toEqual({
      left: 140 - 14,
      top: 208,
      width: 28,
      height: 4,
    });
  });

  it('shortens the bar on a short edge but never below a stub', () => {
    const rect = { left: 0, top: 0, width: 30, height: 10 };
    expect(edgeBarRect('top', rect, 4).width).toBeCloseTo(18, 6);
    expect(edgeBarRect('left', rect, 4).height).toBe(12);
  });
});
