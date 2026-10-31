import { useCallback, useMemo, useState } from 'react';
import {
  LENS_DEFAULTS,
  MAX_FOCAL_LENGTH_MM,
  SENSOR_FORMAT_MAP,
} from '../constants/lens-calculator-defaults';
import { lensCalculatorPersistence } from '../schemas/lens-calculator.schema';
import type { LensFormState, SensorFormat } from '../types/lens-calculator';
import {
  calculateEquivalentFocalLength,
  calculateFieldOfView,
} from '../utils/lens-calculations';
import { usePersistedCalculator } from './use-persisted-calculator';

/** Derived lens equivalency result, or null when inputs are invalid. */
export interface LensCalculatorResult {
  focalLength: number;
  equivalentFocalLength: number;
  sourceFormat: SensorFormat;
  targetFormat: SensorFormat;
  cropFactorRatio: number;
  fieldOfView: number;
}

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
 * @example
 * ```tsx
 * const lens = useLensCalculator();
 * lens.setFocalLength(85);
 * return <span>{lens.calculation?.equivalentFocalLength}</span>;
 * ```
 */
export function useLensCalculator(): UseLensCalculatorReturn {
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
    { values, setValues }
  );

  const calculation = useMemo<LensCalculatorResult | null>(() => {
    const { focalLength } = values;
    const sourceFormat = SENSOR_FORMAT_MAP[values.sourceFormat];
    const targetFormat = SENSOR_FORMAT_MAP[values.targetFormat];

    if (!sourceFormat || !targetFormat || focalLength <= 0) {
      return null;
    }

    return {
      focalLength,
      equivalentFocalLength: calculateEquivalentFocalLength(
        focalLength,
        sourceFormat,
        targetFormat
      ),
      sourceFormat,
      targetFormat,
      cropFactorRatio: sourceFormat.cropFactor / targetFormat.cropFactor,
      fieldOfView: calculateFieldOfView(focalLength, sourceFormat),
    };
  }, [values]);

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
