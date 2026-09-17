import { describe, expect, it } from 'vitest';
import {
  calculateResizeExposure,
  matchesAspectRatio,
  type ResizeExposureInput,
} from '../../utils/resize-calculations';

/** A 6x4 print at 10s, with enlarger heights standing by for the other mode. */
const BASE: ResizeExposureInput = {
  isEnlargerHeightMode: false,
  originalTime: 10,
  originalWidth: 6,
  originalLength: 4,
  newWidth: 9,
  newLength: 6,
  originalHeight: 12,
  newHeight: 36,
};

describe('calculateResizeExposure — print size mode', () => {
  it('scales exposure by the ratio of print areas', () => {
    // 6x4 = 24 sq in, 9x6 = 54 sq in, ratio 2.25 -> 22.5s, log2(2.25) = 1.17
    const result = calculateResizeExposure(BASE);
    expect(result.newTime).toBe('22.5');
    expect(result.stopsDifference).toBe('1.17');
  });

  it('reports a negative stop difference when printing smaller', () => {
    const result = calculateResizeExposure({
      ...BASE,
      newWidth: 3,
      newLength: 2,
    });
    // 6 sq in from 24 -> quarter the area -> -2 stops
    expect(result.newTime).toBe('2.5');
    expect(result.stopsDifference).toBe('-2.00');
  });

  it('leaves exposure unchanged at the same size', () => {
    const result = calculateResizeExposure({
      ...BASE,
      newWidth: 6,
      newLength: 4,
    });
    expect(result.newTime).toBe('10.0');
    expect(result.stopsDifference).toBe('0.00');
  });

  it('returns empty strings when any dimension or the time is unusable', () => {
    const empty = { newTime: '', stopsDifference: '' };
    expect(calculateResizeExposure({ ...BASE, originalTime: 0 })).toEqual(
      empty
    );
    expect(calculateResizeExposure({ ...BASE, originalWidth: 0 })).toEqual(
      empty
    );
    expect(calculateResizeExposure({ ...BASE, newLength: -2 })).toEqual(empty);
    expect(calculateResizeExposure({ ...BASE, newWidth: Number.NaN })).toEqual(
      empty
    );
  });

  it('ignores enlarger heights in print size mode', () => {
    const result = calculateResizeExposure({
      ...BASE,
      originalHeight: Number.NaN,
      newHeight: Number.NaN,
    });
    expect(result.newTime).toBe('22.5');
  });
});

describe('calculateResizeExposure — enlarger height mode', () => {
  const HEIGHT_MODE = { ...BASE, isEnlargerHeightMode: true };

  it('scales exposure by the ratio of squared heights', () => {
    // 36^2 / 12^2 = 9 -> 90s, log2(9) = 3.17
    const result = calculateResizeExposure(HEIGHT_MODE);
    expect(result.newTime).toBe('90.0');
    expect(result.stopsDifference).toBe('3.17');
  });

  it('returns empty strings when a height or the time is unusable', () => {
    const empty = { newTime: '', stopsDifference: '' };
    expect(
      calculateResizeExposure({ ...HEIGHT_MODE, originalHeight: 0 })
    ).toEqual(empty);
    expect(calculateResizeExposure({ ...HEIGHT_MODE, newHeight: -1 })).toEqual(
      empty
    );
    expect(
      calculateResizeExposure({ ...HEIGHT_MODE, originalTime: Number.NaN })
    ).toEqual(empty);
  });

  it('ignores print dimensions in height mode', () => {
    const result = calculateResizeExposure({
      ...HEIGHT_MODE,
      originalWidth: 0,
      newLength: Number.NaN,
    });
    expect(result.newTime).toBe('90.0');
  });
});

describe('matchesAspectRatio', () => {
  const DIMS = {
    isEnlargerHeightMode: false,
    originalWidth: 6,
    originalLength: 4,
    newWidth: 9,
    newLength: 6,
  };

  it('matches proportional prints', () => {
    expect(matchesAspectRatio(DIMS)).toBe(true);
  });

  it('rejects a different aspect ratio', () => {
    expect(matchesAspectRatio({ ...DIMS, newWidth: 10 })).toBe(false);
  });

  it('always matches in enlarger height mode', () => {
    expect(
      matchesAspectRatio({
        ...DIMS,
        isEnlargerHeightMode: true,
        newWidth: 10,
      })
    ).toBe(true);
  });

  it('reports a match for half-typed input rather than warning early', () => {
    expect(matchesAspectRatio({ ...DIMS, newWidth: 0 })).toBe(true);
    expect(matchesAspectRatio({ ...DIMS, originalLength: Number.NaN })).toBe(
      true
    );
  });
});
