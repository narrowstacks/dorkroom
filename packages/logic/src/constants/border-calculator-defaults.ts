/**
 * Default settings for the Border Calculator
 * Extracted to centralize calculator state initialization and make presets easier to manage.
 */

import { CALCULATION_CONSTANTS } from './calculations';

/**
 * Default values for all border calculator settings.
 * These are used to initialize the calculator state and provide a reset baseline.
 */
export const BORDER_CALCULATOR_DEFAULTS = {
  aspectRatio: '2:3' as const,
  paperSize: '8x10' as const,
  customAspectWidth: 2,
  customAspectHeight: 3,
  customPaperWidth: 8,
  customPaperHeight: 10,
  minBorder: CALCULATION_CONSTANTS.BORDER_OPTIMIZATION.SEARCH_SPAN,
  enableOffset: false,
  ignoreMinBorder: false,
  horizontalOffset: 0,
  verticalOffset: 0,
  showBlades: true,
  showBladeReadings: true,
  isLandscape: false,
  isRatioFlipped: false,
} as const;

export default BORDER_CALCULATOR_DEFAULTS;
