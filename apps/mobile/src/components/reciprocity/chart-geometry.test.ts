import { describe, expect, it } from 'vitest';
import { buildReciprocityCurve, logScale, pointFor } from './chart-geometry';

describe('chart-geometry', () => {
  it('maps the geometric midpoint to the range midpoint on a log scale', () => {
    expect(logScale(10, 1, 100, 0, 100)).toBeCloseTo(50, 5);
  });

  it('clamps non-positive values to the range minimum', () => {
    expect(logScale(0, 1, 100, 0, 100)).toBe(0);
  });

  it('builds a curve spanning the padded plot width', () => {
    const pts = buildReciprocityCurve({
      factor: 1.5,
      minTime: 1,
      maxTime: 100,
      width: 300,
      height: 200,
      padding: 20,
      samples: 10,
    });
    expect(pts).toHaveLength(11);
    expect(pts[0].x).toBeCloseTo(20, 5);
    expect(pts[pts.length - 1].x).toBeCloseTo(280, 5);
  });

  it('places a marker for a metered time inside the plot area', () => {
    const p = pointFor(30, {
      factor: 1.5,
      minTime: 1,
      maxTime: 100,
      width: 300,
      height: 200,
      padding: 20,
    });
    expect(p.x).toBeGreaterThan(20);
    expect(p.x).toBeLessThan(280);
    expect(p.y).toBeGreaterThan(20);
    expect(p.y).toBeLessThan(180);
  });
});
