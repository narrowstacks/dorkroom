import { roundToStandardPrecision } from './precision';

/**
 * Calculate new exposure time based on stop adjustment
 * Formula: newTime = originalTime * 2^stopChange
 */
export const calculateNewExposureTime = (
  originalTime: number,
  stopChange: number
): number => {
  return originalTime * Math.pow(2, stopChange);
};

/**
 * Round stops to the nearest practical value (1/3 stop precision)
 */
export const roundStopsToThirds = (value: number): number => {
  // Round to nearest 1/3
  const rounded = Math.round(value * 3) / 3;
  const tolerance = 0.01;
  return Math.abs(rounded - value) <= tolerance ? rounded : value;
};

/**
 * Format exposure time for display
 */
export const formatExposureTime = (seconds: number): string => {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      return `${minutes}m ${roundToStandardPrecision(remainingSeconds)}s`;
    }
    return `${minutes}m`;
  }
  return `${roundToStandardPrecision(seconds)}s`;
};

/**
 * Validate and parse exposure time input
 */
export const parseExposureTime = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const numericValue = parseFloat(trimmed);
  if (isNaN(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

/**
 * Calculate percentage increase between original and new time
 */
export const calculatePercentageIncrease = (
  originalTime: number,
  newTime: number
): number => {
  if (originalTime <= 0) return 0;
  return ((newTime - originalTime) / originalTime) * 100;
};
