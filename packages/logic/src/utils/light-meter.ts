import { calculateEV } from './camera-exposure-calculations';

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
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};
