import { z } from 'zod';

/**
 * Shared Zod validators for form schemas across the application.
 * These provide consistent validation patterns with customizable messages and ranges.
 */

/**
 * Creates a validator for exposure time values (in seconds).
 * @param maxSeconds - Maximum allowed time in seconds (default: 3600 = 1 hour)
 */
export const exposureTimeValidator = (maxSeconds = 3600) =>
  z
    .number()
    .min(0.1, 'Time must be greater than 0')
    .max(maxSeconds, `Time cannot exceed ${maxSeconds} seconds`);

/**
 * Creates a validator for exposure stops adjustment.
 * Standard range is -5 to +5 stops.
 */
export const stopsValidator = () =>
  z
    .number()
    .min(-5, 'Stops adjustment cannot be less than -5')
    .max(5, 'Stops adjustment cannot be more than +5');

/**
 * Creates a validator for positive dimension values (width, height, etc.).
 * @param max - Maximum allowed value (default: 1000)
 */
export const positiveDimensionValidator = (max = 1000) =>
  z
    .number()
    .min(0.1, 'Value must be greater than 0')
    .max(max, 'Value is too large');

/**
 * Creates a validator for non-negative dimension values (can be 0).
 * @param max - Maximum allowed value (default: 1000)
 */
export const dimensionValidator = (max = 1000) =>
  z.number().min(0, 'Value must be non-negative').max(max, 'Value is too large');

/**
 * Creates a validator for reciprocity factors.
 * Standard range is 0.1 to 10.
 */
export const reciprocityFactorValidator = () =>
  z
    .number()
    .min(0.1, 'Reciprocity factor must be at least 0.1')
    .max(10, 'Reciprocity factor cannot exceed 10');
