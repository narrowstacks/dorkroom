import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
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
  type PresetWarning,
} from '../types/camera-exposure-calculator';
import {
  calculateExposureValue,
  compareExposures,
  findNearestStandard,
  formatAperture,
  formatShutterSpeed,
  getEquivalentExposures,
  getPresetOutOfRangeWarning,
  solveForAperture,
  solveForISO,
  solveForShutterSpeed,
} from '../utils/camera-exposure-calculations';
import {
  type PersistedValue,
  useLocalStorageFormPersistence,
} from './use-local-storage-form-persistence';

const CAMERA_EXPOSURE_DEFAULTS: CameraExposureFormState = {
  aperture: DEFAULT_CAMERA_EXPOSURE_APERTURE,
  shutterSpeed: DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
  iso: DEFAULT_CAMERA_EXPOSURE_ISO,
  solveFor: 'shutterSpeed',
  compareAperture: DEFAULT_CAMERA_EXPOSURE_APERTURE,
  compareShutterSpeed: DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
  compareIso: DEFAULT_CAMERA_EXPOSURE_ISO,
};

const positiveNumberSchema = z.number().positive();

const positiveNumber = (v: PersistedValue): boolean =>
  positiveNumberSchema.safeParse(v).success;

// No shared ISO formatter exists elsewhere (unlike shutter speed/aperture),
// so this rounds a solved ISO to a display string for the out-of-range
// preset warning only. Clamped to 1 so an extremely bright preset (solving
// for a near-zero or negative ISO) never renders as "ISO 0".
const formatISO = (iso: number): string =>
  `ISO ${Math.max(1, Math.round(iso))}`;

// formatAperture keeps one decimal place, which reads fine for normal
// f-numbers (f/5.6) but not for the wildly out-of-range values a warning
// can surface (f/528.8). Round those to a whole f-stop instead; small
// values (a preset needing wider than f/1) keep the decimal since it's
// still meaningful there.
const formatApertureForWarning = (aperture: number): string =>
  aperture >= 10 ? `f/${Math.round(aperture)}` : formatAperture(aperture);

export interface UseCameraExposureCalculatorReturn {
  values: CameraExposureFormState;
  /** Update a single field. */
  set: <K extends keyof CameraExposureFormState>(
    key: K,
    value: CameraExposureFormState[K]
  ) => void;
  /** Solve for the selected value (aperture/shutter/ISO) to match an EV preset. */
  applyPreset: (ev: number) => void;
  /**
   * Set when the last-applied preset's solved value fell outside the
   * standard dial range and got clamped to the nearest endpoint (e.g. 30s
   * or f/64) rather than the value the preset actually needs. `null` when
   * the last preset (if any) applied cleanly, or after any input change.
   *
   * Derived (not stored directly) from `values` and the last-applied
   * preset's EV: storing the warning object itself, computed inside
   * `applyPreset`, would mean reading the *other* two settings off
   * whatever `values` happened to be at the time `applyPreset` was called
   * rather than the state `set()` had just committed in the same handler.
   */
  presetWarning: PresetWarning | null;
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
  // The EV of the last-applied preset, or null once any input changes it
  // (via `set`) invalidates it. `presetWarning` is derived from this plus
  // the committed `values` below, rather than computed once inside
  // `applyPreset` and stored — see the return type's doc comment.
  const [lastPresetEv, setLastPresetEv] = useState<number | null>(null);

  const set = useCallback(
    <K extends keyof CameraExposureFormState>(
      key: K,
      value: CameraExposureFormState[K]
    ) => {
      setLastPresetEv(null);
      setValues((prev) => ({ ...prev, [key]: value }));
    },
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
    // Functional updater, reading only `prev` — not the `values` closure —
    // so a preset applied right after a `set()` call in the same handler
    // (e.g. `set('aperture', 5.6); applyPreset(15)`) solves from the value
    // `set` just committed, not a stale render. No side effects here:
    // StrictMode double-invokes updaters, and `setLastPresetEv` below runs
    // exactly once per `applyPreset` call regardless.
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
    setLastPresetEv(ev);
  }, []);

  // Derives from the committed `values` + `lastPresetEv` rather than being
  // computed once inside `applyPreset`, so it can never reflect a stale
  // closure. Since only the solved-for field changes when a preset is
  // applied, the other two current values are exactly the ones the preset
  // was solved against, so re-solving here reproduces the same `solved`
  // (and thus the same warning, if any) `applyPreset` used to pick
  // `nearest`.
  const presetWarning = useMemo<PresetWarning | null>(() => {
    if (lastPresetEv === null) return null;

    if (values.solveFor === 'shutterSpeed') {
      const solved = solveForShutterSpeed(
        lastPresetEv,
        values.aperture,
        values.iso
      );
      const nearest = findNearestStandard(solved, STANDARD_SHUTTER_SPEEDS);
      return getPresetOutOfRangeWarning(
        lastPresetEv,
        'shutterSpeed',
        solved,
        nearest,
        formatShutterSpeed
      );
    }
    if (values.solveFor === 'aperture') {
      const solved = solveForAperture(
        lastPresetEv,
        values.shutterSpeed,
        values.iso
      );
      const nearest = findNearestStandard(solved, STANDARD_APERTURES);
      return getPresetOutOfRangeWarning(
        lastPresetEv,
        'aperture',
        solved,
        nearest,
        formatApertureForWarning
      );
    }
    const solved = solveForISO(
      lastPresetEv,
      values.aperture,
      values.shutterSpeed
    );
    const nearest = findNearestStandard(solved, STANDARD_ISOS);
    return getPresetOutOfRangeWarning(
      lastPresetEv,
      'iso',
      solved,
      nearest,
      formatISO
    );
  }, [
    lastPresetEv,
    values.solveFor,
    values.aperture,
    values.shutterSpeed,
    values.iso,
  ]);

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
    presetWarning,
    exposureValue,
    equivalentExposures,
    comparison,
  };
}
