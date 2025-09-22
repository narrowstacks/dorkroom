// Centralized calculation constants for mathematical operations and algorithms

export const CALCULATION_CONSTANTS = {
  // Debounce and timing constants
  DEBOUNCE_WARNING_DELAY: 250, // Milliseconds to debounce warning messages

  // Border optimization algorithm parameters
  BORDER_OPTIMIZATION: {
    STEP: 0.01, // Step size for border optimization search
    SEARCH_SPAN: 0.5, // Search range around starting point (inches)
    SNAP: 0.25, // Snap increment for border measurements (inches)
    EPSILON: 1e-9, // Floating point comparison tolerance
    ADAPTIVE_STEP_DIVISOR: 100, // Divisor for adaptive step size calculation
  },

  // Cache management settings
  CACHE: {
    MAX_MEMO_SIZE: 50, // Maximum number of cached calculation results
  },

  // Precision and rounding settings
  PRECISION: {
    DECIMAL_PLACES: 2, // Number of decimal places for display
    ROUNDING_MULTIPLIER: 100, // Multiplier for efficient rounding (10^DECIMAL_PLACES)
  },

  // Paper and easel standards
  PAPER: {
    STANDARD_WIDTH: 20, // Standard paper width in inches
    STANDARD_HEIGHT: 24, // Standard paper height in inches
    MAX_SCALE_FACTOR: 2, // Maximum scaling factor for blade thickness
  },
} as const;

// Derived constants calculated from base constants
export const DERIVED_CONSTANTS = {
  BASE_PAPER_AREA:
    CALCULATION_CONSTANTS.PAPER.STANDARD_WIDTH *
    CALCULATION_CONSTANTS.PAPER.STANDARD_HEIGHT, // 480 square inches
} as const;

// Default export with all constants
export default {
  CALCULATION_CONSTANTS,
  DERIVED_CONSTANTS,
};
