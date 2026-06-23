import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLensCalculator } from '../../hooks/use-lens-calculator';

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
});
