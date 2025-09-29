// Precision and rounding utilities
import { CALCULATION_CONSTANTS } from '@/constants/calculations';

const { ROUNDING_MULTIPLIER, DECIMAL_PLACES } = CALCULATION_CONSTANTS.PRECISION;

/**
 * Round a number to a specified number of decimal places
 * @param value - The number to round
 * @param places - Number of decimal places (default: 2)
 * @returns Rounded number
 */
export const roundToPrecision = (
  value: number,
  places: number = DECIMAL_PLACES
): number => {
  const multiplier = Math.pow(10, places);
  return Math.round(value * multiplier) / multiplier;
};

/**
 * Round a number to 2 decimal places using the standard multiplier
 * @param value - The number to round
 * @returns Rounded number
 */
export const roundToStandardPrecision = (value: number): number => {
  return Math.round(value * ROUNDING_MULTIPLIER) / ROUNDING_MULTIPLIER;
};

/**
 * Create a hash key for memoization with consistent precision
 * @param values - Array of numbers to include in the key
 * @returns String key for memoization
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

export default {
  roundToPrecision,
  roundToStandardPrecision,
  createMemoKey,
};
