import { useCallback, useMemo, useState } from 'react';
import {
  LENS_DEFAULTS,
  MAX_FOCAL_LENGTH_MM,
} from '../constants/lens-calculator-defaults';
import { lensCalculatorPersistence } from '../schemas/lens-calculator.schema';
import type { LensFormState } from '../types/lens-calculator';
import {
  calculateLensEquivalency,
  type LensCalculatorResult,
} from '../utils/lens-calculations';
import { usePersistedCalculator } from './use-persisted-calculator';

export type { LensCalculatorResult };

export interface UseLensCalculatorReturn {
  values: LensFormState;
  setFocalLength: (value: number) => void;
  setSourceFormat: (value: string) => void;
  setTargetFormat: (value: string) => void;
  /** Swap the source and target formats. */
  swapFormats: () => void;
  /** Restore the default inputs and drop the persisted snapshot. */
  reset: () => void;
  /** Equivalent focal length / field-of-view result, or null when invalid. */
  calculation: LensCalculatorResult | null;
}

/**
 * Hook for the lens equivalency calculator. Owns the focal length and
 * source/target format selection (persisted through the storage seam) and derives
 * the equivalent focal length and field of view on the target format.
 *
 * @param options - `overrides`: values applied over the stored ones on
 *   mount, such as a link's (`lensCalculatorLink.read`).
 * @example
 * ```tsx
 * const lens = useLensCalculator();
 * lens.setFocalLength(85);
 * return <span>{lens.calculation?.equivalentFocalLength}</span>;
 * ```
 */
export function useLensCalculator(options?: {
  overrides?: Partial<LensFormState>;
}): UseLensCalculatorReturn {
  const [values, setValues] = useState<LensFormState>(LENS_DEFAULTS);

  const setFocalLength = useCallback(
    (value: number) =>
      setValues((prev) => ({
        ...prev,
        focalLength: Number.isFinite(value)
          ? Math.min(value, MAX_FOCAL_LENGTH_MM)
          : 0,
      })),
    []
  );
  const setSourceFormat = useCallback(
    (value: string) => setValues((prev) => ({ ...prev, sourceFormat: value })),
    []
  );
  const setTargetFormat = useCallback(
    (value: string) => setValues((prev) => ({ ...prev, targetFormat: value })),
    []
  );
  const swapFormats = useCallback(
    () =>
      setValues((prev) => ({
        ...prev,
        sourceFormat: prev.targetFormat,
        targetFormat: prev.sourceFormat,
      })),
    []
  );

  const { resetToDefaults: reset } = usePersistedCalculator(
    lensCalculatorPersistence,
    { values, setValues, overrides: options?.overrides }
  );

  const calculation = useMemo(() => calculateLensEquivalency(values), [values]);

  return {
    values,
    setFocalLength,
    setSourceFormat,
    setTargetFormat,
    swapFormats,
    reset,
    calculation,
  };
}
