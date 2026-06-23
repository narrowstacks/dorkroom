import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_CAMERA_EXPOSURE_APERTURE,
  DEFAULT_CAMERA_EXPOSURE_ISO,
  DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
} from '../constants/camera-exposure-defaults';
import {
  CAMERA_EXPOSURE_STORAGE_KEY,
  type CameraExposureFormState,
  type EquivalentExposure,
  type ExposureComparison,
  type ExposureValueResult,
} from '../types/camera-exposure-calculator';
import {
  calculateExposureValue,
  compareExposures,
  findNearestStandard,
  getEquivalentExposures,
  solveForAperture,
  solveForISO,
  solveForShutterSpeed,
} from '../utils/camera-exposure-calculations';
import { useLocalStorageFormPersistence } from './use-local-storage-form-persistence';

const CAMERA_EXPOSURE_DEFAULTS: CameraExposureFormState = {
  aperture: DEFAULT_CAMERA_EXPOSURE_APERTURE,
  shutterSpeed: DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
  iso: DEFAULT_CAMERA_EXPOSURE_ISO,
  solveFor: 'shutterSpeed',
  compareAperture: DEFAULT_CAMERA_EXPOSURE_APERTURE,
  compareShutterSpeed: DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
  compareIso: DEFAULT_CAMERA_EXPOSURE_ISO,
};

const positiveNumber = (v: unknown): boolean =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

export interface UseCameraExposureCalculatorReturn {
  values: CameraExposureFormState;
  /** Update a single field. */
  set: <K extends keyof CameraExposureFormState>(
    key: K,
    value: CameraExposureFormState[K]
  ) => void;
  /** Solve for the selected value (aperture/shutter/ISO) to match an EV preset. */
  applyPreset: (ev: number) => void;
  /** Exposure value for the primary settings (A). */
  exposureValue: ExposureValueResult;
  /** Equivalent aperture/shutter pairs at the current EV (empty when invalid). */
  equivalentExposures: EquivalentExposure[];
  /** Stops difference between exposure A and exposure B. */
  comparison: ExposureComparison;
}

/**
 * Hook for the camera exposure calculator. Owns the exposure-triangle settings
 * and a comparison exposure (persisted to localStorage), and derives the EV,
 * equivalent exposures, and the A-vs-B comparison.
 *
 * @example
 * ```tsx
 * const exposure = useCameraExposureCalculator();
 * exposure.set('aperture', 5.6);
 * exposure.applyPreset(15); // Sunny 16
 * return <span>EV {exposure.exposureValue.ev}</span>;
 * ```
 */
export function useCameraExposureCalculator(): UseCameraExposureCalculatorReturn {
  const [values, setValues] = useState<CameraExposureFormState>(
    CAMERA_EXPOSURE_DEFAULTS
  );

  const set = useCallback(
    <K extends keyof CameraExposureFormState>(
      key: K,
      value: CameraExposureFormState[K]
    ) => setValues((prev) => ({ ...prev, [key]: value })),
    []
  );

  // Adapter so the TanStack-Form-shaped persistence hook can drive useState.
  const persistenceForm = {
    setFieldValue: (
      key: keyof CameraExposureFormState,
      value: CameraExposureFormState[keyof CameraExposureFormState]
    ) => setValues((prev) => ({ ...prev, [key]: value })),
  };

  useLocalStorageFormPersistence({
    storageKey: CAMERA_EXPOSURE_STORAGE_KEY,
    form: persistenceForm,
    formValues: values,
    persistKeys: [
      'aperture',
      'shutterSpeed',
      'iso',
      'solveFor',
      'compareAperture',
      'compareShutterSpeed',
      'compareIso',
    ],
    validators: {
      aperture: { validate: positiveNumber },
      shutterSpeed: { validate: positiveNumber },
      iso: { validate: positiveNumber },
      solveFor: {
        validate: (v) =>
          v === 'shutterSpeed' || v === 'aperture' || v === 'iso',
      },
      compareAperture: { validate: positiveNumber },
      compareShutterSpeed: { validate: positiveNumber },
      compareIso: { validate: positiveNumber },
    },
  });

  const applyPreset = useCallback((ev: number) => {
    setValues((prev) => {
      if (prev.solveFor === 'shutterSpeed') {
        const solved = solveForShutterSpeed(ev, prev.aperture, prev.iso);
        const nearest = findNearestStandard(solved, STANDARD_SHUTTER_SPEEDS);
        return { ...prev, shutterSpeed: nearest.value };
      }
      if (prev.solveFor === 'aperture') {
        const solved = solveForAperture(ev, prev.shutterSpeed, prev.iso);
        const nearest = findNearestStandard(solved, STANDARD_APERTURES);
        return { ...prev, aperture: nearest.value };
      }
      const solved = solveForISO(ev, prev.aperture, prev.shutterSpeed);
      const nearest = findNearestStandard(solved, STANDARD_ISOS);
      return { ...prev, iso: nearest.value };
    });
  }, []);

  const exposureValue = useMemo(
    () =>
      calculateExposureValue(values.aperture, values.shutterSpeed, values.iso),
    [values.aperture, values.shutterSpeed, values.iso]
  );

  const equivalentExposures = useMemo<EquivalentExposure[]>(() => {
    if (!exposureValue.isValid) return [];
    return getEquivalentExposures(
      exposureValue.ev,
      values.iso,
      values.aperture,
      values.shutterSpeed
    );
  }, [exposureValue, values.iso, values.aperture, values.shutterSpeed]);

  const comparison = useMemo(
    () =>
      compareExposures(
        values.aperture,
        values.shutterSpeed,
        values.iso,
        values.compareAperture,
        values.compareShutterSpeed,
        values.compareIso
      ),
    [
      values.aperture,
      values.shutterSpeed,
      values.iso,
      values.compareAperture,
      values.compareShutterSpeed,
      values.compareIso,
    ]
  );

  return {
    values,
    set,
    applyPreset,
    exposureValue,
    equivalentExposures,
    comparison,
  };
}
