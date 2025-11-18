/* ------------------------------------------------------------------ *
   precision.ts
   -------------------------------------------------------------
   Precision and rounding helpers mirrored from the original project
\* ------------------------------------------------------------------ */

import { CALCULATION_CONSTANTS } from '../constants/calculations';

const { ROUNDING_MULTIPLIER, DECIMAL_PLACES } = CALCULATION_CONSTANTS.PRECISION;

/**
 * Rounds a number to a specified number of decimal places using standard rounding.
 *
 * @param value - The number to round
 * @param places - Number of decimal places to round to (defaults to DECIMAL_PLACES constant)
 * @returns The rounded number
 *
 * @example
 * ```typescript
 * roundToPrecision(3.14159, 2); // returns 3.14
 * roundToPrecision(2.5, 0); // returns 3
 * roundToPrecision(1.2345); // returns 1.235 (using default precision)
 * ```
 */
export const roundToPrecision = (
  value: number,
  places: number = DECIMAL_PLACES
): number => {
  const multiplier = Math.pow(10, places);
  return Math.round(value * multiplier) / multiplier;
};

/**
 * Rounds a number using the standard application precision defined by ROUNDING_MULTIPLIER.
 * This ensures consistent precision across all calculations in the application.
 *
 * @param value - The number to round
 * @returns The rounded number using standard application precision
 *
 * @example
 * ```typescript
 * roundToStandardPrecision(3.14159265); // Rounds using app's standard precision
 * roundToStandardPrecision(2.50001); // Consistent with app precision
 * ```
 */
export const roundToStandardPrecision = (value: number): number => {
  return Math.round(value * ROUNDING_MULTIPLIER) / ROUNDING_MULTIPLIER;
};

/**
 * Creates a memoization key from multiple values, ensuring consistent key generation
 * for caching calculations. Numbers are rounded to standard precision before being
 * converted to strings to ensure cache hits for functionally equivalent inputs.
 *
 * @param values - Array of values to include in the memoization key
 * @returns A string key suitable for memoization caching
 *
 * @example
 * ```typescript
 * const key1 = createMemoKey(1.2345, true, 'mode');
 * const key2 = createMemoKey(1.2346, true, 'mode'); // Different due to precision
 * const cacheKey = createMemoKey(paperWidth, paperHeight, isLandscape);
 * ```
 */
export const createMemoKey = (
  ...values: (number | boolean | string)[]
): string => {
  return values
    .map((val) =>
      typeof val === 'number'
        ? Math.round(val * ROUNDING_MULTIPLIER).toString()
        : val.toString()
    )
    .join(':');
};

/**
 * Formats a numeric value for display by rounding to 3 decimal places.
 * Handles floating-point precision artifacts that commonly occur in calculations.
 *
 * @param value - The numeric value to format
 * @returns String representation of the value with 3 decimal places of precision
 *
 * @example
 * ```typescript
 * formatForDisplay(3.14159); // returns "3.142"
 * formatForDisplay(2.5); // returns "2.5"
 * formatForDisplay(1.00001); // returns "1"
 * ```
 */
export const formatForDisplay = (value: number): string => {
  return String(Math.round(value * 1000) / 1000);
};

export default {
  roundToPrecision,
  roundToStandardPrecision,
  createMemoKey,
  formatForDisplay,
};
