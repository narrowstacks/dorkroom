/**
 * Default settings for the Exposure Calculator
 * Extracted to centralize calculator state initialization and make defaults easier to manage.
 */

import type { ExposureCalculatorState } from '../types/exposure-calculator';

/**
 * Default original exposure time in seconds (as string for input handling).
 */
export const DEFAULT_EXPOSURE_ORIGINAL_TIME = '10';

/**
 * Default stops adjustment value (as string for input handling).
 */
export const DEFAULT_EXPOSURE_STOPS = '1';

/**
 * Complete default state for the exposure calculator.
 * Used to initialize the calculator and provide a reset baseline.
 */
export const EXPOSURE_CALCULATOR_DEFAULTS = {
  originalTime: DEFAULT_EXPOSURE_ORIGINAL_TIME,
  stops: DEFAULT_EXPOSURE_STOPS,
  newTime: '',
} as const satisfies ExposureCalculatorState;

export default EXPOSURE_CALCULATOR_DEFAULTS;
