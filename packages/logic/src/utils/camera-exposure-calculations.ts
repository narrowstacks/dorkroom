import {
  EV_PRESETS,
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
} from '../constants/camera-exposure-defaults';
import type {
  ApertureKey,
  EquivalentExposure,
  ExposureComparison,
  ExposureValueResult,
  ISOKey,
  ShutterSpeedKey,
  StandardValue,
} from '../types/camera-exposure-calculator';
import { debugWarn } from './debug-logger';
import { roundToPrecision } from './precision';

// Practical shutter speed limits for camera bodies
const MIN_SHUTTER_SPEED = 1 / 8000;
const MAX_SHUTTER_SPEED = 30;

// Logarithmic tolerances for comparing exposure values (in stops).
// Modern cameras adjust in 1/3-stop increments (log2 ≈ 0.33). A 1/6-stop
// tolerance is half that step size — tight enough to avoid false matches between
// adjacent 1/3-stop values while still absorbing floating-point rounding.
const ONE_SIXTH_STOP = 1 / 6;
const STANDARD_VALUE_TOLERANCE = ONE_SIXTH_STOP; // ~0.167 stops — snap to nearest standard value
const EXACT_MATCH_TOLERANCE = Math.log2(1.01); // ~0.014 stops — within 1% of target value

// How far beyond min/max shutter speed to still include in equivalent exposure tables.
// Uses a 30% multiplicative buffer so borderline values aren't clipped.
const SHUTTER_RANGE_TOLERANCE = 0.3;

/**
 * Calculates EV (Exposure Value) at ISO 100 from camera settings.
 *
 * EV₁₀₀ = log₂(N² × 100 / (t × S))
 *
 * where N = f-number, t = shutter speed in seconds, S = ISO
 *
 * @param aperture - f-number (e.g., 8 for f/8)
 * @param shutterSpeed - Shutter speed in seconds (e.g., 0.008 for 1/125)
 * @param iso - ISO sensitivity (e.g., 100)
 * @returns EV at ISO 100
 */
export const calculateEV = (
  aperture: number,
  shutterSpeed: number,
  iso: number
): number => {
  if (aperture <= 0 || shutterSpeed <= 0 || iso <= 0) return NaN;
  return Math.log2((aperture * aperture * 100) / (shutterSpeed * iso));
};

/**
 * Solves for shutter speed given EV, aperture, and ISO.
 *
 * t = N² × 100 / (S × 2^EV)
 */
export const solveForShutterSpeed = (
  ev: number,
  aperture: number,
  iso: number
): number => {
  if (aperture <= 0 || iso <= 0) return NaN;
  return (aperture * aperture * 100) / (iso * 2 ** ev);
};

/**
 * Solves for aperture (f-number) given EV, shutter speed, and ISO.
 *
 * N = √(t × S × 2^EV / 100)
 */
export const solveForAperture = (
  ev: number,
  shutterSpeed: number,
  iso: number
): number => {
  if (shutterSpeed <= 0 || iso <= 0) return NaN;
  const nSquared = (shutterSpeed * iso * 2 ** ev) / 100;
  if (nSquared <= 0) return NaN;
  return Math.sqrt(nSquared);
};

/**
 * Solves for ISO given EV, aperture, and shutter speed.
 *
 * S = N² × 100 / (t × 2^EV)
 */
export const solveForISO = (
  ev: number,
  aperture: number,
  shutterSpeed: number
): number => {
  if (aperture <= 0 || shutterSpeed <= 0) return NaN;
  return (aperture * aperture * 100) / (shutterSpeed * 2 ** ev);
};

/**
 * Finds the nearest standard value from an array.
 */
export const findNearestStandard = (
  target: number,
  standards: StandardValue[]
): StandardValue => {
  let nearest = standards[0];
  let minDiff = Infinity;

  for (const standard of standards) {
    const diff = Math.abs(Math.log2(target / standard.value));
    if (diff < minDiff) {
      minDiff = diff;
      nearest = standard;
    }
  }

  return nearest;
};

/**
 * Gets a description for an EV value based on known presets.
 */
export const getEVDescription = (ev: number): string => {
  const rounded = Math.round(ev);

  const exact = EV_PRESETS.find((p) => p.ev === rounded);
  if (exact) return exact.description;

  if (rounded > 16) return 'Extremely bright';
  if (rounded < -2) return 'Very dark';
  return '';
};

/**
 * Calculates the EV result with description from camera settings.
 */
export const calculateExposureValue = (
  aperture: number,
  shutterSpeed: number,
  iso: number
): ExposureValueResult => {
  if (aperture <= 0 || shutterSpeed <= 0 || iso <= 0) {
    return { ev: 0, description: '', isValid: false };
  }

  const ev = calculateEV(aperture, shutterSpeed, iso);
  const roundedEV = roundToPrecision(ev, 1);

  return {
    ev: roundedEV,
    description: getEVDescription(ev),
    isValid: true,
  };
};

/**
 * Formats a shutter speed value for display.
 *
 * @example
 * formatShutterSpeed(0.008) // "1/125"
 * formatShutterSpeed(2) // '2"'
 * formatShutterSpeed(0.003) // "1/333"
 */
export const formatShutterSpeed = (seconds: number): string => {
  if (seconds <= 0) return '—';

  if (seconds >= 1) {
    const rounded = roundToPrecision(seconds, 1);
    return `${rounded}"`;
  }

  const denominator = roundToPrecision(1 / seconds, 0);
  return `1/${denominator}`;
};

/**
 * Formats an aperture f-number for display.
 *
 * @example
 * formatAperture(5.6) // "f/5.6"
 * formatAperture(8) // "f/8"
 */
export const formatAperture = (fNumber: number): string => {
  if (fNumber <= 0) return '—';
  const rounded = roundToPrecision(fNumber, 1);
  return `f/${rounded}`;
};

/**
 * Checks if a shutter speed value is close to a standard value (within 1/6 stop).
 */
const isNearStandardShutterSpeed = (seconds: number): boolean => {
  for (const standard of STANDARD_SHUTTER_SPEEDS) {
    const stopsDiff = Math.abs(Math.log2(seconds / standard.value));
    if (stopsDiff < STANDARD_VALUE_TOLERANCE) return true;
  }
  return false;
};

/**
 * Generates a table of equivalent exposures for a given EV and ISO.
 * For each standard aperture, calculates the required shutter speed.
 * Only includes pairs where the shutter speed is within practical range.
 */
export const getEquivalentExposures = (
  ev: number,
  iso: number,
  currentAperture: number,
  currentShutterSpeed: number
): EquivalentExposure[] => {
  if (iso <= 0) return [];

  const equivalents: EquivalentExposure[] = [];

  for (const apertureEntry of STANDARD_APERTURES) {
    const shutterSpeed = solveForShutterSpeed(ev, apertureEntry.value, iso);

    // Allow a 30% multiplicative buffer beyond the practical range so
    // borderline values aren't clipped from the table.
    //   Lower bound: 1/8000 * 0.7 = 1/11428 — accepts slightly faster than min
    //   Upper bound: 30 * 1.3 = 39s — accepts slightly slower than max
    // This is intentional: the buffer extends the range in both directions.
    if (
      shutterSpeed < MIN_SHUTTER_SPEED * (1 - SHUTTER_RANGE_TOLERANCE) ||
      shutterSpeed > MAX_SHUTTER_SPEED * (1 + SHUTTER_RANGE_TOLERANCE)
    ) {
      continue;
    }

    const isStandard = isNearStandardShutterSpeed(shutterSpeed);
    const isCurrent =
      Math.abs(Math.log2(apertureEntry.value / currentAperture)) <
        STANDARD_VALUE_TOLERANCE &&
      Math.abs(Math.log2(shutterSpeed / currentShutterSpeed)) <
        STANDARD_VALUE_TOLERANCE;

    equivalents.push({
      aperture: apertureEntry.value,
      shutterSpeed,
      apertureLabel: apertureEntry.label,
      shutterSpeedLabel: formatShutterSpeed(shutterSpeed),
      isStandardShutterSpeed: isStandard,
      isCurrentSetting: isCurrent,
    });
  }

  return equivalents;
};

/**
 * Compares two exposures and returns the stops difference.
 */
export const compareExposures = (
  apertureA: number,
  shutterSpeedA: number,
  isoA: number,
  apertureB: number,
  shutterSpeedB: number,
  isoB: number
): ExposureComparison => {
  const validA = apertureA > 0 && shutterSpeedA > 0 && isoA > 0;
  const validB = apertureB > 0 && shutterSpeedB > 0 && isoB > 0;

  if (!validA || !validB) {
    return {
      evA: 0,
      evB: 0,
      stopsDifference: 0,
      descriptionA: '',
      descriptionB: '',
      isValid: false,
    };
  }

  const evA = calculateEV(apertureA, shutterSpeedA, isoA);
  const evB = calculateEV(apertureB, shutterSpeedB, isoB);

  return {
    evA: roundToPrecision(evA, 1),
    evB: roundToPrecision(evB, 1),
    stopsDifference: roundToPrecision(evA - evB, 2),
    descriptionA: getEVDescription(evA),
    descriptionB: getEVDescription(evB),
    isValid: true,
  };
};

/**
 * Converts a shutter speed value to a Select-compatible string key.
 * Uses the label from STANDARD_SHUTTER_SPEEDS if the value matches,
 * otherwise generates a label.
 */
export const shutterSpeedToKey = (seconds: number): ShutterSpeedKey => {
  const nearest = findNearestStandard(seconds, STANDARD_SHUTTER_SPEEDS);
  const stopsDiff = Math.abs(Math.log2(seconds / nearest.value));
  if (stopsDiff < EXACT_MATCH_TOLERANCE)
    return nearest.label as ShutterSpeedKey;
  return formatShutterSpeed(seconds) as ShutterSpeedKey;
};

/**
 * Converts a shutter speed Select key back to a numeric value.
 *
 * Fallback: returns 1/125s if the key can't be parsed. This is safe because
 * keys only come from Select components with predefined options — an unparseable
 * key indicates corrupted localStorage or a programming error, not user input.
 * The debugWarn alerts developers during development without crashing the UI.
 */
export const keyToShutterSpeed = (key: ShutterSpeedKey): number => {
  const match = STANDARD_SHUTTER_SPEEDS.find((s) => s.label === key);
  if (match) return match.value;

  // Try parsing "1/X" format
  if (key.startsWith('1/')) {
    const denom = Number(key.slice(2));
    if (Number.isFinite(denom) && denom > 0) return 1 / denom;
  }

  // Try parsing seconds with quote mark
  const withoutQuote = key.replaceAll('"', '');
  const parsed = Number(withoutQuote);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  debugWarn(
    `keyToShutterSpeed: unrecognized key "${key}", using fallback 1/125`
  );
  return 1 / 125;
};

/**
 * Converts an aperture value to a Select-compatible string key.
 */
export const apertureToKey = (fNumber: number): ApertureKey => {
  const nearest = findNearestStandard(fNumber, STANDARD_APERTURES);
  const stopsDiff = Math.abs(Math.log2(fNumber / nearest.value));
  if (stopsDiff < EXACT_MATCH_TOLERANCE) return nearest.label as ApertureKey;
  return formatAperture(fNumber) as ApertureKey;
};

/**
 * Converts an aperture Select key back to a numeric value.
 *
 * Fallback: returns f/8 if the key can't be parsed. This is safe because
 * keys only come from Select components with predefined options — an unparseable
 * key indicates corrupted localStorage or a programming error, not user input.
 * The debugWarn alerts developers during development without crashing the UI.
 */
export const keyToAperture = (key: ApertureKey): number => {
  const match = STANDARD_APERTURES.find((a) => a.label === key);
  if (match) return match.value;

  // Try parsing "f/X" format
  const withoutF = key.replace('f/', '');
  const parsed = Number(withoutF);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  debugWarn(`keyToAperture: unrecognized key "${key}", using fallback f/8`);
  return 8;
};

/**
 * Converts an ISO value to a Select-compatible string key.
 */
export const isoToKey = (iso: number): ISOKey => {
  return `ISO ${iso}` as ISOKey;
};

/**
 * Converts an ISO Select key back to a numeric value.
 *
 * Fallback: returns ISO 100 if the key can't be parsed. This is safe because
 * keys only come from Select components with predefined options — an unparseable
 * key indicates corrupted localStorage or a programming error, not user input.
 * The debugWarn alerts developers during development without crashing the UI.
 */
export const keyToISO = (key: ISOKey): number => {
  const withoutISO = key.replace('ISO ', '');
  const parsed = Number(withoutISO);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  debugWarn(`keyToISO: unrecognized key "${key}", using fallback ISO 100`);
  return 100;
};
