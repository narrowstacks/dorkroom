/**
 * Pure calculation functions for lens equivalency across sensor/film formats
 */

import type { SensorFormat } from '../types/lens-calculator';
import { roundToStandardPrecision } from './precision';

/**
 * Calculates the equivalent focal length when converting between formats
 * Formula: equivalent = focalLength * (sourceCropFactor / targetCropFactor)
 *
 * Example: 80mm on 6x6 (crop 0.55) to 35mm (crop 1.0) = 80 * (0.55 / 1.0) = 44mm
 */
export const calculateEquivalentFocalLength = (
  focalLength: number,
  sourceFormat: SensorFormat,
  targetFormat: SensorFormat
): number => {
  const cropFactorRatio = sourceFormat.cropFactor / targetFormat.cropFactor;
  return focalLength * cropFactorRatio;
};

/**
 * Calculates the diagonal field of view for a given focal length and format
 * Formula: 2 * atan(diagonal / (2 * focalLength)) * (180 / PI)
 *
 * @precondition focalLength must be > 0
 */
export const calculateFieldOfView = (
  focalLength: number,
  format: SensorFormat
): number => {
  if (focalLength <= 0) return 0;
  return 2 * Math.atan(format.diagonal / (2 * focalLength)) * (180 / Math.PI);
};

/**
 * Formats a focal length value for display
 */
export const formatFocalLength = (focalLength: number): string => {
  const rounded = roundToStandardPrecision(focalLength);
  // Show integer if close to a whole number
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return `${Math.round(rounded)}mm`;
  }
  return `${rounded.toFixed(1)}mm`;
};
