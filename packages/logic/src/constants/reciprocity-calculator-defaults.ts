/**
 * Default settings for the Reciprocity Calculator
 * Extracted to centralize calculator state initialization and make defaults easier to manage.
 */

import { RECIPROCITY_FILM_TYPES } from './reciprocity';

/**
 * Default metered time for reciprocity calculation (as string for input handling).
 * Default is 30 seconds.
 */
export const DEFAULT_RECIPROCITY_METERED_TIME = '30s';

/**
 * Default custom reciprocity factor (as string for input handling).
 * Value of 1.3 is a reasonable middle-ground for most film types.
 */
export const DEFAULT_RECIPROCITY_CUSTOM_FACTOR = '1.3';

/**
 * Maximum width of the reciprocity time bar visualization in pixels.
 * Used for logarithmic scaling of the visual representation.
 */
export const RECIPROCITY_MAX_BAR_WIDTH = 300;

/**
 * Complete default state object for the reciprocity calculator.
 * Provides all initial values in a single, documented location.
 */
export const RECIPROCITY_CALCULATOR_DEFAULTS = {
  filmType: RECIPROCITY_FILM_TYPES[0].value,
  meteredTime: DEFAULT_RECIPROCITY_METERED_TIME,
  customFactor: DEFAULT_RECIPROCITY_CUSTOM_FACTOR,
  formattedTime: '30s',
  timeFormatError: null,
  lastValidCalculation: null,
} as const;

export default RECIPROCITY_CALCULATOR_DEFAULTS;
