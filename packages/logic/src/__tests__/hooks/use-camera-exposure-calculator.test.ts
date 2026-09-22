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

  it('produces no preset warning for an in-range preset', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());

    // Sunny 16 (EV 15) at the defaults (f/8, ISO 100) needs a shutter
    // speed well within the standard dial range.
    act(() => result.current.applyPreset(15));

    expect(result.current.presetWarning).toBeNull();
  });

  it('warns when the "Night Sky" preset needs a shutter speed beyond the dial range', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());

    // f/8, ISO 100, EV -2 needs 256s — far past the 30s dial limit.
    act(() => result.current.applyPreset(-2));

    expect(result.current.presetWarning).not.toBeNull();
    expect(result.current.presetWarning?.presetEv).toBe(-2);
    expect(result.current.presetWarning?.variable).toBe('shutterSpeed');
    expect(result.current.presetWarning?.required).toBe('256"');
    expect(result.current.presetWarning?.limit).toBe('30"');

    // The value still gets clamped to the dial endpoint rather than being
    // rejected outright.
    expect(result.current.values.shutterSpeed).toBe(30);
  });

  it('warns when a preset needs an aperture beyond the dial range', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());

    act(() => {
      result.current.set('solveFor', 'aperture');
      result.current.set('shutterSpeed', 1 / 30);
      result.current.set('iso', 12800);
    });

    // 1/30s, ISO 12800, EV 16 needs roughly f/529 — far past f/64.
    act(() => result.current.applyPreset(16));

    expect(result.current.presetWarning).not.toBeNull();
    expect(result.current.presetWarning?.variable).toBe('aperture');
    expect(result.current.presetWarning?.presetEv).toBe(16);
    expect(result.current.presetWarning?.limit).toBe('f/64');
    expect(result.current.values.aperture).toBe(64);
  });

  it('clears the preset warning when any input changes', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());

    act(() => result.current.applyPreset(-2));
    expect(result.current.presetWarning).not.toBeNull();

    act(() => result.current.set('iso', 400));

    expect(result.current.presetWarning).toBeNull();
  });

  it('clears the preset warning when a subsequent in-range preset is applied', () => {
    const { result } = renderHook(() => useCameraExposureCalculator());

    act(() => result.current.applyPreset(-2));
    expect(result.current.presetWarning).not.toBeNull();

    act(() => result.current.applyPreset(15));

    expect(result.current.presetWarning).toBeNull();
  });
});
