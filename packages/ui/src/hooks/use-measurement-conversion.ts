/**
 * React hooks for measurement conversion in components
 *
 * These hooks combine the measurement context with conversion utilities
 * to provide easy-to-use measurement conversion in React components.
 */

import { useCallback, useMemo } from 'react';
import { useMeasurement } from '../contexts/measurement-context';
import {
  type FormatDimensionsOptions,
  formatDimensions,
  formatMeasurementRange,
  formatMeasurementValue,
  formatMeasurementWithUnit,
  formatPreciseDimensions,
  getDisplayPrecision,
  getInputStepSize,
  getUnitLabel,
  toDisplayValue,
  toInternalValue,
} from '../lib/measurement';

/**
 * Hook to get measurement formatting functions with current unit context
 * @returns Object with formatting functions that use the current unit preference
 */
export function useMeasurementFormatter() {
  const { unit } = useMeasurement();

  return {
    /**
     * Format a measurement with unit suffix (e.g., "8.00in" or "20.3cm")
     */
    formatWithUnit: (inches: number) => formatMeasurementWithUnit(inches, unit),

    /**
     * Format a measurement value without unit (e.g., "8.00" or "20.3")
     */
    formatValue: (inches: number) => formatMeasurementValue(inches, unit),

    /**
     * Format dimensions (e.g., "8×10in" or "20×25cm")
     */
    formatDimensions: (
      widthInches: number,
      heightInches: number,
      options?: FormatDimensionsOptions
    ) => formatDimensions(widthInches, heightInches, unit, options),

    /**
     * Format dimensions with precision (e.g., "8.25×10.50in")
     */
    formatPreciseDimensions: (widthInches: number, heightInches: number) =>
      formatPreciseDimensions(widthInches, heightInches, unit),

    /**
     * Format a range (e.g., "0.5-6.0in" or "1.3-15.2cm")
     */
    formatRange: (minInches: number, maxInches: number) =>
      formatMeasurementRange(minInches, maxInches, unit),

    /**
     * Get the current unit label
     */
    unitLabel: getUnitLabel(unit),

    /**
     * Get the current display precision
     */
    precision: getDisplayPrecision(unit),

    /**
     * Current unit preference
     */
    unit,
  };
}

/**
 * Hook to get conversion functions with current unit context
 * Use this when working with input/output conversions
 * @returns Object with conversion functions
 */
export function useMeasurementConverter() {
  const { unit } = useMeasurement();

  // Memoize conversion functions to preserve referential equality
  const toDisplay = useCallback(
    (inches: number) => toDisplayValue(inches, unit),
    [unit]
  );

  const toInches = useCallback(
    (value: number) => toInternalValue(value, unit),
    [unit]
  );

  // Memoize the entire return object to preserve referential equality
  return useMemo(
    () => ({
      /**
       * Convert inches to display value (respects current unit)
       */
      toDisplay,

      /**
       * Convert display value to inches for calculations
       */
      toInches,

      /**
       * Get the appropriate step size for inputs
       */
      stepSize: getInputStepSize(unit),

      /**
       * Get the current unit label
       */
      unitLabel: getUnitLabel(unit),

      /**
       * Get the current display precision
       */
      precision: getDisplayPrecision(unit),

      /**
       * Current unit preference
       */
      unit,
    }),
    [unit, toDisplay, toInches]
  );
}

/**
 * Hook that provides both formatting and conversion utilities
 * This is a convenience hook that combines both useMeasurementFormatter and useMeasurementConverter
 * @returns Combined utilities object
 */
export function useMeasurementUtils() {
  const formatter = useMeasurementFormatter();
  const converter = useMeasurementConverter();
  const { unit, setUnit, toggleUnit } = useMeasurement();

  return {
    ...formatter,
    ...converter,
    setUnit,
    toggleUnit,
    unit,
  };
}
