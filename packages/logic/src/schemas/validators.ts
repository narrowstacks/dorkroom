import { z } from 'zod';

/**
 * Shared Zod validators for form schemas across the application.
 * These provide consistent validation patterns with customizable messages and ranges.
 */

/** Shortest exposure time the validators accept, in seconds. */
export const EXPOSURE_TIME_MIN_SECONDS = 0.1;
/** Longest exposure time `exposureTimeValidator` accepts by default (1 hour). */
export const EXPOSURE_TIME_MAX_SECONDS = 3600;
/** Range `stopsValidator` accepts, in stops. */
export const STOPS_MIN = -5;
export const STOPS_MAX = 5;
/** Smallest and largest dimension `positiveDimensionValidator` accepts by default. */
export const POSITIVE_DIMENSION_MIN = 0.1;
export const POSITIVE_DIMENSION_MAX = 1000;
/** Range `reciprocityFactorValidator` accepts. */
export const RECIPROCITY_FACTOR_MIN = 0.1;
export const RECIPROCITY_FACTOR_MAX = 10;

/**
 * Creates a validator for exposure time values (in seconds).
 * @param maxSeconds - Maximum allowed time in seconds (default: 3600 = 1 hour)
 */
export const exposureTimeValidator = (maxSeconds = EXPOSURE_TIME_MAX_SECONDS) =>
  z
    .number()
    .min(EXPOSURE_TIME_MIN_SECONDS, 'Time must be greater than 0')
    .max(maxSeconds, `Time cannot exceed ${maxSeconds} seconds`);

/**
 * Creates a validator for exposure stops adjustment.
 * Standard range is -5 to +5 stops.
 */
export const stopsValidator = () =>
  z
    .number()
    .min(STOPS_MIN, 'Stops adjustment cannot be less than -5')
    .max(STOPS_MAX, 'Stops adjustment cannot be more than +5');

/**
 * Creates a validator for positive dimension values (width, height, etc.).
 * @param max - Maximum allowed value (default: 1000)
 */
export const positiveDimensionValidator = (max = POSITIVE_DIMENSION_MAX) =>
  z
    .number()
    .min(POSITIVE_DIMENSION_MIN, 'Value must be greater than 0')
    .max(max, 'Value is too large');

/**
 * Creates a validator for non-negative dimension values (can be 0).
 * @param max - Maximum allowed value (default: 1000)
 */
export const dimensionValidator = (max = 1000) =>
  z
    .number()
    .min(0, 'Value must be non-negative')
    .max(max, 'Value is too large');

/**
 * Creates a validator for reciprocity factors.
 * Standard range is 0.1 to 10.
 */
export const reciprocityFactorValidator = () =>
  z
    .number()
    .min(RECIPROCITY_FACTOR_MIN, 'Reciprocity factor must be at least 0.1')
    .max(RECIPROCITY_FACTOR_MAX, 'Reciprocity factor cannot exceed 10');
