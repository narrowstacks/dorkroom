import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_FOCAL_LENGTH_MM } from '../../constants/lens-calculator-defaults';
import { useLensCalculator } from '../../hooks/use-lens-calculator';
import { LENS_STORAGE_KEY } from '../../types/lens-calculator';

describe('useLensCalculator', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('computes an equivalent focal length for the default formats', () => {
    const { result } = renderHook(() => useLensCalculator());

    expect(result.current.values.focalLength).toBe(50);
    expect(result.current.calculation).not.toBeNull();
    // Matching a full-frame 50mm FOV on a smaller APS-C sensor needs a
    // shorter lens, so the equivalent is between 0 and 50mm.
    expect(result.current.calculation!.equivalentFocalLength).toBeGreaterThan(
      0
    );
    expect(result.current.calculation!.equivalentFocalLength).toBeLessThan(50);
    expect(result.current.calculation!.fieldOfView).toBeGreaterThan(0);
  });

  it('returns no calculation when the focal length is non-positive', () => {
    const { result } = renderHook(() => useLensCalculator());

    act(() => result.current.setFocalLength(0));

    expect(result.current.calculation).toBeNull();
  });

  it('returns no calculation for an unknown format id', () => {
    const { result } = renderHook(() => useLensCalculator());

    act(() => result.current.setSourceFormat('not-a-real-format'));

    expect(result.current.calculation).toBeNull();
  });

  it('swaps the source and target formats', () => {
    const { result } = renderHook(() => useLensCalculator());
    const source = result.current.values.sourceFormat;
    const target = result.current.values.targetFormat;

    act(() => result.current.swapFormats());

    expect(result.current.values.sourceFormat).toBe(target);
    expect(result.current.values.targetFormat).toBe(source);
  });

  it('hydrates a persisted focal length longer than 2000mm', () => {
    window.localStorage.setItem(
      LENS_STORAGE_KEY,
      JSON.stringify({ focalLength: 2400 })
    );

    const { result } = renderHook(() => useLensCalculator());

    expect(result.current.values.focalLength).toBe(2400);
  });

  it('clamps focal lengths above the supported maximum', () => {
    const { result } = renderHook(() => useLensCalculator());

    act(() => result.current.setFocalLength(MAX_FOCAL_LENGTH_MM + 1));

    expect(result.current.values.focalLength).toBe(MAX_FOCAL_LENGTH_MM);
  });

  it('reset restores the defaults and drops the persisted snapshot', () => {
    window.localStorage.setItem(
      LENS_STORAGE_KEY,
      JSON.stringify({ focalLength: 135 })
    );
    const { result } = renderHook(() => useLensCalculator());
    act(() => result.current.swapFormats());
    expect(result.current.values.focalLength).toBe(135);

    act(() => result.current.reset());

    expect(result.current.values).toEqual({
      focalLength: 50,
      sourceFormat: 'full-frame',
      targetFormat: 'aps-c-nikon',
    });
    expect(window.localStorage.getItem(LENS_STORAGE_KEY)).toBeNull();
  });
});
