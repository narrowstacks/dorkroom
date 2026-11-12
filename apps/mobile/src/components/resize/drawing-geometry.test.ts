import { describe, expect, it } from 'vitest';
import {
  fitResizeBox,
  formatDimension,
  heightBars,
  LABEL_PAD_X,
  LABEL_PAD_Y,
  resizeLabels,
} from './drawing-geometry';

describe('fitResizeBox', () => {
  it('leaves room for the labels on the tighter axis', () => {
    expect(fitResizeBox({ width: 338, height: 200 })).toBe(
      200 - 2 * LABEL_PAD_Y
    );
    expect(fitResizeBox({ width: 100, height: 400 })).toBe(
      100 - 2 * LABEL_PAD_X
    );
  });

  it('is never negative', () => {
    expect(fitResizeBox({ width: 40, height: 10 })).toBe(0);
  });
});

describe('resizeLabels', () => {
  it('writes each dimension on the edge it names', () => {
    // 4x6 enlarged to 8x12 in a 120 box: new is 80x120, original 40x60.
    const labels = resizeLabels(4, 6, 8, 12, 120);
    const at = (key: string) => labels.find((l) => l.key === key);
    // Original 40x60 centred at (60, 60): x 40..80, y 30..90.
    expect(at('origW')).toEqual({ key: 'origW', x: 60, y: 30 });
    expect(at('origL')).toEqual({ key: 'origL', x: 40, y: 60 });
    // New 80x120: x 20..100, y 0..120.
    expect(at('newW')).toEqual({ key: 'newW', x: 60, y: 120 });
    expect(at('newL')).toEqual({ key: 'newL', x: 100, y: 60 });
  });

  it('returns nothing for a missing dimension', () => {
    expect(resizeLabels(0, 6, 8, 12, 120)).toEqual([]);
    expect(resizeLabels(4, 6, Number.NaN, 12, 120)).toEqual([]);
  });
});

describe('heightBars', () => {
  it('scales both columns from the same base', () => {
    expect(heightBars(40, 80, 100)).toEqual({ orig: 50, target: 100 });
  });

  it('is null without a height', () => {
    expect(heightBars(0, 0, 100)).toBeNull();
    expect(heightBars(Number.NaN, Number.NaN, 100)).toBeNull();
  });
});

describe('formatDimension', () => {
  it('trims to two decimals', () => {
    expect(formatDimension(15.24)).toBe('15.24');
    expect(formatDimension(10)).toBe('10');
    expect(formatDimension(9.8425197)).toBe('9.84');
  });
});
