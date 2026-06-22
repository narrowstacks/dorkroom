import type { StandardValue } from '../types/camera-exposure-calculator';
import { calculateEV } from './camera-exposure-calculations';

// Floating-point slack for treating two candidates as exactly half a stop apart.
const STOP_TIE_EPSILON = 1e-6;

/**
 * Computes scene EV at ISO 100 from a camera auto-exposure reading.
 *
 * The live metering API (react-native-vision-camera) exposes the chosen exposure
 * duration and ISO but not the lens f-number. iPhone main lenses have a fixed
 * aperture, so callers pass a known per-device aperture and fold any residual
 * error into a user calibration offset (in stops).
 *
 * @param exposureDuration - Shutter speed the camera chose, in seconds
 * @param iso - ISO the camera chose
 * @param aperture - Assumed (fixed) lens f-number
 * @param calibrationOffset - User calibration in stops, added to the EV
 * @returns EV at ISO 100, or NaN if the reading is invalid
 */
export const evFromCameraReading = (
  exposureDuration: number,
  iso: number,
  aperture: number,
  calibrationOffset: number
): number => {
  if (
    !Number.isFinite(exposureDuration) ||
    !Number.isFinite(iso) ||
    exposureDuration <= 0 ||
    iso <= 0
  ) {
    return Number.NaN;
  }
  const ev = calculateEV(aperture, exposureDuration, iso);
  if (!Number.isFinite(ev)) return Number.NaN;
  return ev + calibrationOffset;
};

/**
 * Returns the median of recent EV samples to damp auto-exposure jitter.
 * Non-finite samples are ignored; returns NaN when no finite samples remain.
 */
export const smoothEv = (samples: readonly number[]): number => {
  const valid = samples.filter((s) => Number.isFinite(s));
  if (valid.length === 0) return Number.NaN;
  const sorted = valid.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/**
 * Snaps an exact exposure setting to the nearest value a lens/camera dial can
 * actually be set to, measured in stops, rounding a true half-stop tie toward
 * MORE exposure (over- rather than under-exposing).
 *
 * `largerIsMoreExposure` describes the setting's direction:
 * - shutter time: `true`  (a longer time lets in more light)
 * - aperture f-number: `false` (a smaller f-number lets in more light)
 *
 * @example
 * // 1/247s is essentially 1/250s, so it snaps there (nearest, not the tie rule):
 * snapToStandardStop(1 / 247, STANDARD_SHUTTER_SPEEDS, true).label // "1/250"
 */
export const snapToStandardStop = (
  exact: number,
  standards: readonly StandardValue[],
  largerIsMoreExposure: boolean
): StandardValue => {
  // Position of a value on a log2 "stops of light" axis (sign so that a higher
  // number always means more exposure, regardless of setting direction).
  const exposureStops = (v: number) =>
    largerIsMoreExposure ? Math.log2(v) : -2 * Math.log2(v);
  const target = exposureStops(exact);

  let best = standards[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestDelta = Number.NEGATIVE_INFINITY;
  for (const candidate of standards) {
    const delta = exposureStops(candidate.value) - target;
    const distance = Math.abs(delta);
    const closer = distance < bestDistance - STOP_TIE_EPSILON;
    const tieToMoreExposure =
      Math.abs(distance - bestDistance) <= STOP_TIE_EPSILON &&
      delta > bestDelta;
    if (closer || tieToMoreExposure) {
      best = candidate;
      bestDistance = distance;
      bestDelta = delta;
    }
  }
  return best;
};
