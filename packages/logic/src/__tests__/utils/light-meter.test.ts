import { describe, expect, it } from 'vitest';
import { calculateEV } from '../../utils/camera-exposure-calculations';
import { evFromCameraReading, smoothEv } from '../../utils/light-meter';

describe('evFromCameraReading', () => {
  it('matches calculateEV plus the calibration offset', () => {
    // f/1.8, 1/60s, ISO 100 with no offset.
    const expected = calculateEV(1.8, 1 / 60, 100);
    expect(evFromCameraReading(1 / 60, 100, 1.8, 0)).toBeCloseTo(expected, 6);
  });

  it('adds the calibration offset in stops', () => {
    const base = evFromCameraReading(1 / 60, 100, 1.8, 0);
    expect(evFromCameraReading(1 / 60, 100, 1.8, 1)).toBeCloseTo(base + 1, 6);
    expect(evFromCameraReading(1 / 60, 100, 1.8, -0.5)).toBeCloseTo(
      base - 0.5,
      6
    );
  });

  it('returns NaN for non-positive or non-finite readings', () => {
    expect(evFromCameraReading(0, 100, 1.8, 0)).toBeNaN();
    expect(evFromCameraReading(1 / 60, 0, 1.8, 0)).toBeNaN();
    expect(evFromCameraReading(Number.NaN, 100, 1.8, 0)).toBeNaN();
    expect(
      evFromCameraReading(1 / 60, Number.POSITIVE_INFINITY, 1.8, 0)
    ).toBeNaN();
  });
});

describe('smoothEv', () => {
  it('returns the median of an odd-length sample set', () => {
    expect(smoothEv([10, 12, 11])).toBe(11);
  });

  it('averages the two middle values for an even-length set', () => {
    expect(smoothEv([10, 12, 11, 13])).toBe(11.5);
  });

  it('ignores non-finite samples', () => {
    expect(smoothEv([10, Number.NaN, 12, Number.POSITIVE_INFINITY, 11])).toBe(
      11
    );
  });

  it('returns NaN when there are no finite samples', () => {
    expect(smoothEv([])).toBeNaN();
    expect(smoothEv([Number.NaN])).toBeNaN();
  });
});
