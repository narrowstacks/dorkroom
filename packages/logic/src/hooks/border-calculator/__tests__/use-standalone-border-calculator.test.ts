import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CALCULATION_CONSTANTS } from '../../../constants/calculations';
import { useStandaloneBorderCalculator } from '../index';

const DELAY = CALCULATION_CONSTANTS.DEBOUNCE_WARNING_DELAY;

describe('useStandaloneBorderCalculator', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives warnings from the inputs and shows them after the debounce', () => {
    const { result } = renderHook(() => useStandaloneBorderCalculator());
    expect(result.current.minBorderWarning).toBeNull();

    // 4in on 8x10 leaves no print area: the layout falls back to 0.5in.
    act(() => {
      result.current.setMinBorderSlider(4);
    });

    // The calculation carries the warning at once ...
    expect(result.current.calculation.minBorderWarning).toBe(
      'Minimum border too large; using 0.5.'
    );
    // ... the top-level one trails it so the card does not flash mid-drag.
    expect(result.current.minBorderWarning).toBeNull();

    act(() => {
      vi.advanceTimersByTime(DELAY - 1);
    });
    expect(result.current.minBorderWarning).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.minBorderWarning).toBe(
      'Minimum border too large; using 0.5.'
    );

    // Back in range: the warning clears after the same delay.
    act(() => {
      result.current.setMinBorderSlider(1);
    });
    expect(result.current.calculation.minBorderWarning).toBeNull();
    expect(result.current.minBorderWarning).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    expect(result.current.minBorderWarning).toBeNull();
  });

  it('restarts the delay only when a warning changes, not on every input', () => {
    const { result } = renderHook(() => useStandaloneBorderCalculator());

    act(() => {
      result.current.setMinBorderSlider(4);
    });
    act(() => {
      vi.advanceTimersByTime(DELAY - 50);
    });
    // An input change that leaves every warning string the same.
    act(() => {
      result.current.setShowBlades(false);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.minBorderWarning).toBe(
      'Minimum border too large; using 0.5.'
    );
  });

  it('clears the shown warnings at once on reset', () => {
    const { result } = renderHook(() => useStandaloneBorderCalculator());

    act(() => {
      result.current.setMinBorderSlider(4);
    });
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    expect(result.current.minBorderWarning).not.toBeNull();

    act(() => {
      result.current.resetToDefaults();
    });
    // No timers advanced: the card must not linger after a reset.
    expect(result.current.minBorderWarning).toBeNull();
    expect(result.current.minBorder).toBe(0.5);
  });

  it('writes the last valid min border back into state immediately', () => {
    const { result } = renderHook(() => useStandaloneBorderCalculator());

    act(() => {
      result.current.setMinBorderSlider(1.25);
    });
    expect(result.current.calculation.lastValidMinBorder).toBe(1.25);

    // An out-of-range value keeps the last valid one as the fallback.
    act(() => {
      result.current.setMinBorderSlider(4);
    });
    expect(result.current.calculation.lastValidMinBorder).toBe(1.25);
    expect(result.current.calculation.minBorderWarning).toBe(
      'Minimum border too large; using 1.25.'
    );
  });
});
