import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCameraExposureCalculator } from '../../hooks/use-camera-exposure-calculator';

describe('useCameraExposureCalculator', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('computes a valid exposure value from the defaults', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());

    expect(result.current.values.aperture).toBe(8);
    expect(result.current.values.iso).toBe(100);
    expect(result.current.exposureValue.isValid).toBe(true);
    expect(Number.isFinite(result.current.exposureValue.ev)).toBe(true);
    expect(result.current.equivalentExposures.length).toBeGreaterThan(0);
  });

  it('reports zero stops difference when A and B match', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());

    expect(result.current.comparison.isValid).toBe(true);
    expect(result.current.comparison.stopsDifference).toBe(0);
  });

  it('updates a single field via set', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());

    act(() => result.current.set('compareAperture', 16));

    expect(result.current.values.compareAperture).toBe(16);
    // Stopping B down two stops makes B darker than A.
    expect(result.current.comparison.stopsDifference).not.toBe(0);
  });

  it('solves the selected value to match an EV preset', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());
    const initialShutter = result.current.values.shutterSpeed;

    // solveFor defaults to 'shutterSpeed'; Sunny 16 is EV 15.
    act(() => result.current.applyPreset(15));

    expect(result.current.values.shutterSpeed).not.toBe(initialShutter);
    // Aperture and ISO are untouched when solving for shutter speed.
    expect(result.current.values.aperture).toBe(8);
    expect(result.current.values.iso).toBe(100);
  });
});
