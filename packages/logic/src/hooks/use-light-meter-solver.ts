import { useMemo, useState } from 'react';
import {
  DEFAULT_CAMERA_EXPOSURE_APERTURE,
  DEFAULT_CAMERA_EXPOSURE_ISO,
  DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
} from '../constants/camera-exposure-defaults';
import {
  METER_MAX_SHUTTER_SPEED,
  METER_MIN_SHUTTER_SPEED,
} from '../constants/light-meter-defaults';
import type { LightMeterSolution, MeterPriority } from '../types/light-meter';
import {
  formatAperture,
  formatShutterSpeed,
  solveForAperture,
  solveForShutterSpeed,
} from '../utils/camera-exposure-calculations';
import { roundToPrecision } from '../utils/precision';

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

/**
 * Solves for the missing exposure setting from a metered EV (at ISO 100).
 *
 * Aperture-priority: the user fixes the aperture, the hook solves the shutter.
 * Shutter-priority: the user fixes the shutter, the hook solves the aperture.
 *
 * @param ev - Metered scene EV at ISO 100, or null/NaN when unavailable
 */
export const useLightMeterSolver = (ev: number | null): UseLightMeterSolver => {
  const [iso, setIso] = useState(DEFAULT_CAMERA_EXPOSURE_ISO);
  const [priority, setPriority] = useState<MeterPriority>('aperture');
  const [aperture, setAperture] = useState(DEFAULT_CAMERA_EXPOSURE_APERTURE);
  const [shutterSpeed, setShutterSpeed] = useState(
    DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED
  );

  const solution = useMemo<LightMeterSolution>(() => {
    if (ev === null || !Number.isFinite(ev)) {
      return {
        aperture,
        shutterSpeed,
        solvedLabel: '—',
        outOfRange: false,
        isValid: false,
      };
    }

    if (priority === 'aperture') {
      const solvedShutter = solveForShutterSpeed(ev, aperture, iso);
      const outOfRange =
        solvedShutter < METER_MIN_SHUTTER_SPEED ||
        solvedShutter > METER_MAX_SHUTTER_SPEED;
      return {
        aperture,
        shutterSpeed: solvedShutter,
        solvedLabel: formatShutterSpeed(solvedShutter),
        outOfRange,
        isValid: Number.isFinite(solvedShutter),
      };
    }

    const solvedAperture = solveForAperture(ev, shutterSpeed, iso);
    return {
      aperture: solvedAperture,
      shutterSpeed,
      solvedLabel: formatAperture(roundToPrecision(solvedAperture, 1)),
      outOfRange: false,
      isValid: Number.isFinite(solvedAperture),
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
