import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { calculateEV } from '../../utils/camera-exposure-calculations';
import { useLightMeterSolver } from '../use-light-meter-solver';

describe('useLightMeterSolver', () => {
  it('is invalid when EV is null or NaN', () => {
    const { result } = renderHook(() => useLightMeterSolver(null));
    expect(result.current.solution.isValid).toBe(false);
    expect(result.current.solution.solvedLabel).toBe('—');
  });

  it('solves shutter speed in aperture-priority (default)', () => {
    // Scene EV100 = 12. Default aperture f/8, ISO 100.
    const { result } = renderHook(() => useLightMeterSolver(12));
    expect(result.current.priority).toBe('aperture');
    expect(result.current.solution.isValid).toBe(true);
    // Solved shutter must reproduce EV 12 at f/8, ISO 100.
    const solved = result.current.solution.shutterSpeed;
    expect(calculateEV(8, solved, 100)).toBeCloseTo(12, 4);
  });

  it('re-solves shutter when ISO changes (faster film → faster shutter)', () => {
    const { result } = renderHook(() => useLightMeterSolver(12));
    const slow = result.current.solution.shutterSpeed;
    act(() => result.current.setIso(400));
    const fast = result.current.solution.shutterSpeed;
    expect(fast).toBeLessThan(slow);
    expect(calculateEV(8, fast, 400)).toBeCloseTo(12, 4);
  });

  it('solves aperture in shutter-priority', () => {
    const { result } = renderHook(() => useLightMeterSolver(12));
    act(() => result.current.setPriority('shutter'));
    act(() => result.current.setShutterSpeed(1 / 125));
    const solvedAperture = result.current.solution.aperture;
    expect(calculateEV(solvedAperture, 1 / 125, 100)).toBeCloseTo(12, 4);
    expect(result.current.solution.solvedLabel.startsWith('f/')).toBe(true);
  });

  it('flags out-of-range solved shutter for a very dark scene', () => {
    // EV -6 at f/8 ISO 100 → shutter far longer than 30s.
    const { result } = renderHook(() => useLightMeterSolver(-6));
    expect(result.current.solution.outOfRange).toBe(true);
  });
});
