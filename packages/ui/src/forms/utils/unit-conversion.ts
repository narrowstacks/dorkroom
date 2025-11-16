/**
 * Unit conversion utilities for calculator forms
 * Used in Border Calculator, Resize Calculator, and other dimension inputs
 */

/**
 * Convert display unit value to storage unit (inches)
 * @param value - Value in display units (typically inches or cm)
 * @param isMetric - Whether the input is in metric (cm) or imperial (inches)
 * @returns Value in inches
 */
export const toInches = (value: number, isMetric: boolean = false): number => {
  if (!Number.isFinite(value)) return NaN;
  if (isMetric) {
    return value / 2.54; // cm to inches
  }
  return value;
};

/**
 * Convert storage unit (inches) to display unit
 * @param inches - Value in inches
 * @param isMetric - Whether to convert to metric (cm) or keep as imperial (inches)
 * @returns Value in display units
 */
export const fromInches = (inches: number, isMetric: boolean = false): number => {
  if (!Number.isFinite(inches)) return NaN;
  if (isMetric) {
    return inches * 2.54; // inches to cm
  }
  return inches;
};

/**
 * Validate and convert a dimension input string
 * Allows for partial input (empty, whitespace, trailing decimal) during editing
 * @param value - String value from input
 * @param isMetric - Whether input is in metric units
 * @param minValue - Minimum allowed value (in display units)
 * @returns Numeric value in inches, or null if invalid/partial
 */
export const validateAndConvertDimension = (
  value: string,
  isMetric: boolean = false,
  minValue: number = 0
): number | null => {
  // Allow empty/whitespace (user still typing)
  if (value === '' || /^\s*$/.test(value)) {
    return null;
  }

  // Allow trailing decimal (user still typing number)
  if (/^\d*\.$/.test(value)) {
    return null;
  }

  const parsed = parseFloat(value);

  // Valid number check
  if (!Number.isFinite(parsed)) {
    return null;
  }

  // Min value check
  if (parsed < minValue) {
    return null;
  }

  return toInches(parsed, isMetric);
};

/**
 * Format a number for display in a dimension input
 * @param inches - Value in inches
 * @param isMetric - Whether to display in metric (cm) or imperial (inches)
 * @param decimalPlaces - Number of decimal places to show
 * @returns Formatted string for display
 */
export const formatDimension = (
  inches: number,
  isMetric: boolean = false,
  decimalPlaces: number = 2
): string => {
  if (!Number.isFinite(inches)) return '';

  const displayValue = fromInches(inches, isMetric);
  return displayValue.toFixed(decimalPlaces);
};

/**
 * Parse a time string in format like "30s", "1m30s", "2h"
 * @param timeString - Time string to parse
 * @returns Time in seconds, or null if invalid
 */
export const parseTimeString = (timeString: string): number | null => {
  const trimmed = timeString.trim();
  if (!trimmed) return null;

  let totalSeconds = 0;

  // Match hours (e.g., "2h")
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/i);
  if (hourMatch) {
    totalSeconds += parseFloat(hourMatch[1]) * 3600;
  }

  // Match minutes (e.g., "30m" or "1m30s")
  const minuteMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*m(?!s)/i);
  if (minuteMatch) {
    totalSeconds += parseFloat(minuteMatch[1]) * 60;
  }

  // Match seconds (e.g., "30s")
  const secondMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*s/i);
  if (secondMatch) {
    totalSeconds += parseFloat(secondMatch[1]);
  }

  // If no format matched, try parsing as raw number (assume seconds)
  if (totalSeconds === 0 && /^\d+(?:\.\d+)?$/.test(trimmed)) {
    totalSeconds = parseFloat(trimmed);
  }

  return totalSeconds > 0 ? totalSeconds : null;
};

/**
 * Format seconds to a readable time string
 * @param seconds - Time in seconds
 * @returns Formatted string like "2h 30m 45s"
 */
export const formatTimeString = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

/**
 * Calculate the number of stops between two exposure times
 * @param originalTime - Original exposure time in seconds
 * @param adjustedTime - New exposure time in seconds
 * @returns Number of stops difference
 */
export const calculateStops = (originalTime: number, adjustedTime: number): number => {
  if (originalTime <= 0 || adjustedTime <= 0) return 0;
  return Math.log2(adjustedTime / originalTime);
};

/**
 * Calculate new exposure time given original time and stop adjustment
 * @param originalTime - Original exposure time in seconds
 * @param stops - Number of stops to adjust
 * @returns New exposure time in seconds
 */
export const calculateNewTime = (originalTime: number, stops: number): number => {
  if (originalTime <= 0) return 0;
  return originalTime * Math.pow(2, stops);
};
