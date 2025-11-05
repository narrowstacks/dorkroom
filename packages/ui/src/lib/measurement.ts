/**
 * Measurement formatting utilities for UI components
 *
 * This module provides UI-friendly wrappers around the core unit conversion
 * utilities from @dorkroom/logic. Use these functions in React components
 * for consistent measurement display.
 */

import {
  type MeasurementUnit,
  convertInchesToDisplay,
  convertDisplayToInches,
  getPrecisionForUnit,
  getDisplayUnitLabel,
  getDisplayUnitSymbol,
  formatMeasurement as coreFormatMeasurement,
  formatDimensionPair as coreFormatDimensionPair,
  getStepSizeForUnit,
  convertStepSize,
} from '@dorkroom/logic';

/**
 * Format a measurement value for display with unit
 * @param inches - Value in inches (internal storage format)
 * @param unit - Display unit preference
 * @returns Formatted string like "8.00in" or "20.3cm"
 */
export function formatMeasurementWithUnit(
  inches: number,
  unit: MeasurementUnit
): string {
  return coreFormatMeasurement(inches, unit, { includeUnit: true });
}

/**
 * Format a measurement value for display without unit
 * @param inches - Value in inches (internal storage format)
 * @param unit - Display unit preference
 * @returns Formatted string like "8.00" or "20.3"
 */
export function formatMeasurementValue(
  inches: number,
  unit: MeasurementUnit
): string {
  return coreFormatMeasurement(inches, unit, { includeUnit: false });
}

/**
 * Format dimensions like "8×10in" or "20×25cm"
 * @param widthInches - Width in inches
 * @param heightInches - Height in inches
 * @param unit - Display unit preference
 * @returns Formatted dimension string
 */
export function formatDimensions(
  widthInches: number,
  heightInches: number,
  unit: MeasurementUnit
): string {
  return coreFormatDimensionPair(widthInches, heightInches, unit, {
    includeUnit: true,
    precision: 0,
  });
}

/**
 * Format dimensions with higher precision like "8.25×10.50in"
 * @param widthInches - Width in inches
 * @param heightInches - Height in inches
 * @param unit - Display unit preference
 * @returns Formatted dimension string with decimals
 */
export function formatPreciseDimensions(
  widthInches: number,
  heightInches: number,
  unit: MeasurementUnit
): string {
  return coreFormatDimensionPair(widthInches, heightInches, unit, {
    includeUnit: true,
    precision: getPrecisionForUnit(unit),
  });
}

/**
 * Get just the unit label for display
 * @param unit - Unit preference
 * @returns "in" or "cm"
 */
export function getUnitLabel(unit: MeasurementUnit): string {
  return getDisplayUnitLabel(unit);
}

/**
 * Get unit symbol (can include Unicode)
 * @param unit - Unit preference
 * @returns '"' for inches or 'cm' for metric
 */
export function getUnitSymbol(unit: MeasurementUnit): string {
  return getDisplayUnitSymbol(unit);
}

/**
 * Convert inches to display value (number only, no formatting)
 * Use this for number inputs where you need the raw value
 * @param inches - Value in inches
 * @param unit - Display unit preference
 * @returns Converted number
 */
export function toDisplayValue(
  inches: number,
  unit: MeasurementUnit
): number {
  return convertInchesToDisplay(inches, unit);
}

/**
 * Convert display value back to inches for storage/calculations
 * Use this when processing user input
 * @param value - User input value
 * @param unit - Current unit preference
 * @returns Value in inches
 */
export function toInternalValue(
  value: number,
  unit: MeasurementUnit
): number {
  return convertDisplayToInches(value, unit);
}

/**
 * Get the appropriate step size for inputs/sliders
 * @param unit - Current unit preference
 * @returns Step size (0.125 for imperial, 0.1 for metric)
 */
export function getInputStepSize(unit: MeasurementUnit): number {
  return getStepSizeForUnit(unit);
}

/**
 * Convert a step size from inches to display units
 * Useful when you have imperial step sizes that need metric conversion
 * @param stepInches - Step size in inches
 * @param unit - Target display unit
 * @returns Converted step size
 */
export function convertStepToDisplay(
  stepInches: number,
  unit: MeasurementUnit
): number {
  return convertStepSize(stepInches, unit);
}

/**
 * Get precision for formatting (decimal places)
 * @param unit - Current unit preference
 * @returns Number of decimal places (2 for imperial, 1 for metric)
 */
export function getDisplayPrecision(unit: MeasurementUnit): number {
  return getPrecisionForUnit(unit);
}

/**
 * Helper to format a range like "0.5-6.0in" or "1.3-15.2cm"
 * @param minInches - Minimum value in inches
 * @param maxInches - Maximum value in inches
 * @param unit - Display unit preference
 * @returns Formatted range string
 */
export function formatMeasurementRange(
  minInches: number,
  maxInches: number,
  unit: MeasurementUnit
): string {
  const minFormatted = coreFormatMeasurement(minInches, unit, {
    includeUnit: false,
  });
  const maxFormatted = coreFormatMeasurement(maxInches, unit, {
    includeUnit: false,
  });
  const unitLabel = getDisplayUnitLabel(unit);
  return `${minFormatted}-${maxFormatted}${unitLabel}`;
}
