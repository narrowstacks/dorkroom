import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
import { SENSOR_FORMAT_MAP } from '../constants/lens-calculator-defaults';
import {
  LENS_STORAGE_KEY,
  type LensFormState,
  type SensorFormat,
} from '../types/lens-calculator';
import {
  calculateEquivalentFocalLength,
  calculateFieldOfView,
} from '../utils/lens-calculations';
import {
  type PersistedValue,
  useLocalStorageFormPersistence,
} from './use-local-storage-form-persistence';

/** Derived lens equivalency result, or null when inputs are invalid. */
export interface LensCalculatorResult {
  focalLength: number;
  equivalentFocalLength: number;
  sourceFormat: SensorFormat;
  targetFormat: SensorFormat;
  cropFactorRatio: number;
  fieldOfView: number;
}

/** Persisted focal lengths outside this range are discarded on hydration. */
const persistedFocalLengthSchema = z.number().positive().max(2000);

const persistedSensorFormatSchema = z
  .string()
  .refine((key) => SENSOR_FORMAT_MAP[key] !== undefined);

const isPersistedFocalLength = (v: PersistedValue): boolean =>
  persistedFocalLengthSchema.safeParse(v).success;

const isPersistedSensorFormat = (v: PersistedValue): boolean =>
  persistedSensorFormatSchema.safeParse(v).success;

const LENS_DEFAULTS: LensFormState = {
  focalLength: 50,
  sourceFormat: 'full-frame',
  targetFormat: 'aps-c-nikon',
};

export interface UseLensCalculatorReturn {
  values: LensFormState;
  setFocalLength: (value: number) => void;
  setSourceFormat: (value: string) => void;
  setTargetFormat: (value: string) => void;
  /** Swap the source and target formats. */
  swapFormats: () => void;
  /** Equivalent focal length / field-of-view result, or null when invalid. */
  calculation: LensCalculatorResult | null;
}

/**
 * Hook for the lens equivalency calculator. Owns the focal length and
 * source/target format selection (persisted to localStorage) and derives
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
        focalLength: Number.isFinite(value) ? value : 0,
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

  // Adapter so the TanStack-Form-shaped persistence hook can drive useState.
  const persistenceForm = {
    setFieldValue: (
      key: keyof LensFormState,
      value: LensFormState[keyof LensFormState]
    ) => setValues((prev) => ({ ...prev, [key]: value })),
  };

  useLocalStorageFormPersistence({
    storageKey: LENS_STORAGE_KEY,
    form: persistenceForm,
    formValues: values,
    persistKeys: ['focalLength', 'sourceFormat', 'targetFormat'],
    validators: {
      focalLength: { validate: isPersistedFocalLength },
      sourceFormat: { validate: isPersistedSensorFormat },
      targetFormat: { validate: isPersistedSensorFormat },
    },
  });

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
    calculation,
  };
}
