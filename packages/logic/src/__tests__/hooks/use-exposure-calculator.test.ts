import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useExposureCalculator } from '../../hooks/use-exposure-calculator';

describe('useExposureCalculator decimal-comma input (#318)', () => {
  it('reads "12,5" as 12.5 s, giving 25 s at +1 stop', () => {
    const { result } = renderHook(() => useExposureCalculator());

    act(() => {
      result.current.setStops('1');
      result.current.setOriginalTime('12,5');
    });

    expect(result.current.originalTime).toBe('12,5');
    expect(result.current.calculation?.originalTimeValue).toBe(12.5);
    expect(result.current.calculation?.newTimeValue).toBe(25);
  });

  it('still reads dot decimals the same way', () => {
    const { result } = renderHook(() => useExposureCalculator());

    act(() => {
      result.current.setStops('1');
      result.current.setOriginalTime('12.5');
    });

    expect(result.current.calculation?.newTimeValue).toBe(25);
  });

  it('keeps a comma stop value in the user separator', () => {
    const { result } = renderHook(() => useExposureCalculator());

    act(() => {
      result.current.setOriginalTime('10');
      result.current.setStops('-0,5');
    });

    expect(result.current.stops).toBe('-0,5');
    expect(result.current.calculation?.stopsValue).toBe(-0.5);
    expect(result.current.calculation?.newTimeValue).toBeCloseTo(7.07, 2);
  });

  it('lets a trailing comma through while typing stops', () => {
    const { result } = renderHook(() => useExposureCalculator());

    act(() => {
      result.current.setStops('1,');
    });

    expect(result.current.stops).toBe('1,');
  });

  it('steps a comma stop value with the stepper', () => {
    const { result } = renderHook(() => useExposureCalculator());

    act(() => {
      result.current.setStops('0,5');
    });
    act(() => {
      result.current.adjustStops(1 / 3);
    });

    expect(result.current.stops).toBe('0,83');
    expect(result.current.calculation?.stopsValue).toBe(0.83);
  });
});

describe('useExposureCalculator exact thirds (#551)', () => {
  it('computes a third of a stop exactly, not as 2^0.33', () => {
    const { result } = renderHook(() => useExposureCalculator());

    act(() => {
      result.current.setOriginalTime('12');
      result.current.setStops('0.33');
    });

    expect(result.current.newTime).toBe('15.12');
    expect(result.current.calculation?.newTimeValue).toBe(12 * 2 ** (1 / 3));
  });

  it('lands on exactly one stop after three third-stop steps', () => {
    const { result } = renderHook(() => useExposureCalculator());

    act(() => {
      result.current.setOriginalTime('12');
      result.current.setStops('0');
    });
    act(() => result.current.adjustStops(1 / 3));
    expect(result.current.calculation?.newTimeValue).toBe(12 * 2 ** (1 / 3));
    act(() => result.current.adjustStops(1 / 3));
    expect(result.current.calculation?.newTimeValue).toBe(12 * 2 ** (2 / 3));
    act(() => result.current.adjustStops(1 / 3));

    expect(result.current.stops).toBe('1');
    expect(result.current.calculation?.newTimeValue).toBe(24);
  });
});
