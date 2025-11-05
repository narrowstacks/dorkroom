/**
 * Unit conversion utilities for imperial/metric measurements
 *
 * Design Philosophy:
 * - All internal calculations remain in imperial (inches/feet)
 * - Conversions happen only at display boundaries
 * - Type-safe with clear documentation
 * - Precision-aware conversions
 */

export type MeasurementUnit = 'imperial' | 'metric';
export type LengthUnit = 'in' | 'ft' | 'cm' | 'mm';

/**
 * Conversion constants
 */
const INCHES_TO_CM = 2.54;
const INCHES_TO_MM = 25.4;
const FEET_TO_CM = 30.48;

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return inches * INCHES_TO_CM;
}

/**
 * Convert inches to millimeters
 */
export function inchesToMm(inches: number): number {
  return inches * INCHES_TO_MM;
}

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return cm / INCHES_TO_CM;
}

/**
 * Round a number to a maximum of 3 decimal places to avoid floating point precision errors
 * @param value - The number to round
 * @returns The rounded number
 */
function roundToThreeDecimals(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Convert millimeters to inches
 */
export function mmToInches(mm: number): number {
  return mm / INCHES_TO_MM;
}

/**
 * Convert feet to centimeters
 */
export function feetToCm(feet: number): number {
  return feet * FEET_TO_CM;
}

/**
 * Convert centimeters to feet
 */
export function cmToFeet(cm: number): number {
  return cm / FEET_TO_CM;
}

/**
 * Get the appropriate precision for a measurement unit
 * Imperial: 2 decimal places (1/100 inch precision)
 * Metric: 1 decimal place (mm precision when showing cm)
 */
export function getPrecisionForUnit(unit: MeasurementUnit): number {
  return unit === 'imperial' ? 2 : 1;
}

/**
 * Get the display unit for a measurement system
 * Imperial: inches for most measurements
 * Metric: centimeters for most measurements
 */
export function getDisplayUnit(unit: MeasurementUnit): LengthUnit {
  return unit === 'imperial' ? 'in' : 'cm';
}

/**
 * Get the display unit label for UI
 */
export function getDisplayUnitLabel(unit: MeasurementUnit): string {
  return unit === 'imperial' ? 'in' : 'cm';
}

/**
 * Get the display unit symbol (can include Unicode symbols)
 */
export function getDisplayUnitSymbol(unit: MeasurementUnit): string {
  return unit === 'imperial' ? '"' : 'cm';
}

/**
 * Convert inches to the appropriate display value based on unit preference
 * This is the main conversion function for displaying measurements
 */
export function convertInchesToDisplay(
  inches: number,
  unit: MeasurementUnit
): number {
  return unit === 'imperial' ? inches : inchesToCm(inches);
}

/**
 * Convert a display value back to inches for calculations
 * Use this when user inputs a measurement in their preferred unit
 * Applies rounding to avoid floating point precision errors
 */
export function convertDisplayToInches(
  value: number,
  unit: MeasurementUnit
): number {
  const inches = unit === 'imperial' ? value : cmToInches(value);
  // Round to 3 decimal places to avoid floating point precision errors
  // (e.g., 5.5cm -> 2.165354... becomes 2.165)
  return roundToThreeDecimals(inches);
}

/**
 * Format a measurement value with appropriate precision and unit
 */
export function formatMeasurement(
  inches: number,
  unit: MeasurementUnit,
  options?: {
    includeUnit?: boolean;
    precision?: number;
  }
): string {
  const includeUnit = options?.includeUnit ?? true;
  const precision = options?.precision ?? getPrecisionForUnit(unit);

  const displayValue = convertInchesToDisplay(inches, unit);
  const formatted = displayValue.toFixed(precision);

  if (includeUnit) {
    const unitLabel = getDisplayUnitLabel(unit);
    return `${formatted}${unitLabel}`;
  }

  return formatted;
}

/**
 * Format a dimension pair (e.g., "8x10" or "20x25cm")
 */
export function formatDimensionPair(
  widthInches: number,
  heightInches: number,
  unit: MeasurementUnit,
  options?: {
    includeUnit?: boolean;
    precision?: number;
  }
): string {
  const includeUnit = options?.includeUnit ?? true;
  const precision = options?.precision ?? 0; // Default to whole numbers for dimensions

  const displayWidth = convertInchesToDisplay(widthInches, unit);
  const displayHeight = convertInchesToDisplay(heightInches, unit);

  const widthStr = displayWidth.toFixed(precision);
  const heightStr = displayHeight.toFixed(precision);

  if (includeUnit) {
    const unitLabel = getDisplayUnitLabel(unit);
    return `${widthStr}×${heightStr}${unitLabel}`;
  }

  return `${widthStr}×${heightStr}`;
}

/**
 * Get step size for sliders/inputs based on unit
 * Imperial: 1/8 inch (0.125)
 * Metric: 1mm (0.1cm)
 */
export function getStepSizeForUnit(unit: MeasurementUnit): number {
  return unit === 'imperial' ? 0.125 : 0.1;
}

/**
 * Convert a step size from inches to display units
 */
export function convertStepSize(
  stepInches: number,
  unit: MeasurementUnit
): number {
  if (unit === 'imperial') {
    return stepInches;
  }
  // For metric, round to nearest 0.1cm
  const stepCm = inchesToCm(stepInches);
  return Math.round(stepCm * 10) / 10;
}

/**
 * Type guard to check if a unit is metric
 */
export function isMetric(unit: MeasurementUnit): boolean {
  return unit === 'metric';
}

/**
 * Type guard to check if a unit is imperial
 */
export function isImperial(unit: MeasurementUnit): boolean {
  return unit === 'imperial';
}
