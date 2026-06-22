import { describe, expect, it } from 'vitest';
import {
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
} from '../../constants/camera-exposure-defaults';
import { calculateEV } from '../../utils/camera-exposure-calculations';
import {
  evFromCameraReading,
  smoothEv,
  snapToStandardStop,
} from '../../utils/light-meter';

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

describe('snapToStandardStop', () => {
  it('snaps a near-standard shutter to the obvious nearest value', () => {
    // 1/247s is essentially 1/250s — nearest wins, not 1/125.
    const snapped = snapToStandardStop(1 / 247, STANDARD_SHUTTER_SPEEDS, true);
    expect(snapped.standard.label).toBe('1/250');
    // 1/250 is a touch faster than 1/247, so it slightly under-exposes.
    expect(snapped.stopError).toBeLessThan(0);
    expect(snapped.stopError).toBeCloseTo(-0.017, 2);
  });

  it('returns an exact standard shutter with zero error', () => {
    const snapped = snapToStandardStop(1 / 125, STANDARD_SHUTTER_SPEEDS, true);
    expect(snapped.standard.label).toBe('1/125');
    expect(snapped.stopError).toBeCloseTo(0, 6);
  });

  it('rounds a half-stop shutter tie toward more exposure (slower)', () => {
    // Geometric mean of 1/125 and 1/250 is the exact half-stop midpoint;
    // the brighter choice is the slower 1/125, +0.5 stop over.
    const midpoint = 1 / Math.sqrt(125 * 250);
    const snapped = snapToStandardStop(midpoint, STANDARD_SHUTTER_SPEEDS, true);
    expect(snapped.standard.label).toBe('1/125');
    expect(snapped.stopError).toBeCloseTo(0.5, 5);
  });

  it('snaps a near-standard aperture to the nearest value', () => {
    expect(
      snapToStandardStop(7.8, STANDARD_APERTURES, false).standard.label
    ).toBe('f/8');
  });

  it('rounds a half-stop aperture tie toward more exposure (wider)', () => {
    // Geometric mean of f/5.6 and f/8 is the half-stop midpoint;
    // the brighter choice is the wider f/5.6, ~+0.5 stop over.
    const midpoint = Math.sqrt(5.6 * 8);
    const snapped = snapToStandardStop(midpoint, STANDARD_APERTURES, false);
    expect(snapped.standard.label).toBe('f/5.6');
    expect(snapped.stopError).toBeCloseTo(0.515, 2);
  });

  it('reports zero error for invalid input', () => {
    expect(
      snapToStandardStop(Number.NaN, STANDARD_APERTURES, false).stopError
    ).toBe(0);
  });
});
