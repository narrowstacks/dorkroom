import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  formatReciprocityTime,
  parseReciprocityTime,
  useReciprocityCalculator,
} from '../../hooks/use-reciprocity-calculator';

describe('parseReciprocityTime', () => {
  it('parses compound time strings', () => {
    expect(parseReciprocityTime('30s')).toBe(30);
    expect(parseReciprocityTime('2m 30s')).toBe(150);
    expect(parseReciprocityTime('1h 15m')).toBe(4500);
  });

  it('parses plain numeric strings as seconds', () => {
    expect(parseReciprocityTime('45')).toBe(45);
    expect(parseReciprocityTime('0.5')).toBe(0.5);
  });

  it('returns null for invalid or empty input', () => {
    expect(parseReciprocityTime('abc')).toBeNull();
    expect(parseReciprocityTime('')).toBeNull();
  });
});

describe('formatReciprocityTime', () => {
  it('formats sub-minute durations with one decimal place', () => {
    expect(formatReciprocityTime(15.5)).toBe('15.5s');
  });

  it('formats minute-scale durations as minutes and seconds', () => {
    expect(formatReciprocityTime(125)).toBe('2m 5s');
  });

  it('formats hour-scale durations as whole hours', () => {
    expect(formatReciprocityTime(3600)).toBe('1h');
  });

  describe('rollover regressions (must FAIL before the formatter fix)', () => {
    it('rounds 59.98s up into 1m rather than the impossible 60s', () => {
      // Math.round(59.98 * 10) / 10 === 60, which the un-fixed formatter
      // prints verbatim as "60s" instead of carrying into the next unit.
      expect(formatReciprocityTime(59.98)).toBe('1m');
    });

    it('rounds 119.99s up into 2m rather than the impossible 1m 60s', () => {
      // Same rollover one level up: the un-fixed formatter decomposes into
      // minutes/seconds before rounding, so the rounded remainder hits 60.
      expect(formatReciprocityTime(119.99)).toBe('2m');
    });
  });
});

describe('useReciprocityCalculator', () => {
  it('lengthens a known long exposure (30s metered on Tri-X, the default state)', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    // Default film type is Tri-X (factor 1.54) and default metered time is 30s.
    // 30 ** 1.54 ≈ 188.26 -- reciprocity failure at long exposures lengthens time.
    expect(result.current.calculation).not.toBeNull();
    expect(result.current.calculation?.factor).toBeCloseTo(1.54, 2);
    expect(result.current.calculation?.adjustedTime).toBeCloseTo(188.26, 1);
    expect(result.current.calculation?.percentageIncrease).toBeGreaterThan(0);
  });

  it('never shortens a sub-1s exposure (must FAIL before the clamp fix)', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setMeteredTime('0.5s');
    });

    // Unclamped, 0.5 ** 1.54 ≈ 0.34 -- physically backwards. The corrected
    // time must pass through unchanged below the 1s reciprocity threshold.
    expect(result.current.calculation?.originalTime).toBe(0.5);
    expect(result.current.calculation?.adjustedTime).toBe(0.5);
    expect(result.current.calculation?.adjustedTime).toBeGreaterThanOrEqual(
      result.current.calculation?.originalTime ?? Number.POSITIVE_INFINITY
    );
  });

  it('holds the 1s boundary at exactly 1s regardless of film factor', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setMeteredTime('1s');
    });

    expect(result.current.calculation?.originalTime).toBe(1);
    expect(result.current.calculation?.adjustedTime).toBe(1);
  });

  it('applies the power law just above the 1s boundary (2s on Tri-X)', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setMeteredTime('2s');
    });

    // 2 ** 1.54 ≈ 2.91
    expect(result.current.calculation?.adjustedTime).toBeCloseTo(2.91, 2);
    expect(result.current.calculation?.adjustedTime).toBeGreaterThan(
      result.current.calculation?.originalTime ?? Number.POSITIVE_INFINITY
    );
  });

  it('never reports a negative percentage increase across long, boundary, and sub-1s inputs', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    for (const meteredTime of ['30s', '1s', '2s', '0.5s']) {
      act(() => {
        result.current.setMeteredTime(meteredTime);
      });
      expect(
        result.current.calculation?.percentageIncrease
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('respects the never-shorter invariant for a sub-1s input under a custom factor', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setFilmType('custom');
      result.current.setCustomFactor('1.8');
      result.current.setMeteredTime('0.4s');
    });

    expect(result.current.calculation?.factor).toBeCloseTo(1.8, 2);
    expect(result.current.calculation?.originalTime).toBe(0.4);
    expect(result.current.calculation?.adjustedTime).toBe(0.4);
    expect(result.current.calculation?.adjustedTime).toBeGreaterThanOrEqual(
      result.current.calculation?.originalTime ?? Number.POSITIVE_INFINITY
    );
  });
});
