import { describe, expect, it } from 'vitest';
import {
  buildCurve,
  computeChartLayout,
  meteredAtX,
  scaleX,
  scaleY,
} from './chart-geometry';

const PADDING = { top: 10, right: 10, bottom: 30, left: 40 };

function layout() {
  return computeChartLayout({
    originalTime: 30,
    adjustedTime: 200,
    factor: 1.5,
    width: 300,
    height: 200,
    padding: PADDING,
  });
}

describe('chart-geometry', () => {
  it('floors maxMetered at 300 and gives the curve headroom', () => {
    const l = layout();
    expect(l.maxMetered).toBe(300); // max(300, 30*1.5)
    // maxAdjusted = max(200*1.3, 300^1.5) -> the curve top dominates here
    expect(l.maxAdjusted).toBeCloseTo(300 ** 1.5, 5);
  });

  it('maps the metered range across the plotted width', () => {
    const l = layout();
    expect(scaleX(0, l)).toBeCloseTo(PADDING.left, 5);
    expect(scaleX(l.maxMetered, l)).toBeCloseTo(l.width - PADDING.right, 5);
  });

  it('maps adjusted=0 to the baseline and the max to the top', () => {
    const l = layout();
    expect(scaleY(0, l)).toBeCloseTo(l.height - PADDING.bottom, 5);
    expect(scaleY(l.maxAdjusted, l)).toBeCloseTo(PADDING.top, 5);
  });

  it('meteredAtX inverts scaleX and clamps out-of-range input', () => {
    const l = layout();
    expect(meteredAtX(scaleX(120, l), l)).toBeCloseTo(120, 5);
    expect(meteredAtX(-1000, l)).toBe(0); // clamped low
    expect(meteredAtX(10000, l)).toBeCloseTo(l.maxMetered, 5); // clamped high
  });

  it('builds a curve spanning the plot, anchored at the origin', () => {
    const l = layout();
    const pts = buildCurve(l, 1.5, 10);
    expect(pts).toHaveLength(11);
    expect(pts[0].x).toBeCloseTo(PADDING.left, 5);
    expect(pts[0].y).toBeCloseTo(l.height - PADDING.bottom, 5); // metered 0 -> adjusted 0
    expect(pts[pts.length - 1].x).toBeCloseTo(l.width - PADDING.right, 5);
  });
});
