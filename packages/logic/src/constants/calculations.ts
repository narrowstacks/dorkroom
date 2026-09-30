/* ------------------------------------------------------------------ *
   calculations.ts
   -------------------------------------------------------------
   Centralised calculation constants adapted from the original app
\* ------------------------------------------------------------------ */

export const CALCULATION_CONSTANTS = {
  DEBOUNCE_WARNING_DELAY: 250,
  BORDER_OPTIMIZATION: {
    EPSILON: 1e-9,
  },
  CACHE: {
    MAX_MEMO_SIZE: 50,
  },
  PRECISION: {
    DECIMAL_PLACES: 2,
    ROUNDING_MULTIPLIER: 100,
  },
  PAPER: {
    STANDARD_WIDTH: 20,
    STANDARD_HEIGHT: 24,
    MAX_SCALE_FACTOR: 2,
  },
} as const;

export const DERIVED_CONSTANTS = {
  BASE_PAPER_AREA:
    CALCULATION_CONSTANTS.PAPER.STANDARD_WIDTH *
    CALCULATION_CONSTANTS.PAPER.STANDARD_HEIGHT,
} as const;

export default {
  CALCULATION_CONSTANTS,
  DERIVED_CONSTANTS,
};
