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

  it('accepts a comma decimal separator (#318)', () => {
    expect(parseReciprocityTime('1,5')).toBe(1.5);
    expect(parseReciprocityTime('0,5s')).toBe(0.5);
    expect(parseReciprocityTime('2,5m')).toBe(150);
    expect(parseReciprocityTime('1,5h 30m')).toBe(7200);
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

    it('carries inputs that round across the minutes/hours boundary into 1h', () => {
      // These round to 3600 and so belong in the hours branch, but flooring
      // the raw seconds there would decompose them as the impossible "0h 59m".
      expect(formatReciprocityTime(3599.99)).toBe('1h');
      expect(formatReciprocityTime(3599.95)).toBe('1h');
    });

    it('carries a whole-hour rounding boundary within the hours branch', () => {
      // 7199.99 rounds to 7200 -- exactly 2h, not "1h 59m".
      expect(formatReciprocityTime(7199.99)).toBe('2h');
    });

    it('keeps truncating leftover seconds in the hours branch away from boundaries', () => {
      // Pre-existing behavior preserved: sub-minute leftovers in the hours
      // branch are dropped, not rounded (3661s is 1h 1m 1s -> "1h 1m").
      expect(formatReciprocityTime(3661)).toBe('1h 1m');
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

  it('formats the metered time for display as it is typed', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    // Default metered time is 30s.
    expect(result.current.formattedTime).toBe('30s');

    act(() => {
      result.current.setMeteredTime('2m 5s');
    });

    expect(result.current.formattedTime).toBe('2m 5s');
    expect(result.current.timeFormatError).toBeNull();
  });

  it('reports a format error and clears the display for unparseable input', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setMeteredTime('abc');
    });

    expect(result.current.timeFormatError).toBe(
      'Invalid time format. Try: 30s, 1m30s, 1h15m'
    );
    expect(result.current.formattedTime).toBeNull();

    act(() => {
      result.current.setMeteredTime('45s');
    });

    expect(result.current.timeFormatError).toBeNull();
    expect(result.current.formattedTime).toBe('45s');
  });

  it('clears the display without an error when the input is emptied', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setMeteredTime('');
    });

    expect(result.current.timeFormatError).toBeNull();
    expect(result.current.formattedTime).toBeNull();
  });

  it('never reports a format error from setMeteredTimeDirectly', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setMeteredTimeDirectly('abc');
    });

    expect(result.current.meteredTime).toBe('abc');
    expect(result.current.timeFormatError).toBeNull();
    expect(result.current.formattedTime).toBeNull();
  });

  it('keeps the last valid calculation while the input is unparseable', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setMeteredTime('60s');
    });
    const valid = result.current.calculation;
    expect(valid?.originalTime).toBe(60);

    act(() => {
      result.current.setMeteredTime('abc');
    });

    expect(result.current.calculation).toEqual(valid);

    act(() => {
      result.current.setMeteredTime('10s');
    });

    expect(result.current.calculation?.originalTime).toBe(10);
  });

  it('applies a comma-decimal custom factor (#318)', () => {
    const comma = renderHook(() => useReciprocityCalculator());
    const dot = renderHook(() => useReciprocityCalculator());

    act(() => {
      comma.result.current.setFilmType('custom');
      comma.result.current.setCustomFactor('1,3');
      comma.result.current.setMeteredTime('30s');
      dot.result.current.setFilmType('custom');
      dot.result.current.setCustomFactor('1.3');
      dot.result.current.setMeteredTime('30s');
    });

    expect(comma.result.current.customFactor).toBe('1,3');
    expect(comma.result.current.calculation?.factor).toBe(1.3);
    expect(comma.result.current.calculation?.adjustedTime).toBeCloseTo(
      30 ** 1.3,
      5
    );
    expect(comma.result.current.calculation?.adjustedTime).toBe(
      dot.result.current.calculation?.adjustedTime
    );
  });

  it('parses a comma-decimal metered time (#318)', () => {
    const { result } = renderHook(() => useReciprocityCalculator());

    act(() => {
      result.current.setMeteredTime('1,5');
    });

    expect(result.current.calculation?.originalTime).toBe(1.5);
  });
});
