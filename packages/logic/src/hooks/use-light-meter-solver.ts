import { useMemo, useState } from 'react';
import {
  DEFAULT_CAMERA_EXPOSURE_APERTURE,
  DEFAULT_CAMERA_EXPOSURE_ISO,
  DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
} from '../constants/camera-exposure-defaults';
import {
  METER_MAX_APERTURE,
  METER_MAX_SHUTTER_SPEED,
  METER_MIN_APERTURE,
  METER_MIN_SHUTTER_SPEED,
} from '../constants/light-meter-defaults';
import type { LightMeterSolution, MeterPriority } from '../types/light-meter';
import {
  solveForAperture,
  solveForShutterSpeed,
} from '../utils/camera-exposure-calculations';
import { snapToStandardStop } from '../utils/light-meter';

export interface UseLightMeterSolver {
  iso: number;
  setIso: (iso: number) => void;
  priority: MeterPriority;
  setPriority: (priority: MeterPriority) => void;
  aperture: number;
  setAperture: (aperture: number) => void;
  shutterSpeed: number;
  setShutterSpeed: (shutterSpeed: number) => void;
  solution: LightMeterSolution;
}

/** Starting values for the solver's controls, e.g. restored from storage.
 * Each falls back to its default when omitted. Read once on mount. */
export interface LightMeterSolverInitialState {
  iso?: number;
  priority?: MeterPriority;
  aperture?: number;
  shutterSpeed?: number;
}

/**
 * Solves for the missing exposure setting from a metered EV (at ISO 100).
 *
 * Aperture-priority: the user fixes the aperture, the hook solves the shutter.
 * Shutter-priority: the user fixes the shutter, the hook solves the aperture.
 *
 * @param ev - Metered scene EV at ISO 100, or null/NaN when unavailable
 * @param initial - Optional starting controls (e.g. persisted); read once on mount
 * @param isoOverride - Pins the ISO while set (e.g. locked to a film roll's rated
 *   EI). The solver derives its ISO from this rather than having a caller write it
 *   back through `setIso` from an effect, which would cost an extra render and can
 *   momentarily solve against a stale ISO. `setIso` still writes the underlying
 *   value, so a caller can commit the pinned EI before releasing the override.
 */
export const useLightMeterSolver = (
  ev: number | null,
  initial?: LightMeterSolverInitialState,
  isoOverride?: number
): UseLightMeterSolver => {
  const [isoState, setIso] = useState(
    initial?.iso ?? DEFAULT_CAMERA_EXPOSURE_ISO
  );
  const iso = isoOverride ?? isoState;
  const [priority, setPriority] = useState<MeterPriority>(
    initial?.priority ?? 'aperture'
  );
  const [aperture, setAperture] = useState(
    initial?.aperture ?? DEFAULT_CAMERA_EXPOSURE_APERTURE
  );
  const [shutterSpeed, setShutterSpeed] = useState(
    initial?.shutterSpeed ?? DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED
  );

  const solution = useMemo<LightMeterSolution>(() => {
    if (ev === null || !Number.isFinite(ev)) {
      return {
        aperture,
        shutterSpeed,
        solvedLabel: '—',
        solvedStopError: 0,
        outOfRange: false,
        isValid: false,
      };
    }

    if (priority === 'aperture') {
      const solvedShutter = solveForShutterSpeed(ev, aperture, iso);
      const valid = Number.isFinite(solvedShutter);
      const outOfRange =
        solvedShutter < METER_MIN_SHUTTER_SPEED ||
        solvedShutter > METER_MAX_SHUTTER_SPEED;
      // A longer shutter time lets in more light, so ties round slower (brighter).
      const snapped = snapToStandardStop(
        solvedShutter,
        STANDARD_SHUTTER_SPEEDS,
        true
      );
      return {
        aperture,
        shutterSpeed: solvedShutter,
        solvedLabel: valid ? snapped.standard.label : '—',
        solvedStopError: valid ? snapped.stopError : 0,
        outOfRange,
        isValid: valid,
      };
    }

    const solvedAperture = solveForAperture(ev, shutterSpeed, iso);
    const valid = Number.isFinite(solvedAperture);
    const outOfRange =
      solvedAperture < METER_MIN_APERTURE ||
      solvedAperture > METER_MAX_APERTURE;
    // A smaller f-number lets in more light, so ties round wider (brighter).
    const snapped = snapToStandardStop(
      solvedAperture,
      STANDARD_APERTURES,
      false
    );
    return {
      aperture: solvedAperture,
      shutterSpeed,
      solvedLabel: valid ? snapped.standard.label : '—',
      solvedStopError: valid ? snapped.stopError : 0,
      outOfRange,
      isValid: valid,
    };
  }, [ev, priority, aperture, shutterSpeed, iso]);

  return {
    iso,
    setIso,
    priority,
    setPriority,
    aperture,
    setAperture,
    shutterSpeed,
    setShutterSpeed,
    solution,
  };
};
