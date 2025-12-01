/* ------------------------------------------------------------------ *
   border-calculations.ts
   -------------------------------------------------------------
   Geometry helpers adapted from the original border calculator
\* ------------------------------------------------------------------ */

import { BLADE_THICKNESS, EASEL_SIZES } from '../constants/border-calculator';
import {
  CALCULATION_CONSTANTS,
  DERIVED_CONSTANTS,
} from '../constants/calculations';
import { createMemoKey, roundToStandardPrecision } from './precision';

const { BORDER_OPTIMIZATION, CACHE, PAPER } = CALCULATION_CONSTANTS;

/* ------------------------------------------------------------------ *
   Easel fitting helpers
 * ------------------------------------------------------------------ */

const SORTED_EASEL_SIZES = [...EASEL_SIZES].sort(
  (a, b) => a.width * a.height - b.width * b.height
);

const exactMatchLookup = new Set(
  EASEL_SIZES.flatMap((e) => [
    `${e.width}x${e.height}`,
    `${e.height}x${e.width}`,
  ])
);

const fitMemo = new Map<string, ReturnType<typeof computeFit>>();

function computeFit(paperW: number, paperH: number, landscape: boolean) {
  const oriented = landscape
    ? { width: paperH, height: paperW }
    : { width: paperW, height: paperH };
  const isNonStandard = !exactMatchLookup.has(`${paperW}x${paperH}`);

  if (!isNonStandard) {
    const easel = EASEL_SIZES.find(
      (e) =>
        (e.width === oriented.width && e.height === oriented.height) ||
        (e.height === oriented.width && e.width === oriented.height)
    );

    if (easel) {
      const easelSize = { width: easel.width, height: easel.height };
      return {
        easelSize,
        effectiveSlot: easelSize,
        isNonStandardPaperSize: false,
      } as const;
    }
  }

  let bestFit: {
    easel: { width: number; height: number };
    slot: { width: number; height: number };
  } | null = null;
  let minWaste = Infinity;

  for (const easel of SORTED_EASEL_SIZES) {
    const fits =
      easel.width >= oriented.width && easel.height >= oriented.height;
    const fitsRotated =
      easel.height >= oriented.width && easel.width >= oriented.height;

    if (!fits && !fitsRotated) continue;

    const waste = easel.width * easel.height - oriented.width * oriented.height;
    if (waste < minWaste) {
      minWaste = waste;
      bestFit = {
        easel,
        slot: fits
          ? { width: easel.width, height: easel.height }
          : { width: easel.height, height: easel.width },
      };
      if (waste === 0) break;
    }
  }

  if (!bestFit) {
    return {
      easelSize: oriented,
      effectiveSlot: oriented,
      isNonStandardPaperSize: true,
    } as const;
  }

  return {
    easelSize: { width: bestFit.easel.width, height: bestFit.easel.height },
    effectiveSlot: bestFit.slot,
    isNonStandardPaperSize: true,
  } as const;
}

/**
 * Finds the optimal easel size and centering offsets for a given paper size.
 * Determines if the paper is a standard size or requires a custom easel.
 *
 * @param paperW - Paper width in inches
 * @param paperH - Paper height in inches
 * @param landscape - Whether the paper is oriented in landscape mode
 * @returns Object containing easel size, effective slot dimensions, and standard size flag
 * @example
 * ```typescript
 * const result = findCenteringOffsets(8, 10, false);
 * console.log(result.easelSize); // { width: 8, height: 10 }
 * console.log(result.isNonStandardPaperSize); // false
 * ```
 */
export const findCenteringOffsets = (
  paperW: number,
  paperH: number,
  landscape: boolean
) => {
  const key = createMemoKey(paperW, paperH, landscape);
  let cached = fitMemo.get(key);

  if (!cached) {
    cached = computeFit(paperW, paperH, landscape);
    if (fitMemo.size >= CACHE.MAX_MEMO_SIZE) {
      const firstKey = fitMemo.keys().next().value;
      if (firstKey) fitMemo.delete(firstKey);
    }
    fitMemo.set(key, cached);
  }

  return cached;
};

/* ------------------------------------------------------------------ *
   Blade thickness
 * ------------------------------------------------------------------ */

/**
 * Calculates the blade thickness based on paper dimensions.
 * Scales blade thickness relative to paper area to maintain proportional appearance.
 *
 * @param paperW - Paper width in inches
 * @param paperH - Paper height in inches
 * @returns Calculated blade thickness, defaults to standard thickness for invalid dimensions
 * @example
 * ```typescript
 * const thickness = calculateBladeThickness(8, 10);
 * console.log(thickness); // Returns scaled blade thickness
 * ```
 */
export const calculateBladeThickness = (paperW: number, paperH: number) => {
  if (paperW <= 0 || paperH <= 0) return BLADE_THICKNESS;

  const area = paperW * paperH;
  const scale = Math.min(
    DERIVED_CONSTANTS.BASE_PAPER_AREA /
      Math.max(area, BORDER_OPTIMIZATION.EPSILON),
    PAPER.MAX_SCALE_FACTOR
  );

  return Math.round(BLADE_THICKNESS * scale);
};

/* ------------------------------------------------------------------ *
   Border optimisation helpers
 * ------------------------------------------------------------------ */

const computeBorders = (
  paperW: number,
  paperH: number,
  ratio: number,
  minBorder: number
) => {
  const availableW = paperW - 2 * minBorder;
  const availableH = paperH - 2 * minBorder;

  if (availableW <= 0 || availableH <= 0) return null;

  const [printW, printH] =
    availableW / availableH > ratio
      ? [availableH * ratio, availableH]
      : [availableW, availableW / ratio];

  const borderW = (paperW - printW) / 2;
  const borderH = (paperH - printH) / 2;

  return [borderW, borderW, borderH, borderH] as const;
};

/**
 * Calculates the optimal minimum border size to snap borders to convenient measurements.
 * Uses an optimization algorithm to find border values that align with common fractions.
 *
 * @param paperW - Paper width in inches
 * @param paperH - Paper height in inches
 * @param ratioW - Aspect ratio width component
 * @param ratioH - Aspect ratio height component
 * @param start - Starting minimum border value for optimization
 * @returns Optimized minimum border value that produces clean border measurements
 * @example
 * ```typescript
 * const optimal = calculateOptimalMinBorder(8, 10, 2, 3, 0.5);
 * console.log(optimal); // Returns border value that snaps to clean fractions
 * ```
 */
export const calculateOptimalMinBorder = (
  paperW: number,
  paperH: number,
  ratioW: number,
  ratioH: number,
  start: number
) => {
  if (ratioH === 0) return start;

  const ratio = ratioW / ratioH;
  const lower = Math.max(0.01, start - BORDER_OPTIMIZATION.SEARCH_SPAN);
  const upper = start + BORDER_OPTIMIZATION.SEARCH_SPAN;
  let best = start;
  let bestScore = Infinity;

  const adaptiveStep = Math.max(
    BORDER_OPTIMIZATION.STEP,
    (upper - lower) / BORDER_OPTIMIZATION.ADAPTIVE_STEP_DIVISOR
  );

  for (let candidate = lower; candidate <= upper; candidate += adaptiveStep) {
    const borders = computeBorders(paperW, paperH, ratio, candidate);
    if (!borders) continue;

    let score = 0;
    for (const border of borders) {
      const remainder = border % BORDER_OPTIMIZATION.SNAP;
      score += Math.min(remainder, BORDER_OPTIMIZATION.SNAP - remainder);
      if (score >= bestScore) break;
    }

    if (score < bestScore - BORDER_OPTIMIZATION.EPSILON) {
      bestScore = score;
      best = candidate;
      if (bestScore < BORDER_OPTIMIZATION.EPSILON) break;
    }
  }

  return roundToStandardPrecision(best);
};

/* ------------------------------------------------------------------ *
   Geometry helpers consumed by hooks
 * ------------------------------------------------------------------ */

/**
 * Computes the maximum print size that fits within the paper boundaries
 * while maintaining the specified aspect ratio and minimum border.
 *
 * @param paperW - Paper width in inches
 * @param paperH - Paper height in inches
 * @param ratioW - Desired aspect ratio width component
 * @param ratioH - Desired aspect ratio height component
 * @param minBorder - Minimum border width on all sides
 * @returns Object containing calculated print width and height
 * @example
 * ```typescript
 * const size = computePrintSize(8, 10, 2, 3, 0.5);
 * console.log(size); // { printW: 7.0, printH: 4.67 }
 * ```
 */
export const computePrintSize = (
  paperW: number,
  paperH: number,
  ratioW: number,
  ratioH: number,
  minBorder: number
) => {
  if (ratioH <= 0 || paperW <= 0 || paperH <= 0 || minBorder < 0) {
    return { printW: 0, printH: 0 };
  }

  const availableW = paperW - 2 * minBorder;
  const availableH = paperH - 2 * minBorder;

  if (availableW <= 0 || availableH <= 0) {
    return { printW: 0, printH: 0 };
  }

  const targetRatio = ratioW / ratioH;
  const availableRatio = availableW / availableH;

  if (availableRatio > targetRatio) {
    const printH = availableH;
    return { printW: printH * targetRatio, printH };
  }

  const printW = availableW;
  return { printW, printH: printW / targetRatio };
};

/**
 * Clamps horizontal and vertical offsets to ensure the print stays within paper bounds.
 * Respects minimum border requirements unless explicitly ignored.
 *
 * @param paperW - Paper width in inches
 * @param paperH - Paper height in inches
 * @param printW - Print width in inches
 * @param printH - Print height in inches
 * @param minBorder - Minimum required border width
 * @param horizontalOffset - Desired horizontal offset from center
 * @param verticalOffset - Desired vertical offset from center
 * @param ignoreMinBorder - Whether to ignore minimum border constraints
 * @returns Object with clamped offsets, half dimensions, and warning messages
 * @example
 * ```typescript
 * const result = clampOffsets(8, 10, 6, 8, 0.5, 1, 0.5, false);
 * console.log(result.h, result.v); // Clamped horizontal and vertical offsets
 * console.log(result.warning); // Warning message if offsets were adjusted
 * ```
 */
export const clampOffsets = (
  paperW: number,
  paperH: number,
  printW: number,
  printH: number,
  minBorder: number,
  horizontalOffset: number,
  verticalOffset: number,
  ignoreMinBorder: boolean
) => {
  const halfW = (paperW - printW) / 2;
  const halfH = (paperH - printH) / 2;
  const maxH = ignoreMinBorder ? halfW : Math.min(halfW - minBorder, halfW);
  const maxV = ignoreMinBorder ? halfH : Math.min(halfH - minBorder, halfH);

  const clampedH = Math.max(-maxH, Math.min(maxH, horizontalOffset));
  const clampedV = Math.max(-maxV, Math.min(maxV, verticalOffset));

  let warning: string | null = null;
  if (clampedH !== horizontalOffset || clampedV !== verticalOffset) {
    warning = ignoreMinBorder
      ? 'Offset adjusted to keep print on paper.'
      : 'Offset adjusted to honour min-border.';
  }

  return { halfW, halfH, h: clampedH, v: clampedV, warning };
};

/**
 * Calculates border widths from gap dimensions and offsets.
 * Converts centered positioning data into individual border measurements.
 *
 * @param halfW - Half of the horizontal gap between print and paper edges
 * @param halfH - Half of the vertical gap between print and paper edges
 * @param offsetH - Horizontal offset from center position
 * @param offsetV - Vertical offset from center position
 * @returns Object containing left, right, top, and bottom border widths
 * @example
 * ```typescript
 * const borders = bordersFromGaps(1.0, 1.5, 0.25, -0.1);
 * console.log(borders); // { left: 1.25, right: 0.75, top: 1.4, bottom: 1.6 }
 * ```
 */
export const bordersFromGaps = (
  halfW: number,
  halfH: number,
  offsetH: number,
  offsetV: number
) => ({
  left: halfW - offsetH,
  right: halfW + offsetH,
  bottom: halfH - offsetV,
  top: halfH + offsetV,
});

/**
 * Calculates blade position readings for trimming setup.
 * Converts print dimensions and shifts into blade positioning measurements.
 *
 * @param printW - Print width in inches
 * @param printH - Print height in inches
 * @param shiftX - Horizontal shift from center in inches
 * @param shiftY - Vertical shift from center in inches
 * @returns Object containing blade readings for left, right, top, and bottom positions
 * @example
 * ```typescript
 * const readings = bladeReadings(6, 8, 0.1, -0.05);
 * console.log(readings); // { left: 5.8, right: 6.2, top: 8.1, bottom: 7.9 }
 * ```
 */
export const bladeReadings = (
  printW: number,
  printH: number,
  shiftX: number,
  shiftY: number
) => ({
  left: printW - 2 * shiftX,
  right: printW + 2 * shiftX,
  top: printH - 2 * shiftY,
  bottom: printH + 2 * shiftY,
});

/**
 * Validates that a print with given dimensions and offsets fits within the paper boundaries.
 * Checks that all borders are non-negative after applying offsets.
 *
 * @param paperW - Paper width in inches
 * @param paperH - Paper height in inches
 * @param printW - Print width in inches
 * @param printH - Print height in inches
 * @param offsetH - Horizontal offset from center position
 * @param offsetV - Vertical offset from center position
 * @returns True if the print fits within paper bounds, false otherwise
 * @example
 * ```typescript
 * const fits = validatePrintFits(8, 10, 6, 8, 0.5, 0);
 * console.log(fits); // true if print fits, false if it extends beyond paper
 * ```
 */
export const validatePrintFits = (
  paperW: number,
  paperH: number,
  printW: number,
  printH: number,
  offsetH: number,
  offsetV: number
) => {
  const halfW = (paperW - printW) / 2;
  const halfH = (paperH - printH) / 2;

  const left = halfW - offsetH;
  const right = halfW + offsetH;
  const top = halfH - offsetV;
  const bottom = halfH + offsetV;

  return left >= 0 && right >= 0 && top >= 0 && bottom >= 0;
};

/* ------------------------------------------------------------------ *
   Quarter-inch rounding helpers
 * ------------------------------------------------------------------ */

const QUARTER_INCH = 0.25;
const ROUNDING_EPSILON = 0.0001;

export interface QuarterInchRoundParams {
  paperWidth: number;
  paperHeight: number;
  ratioWidth: number;
  ratioHeight: number;
  currentMinBorder: number;
  printWidth: number;
  printHeight: number;
}

const isQuarterIncrement = (value: number) => {
  if (!Number.isFinite(value)) return false;
  const scaled = value / QUARTER_INCH;
  return Math.abs(scaled - Math.round(scaled)) < 0.001;
};

/**
 * Calculates a minimum border size that results in print dimensions being multiples of 0.25 inches.
 * Tries to find a border size close to the current one that satisfies this condition.
 *
 * @param params - Calculation parameters including paper, ratio, and current dimensions
 * @returns Optimized border size or null if no suitable solution found
 */
export const calculateQuarterInchMinBorder = ({
  paperWidth,
  paperHeight,
  ratioWidth,
  ratioHeight,
  currentMinBorder,
  printWidth,
  printHeight,
}: QuarterInchRoundParams): number | null => {
  if (
    paperWidth <= 0 ||
    paperHeight <= 0 ||
    ratioWidth <= 0 ||
    ratioHeight <= 0 ||
    printWidth <= 0 ||
    printHeight <= 0
  ) {
    return null;
  }

  const alreadyQuarterAligned =
    isQuarterIncrement(printWidth) && isQuarterIncrement(printHeight);
  if (alreadyQuarterAligned) {
    return null;
  }

  const unitWidth = ratioWidth * QUARTER_INCH;
  const unitHeight = ratioHeight * QUARTER_INCH;

  if (unitWidth <= 0 || unitHeight <= 0) {
    return null;
  }

  const widthMultiplier = Math.floor(
    (printWidth + ROUNDING_EPSILON) / unitWidth
  );
  const heightMultiplier = Math.floor(
    (printHeight + ROUNDING_EPSILON) / unitHeight
  );
  let multiplier = Math.min(widthMultiplier, heightMultiplier);

  if (multiplier <= 0) {
    return null;
  }

  const evaluateCandidate = (candidate: number) => {
    if (!Number.isFinite(candidate)) return null;
    if (candidate < currentMinBorder - ROUNDING_EPSILON) return null;

    const { printW, printH } = computePrintSize(
      paperWidth,
      paperHeight,
      ratioWidth,
      ratioHeight,
      candidate
    );

    if (
      printW <= 0 ||
      printH <= 0 ||
      printW > printWidth + QUARTER_INCH ||
      printH > printHeight + QUARTER_INCH
    ) {
      return null;
    }

    if (isQuarterIncrement(printW) && isQuarterIncrement(printH)) {
      const roundedBorder = roundToStandardPrecision(Math.max(candidate, 0));
      if (Math.abs(roundedBorder - currentMinBorder) < ROUNDING_EPSILON) {
        return null;
      }
      return roundedBorder;
    }

    return null;
  };

  while (multiplier > 0) {
    const targetWidth = unitWidth * multiplier;
    const targetHeight = unitHeight * multiplier;

    if (targetWidth <= 0 || targetHeight <= 0) {
      break;
    }

    const widthCandidate = (paperWidth - targetWidth) / 2;
    const fromWidth = evaluateCandidate(widthCandidate);
    if (fromWidth !== null) {
      return fromWidth;
    }

    const heightCandidate = (paperHeight - targetHeight) / 2;
    if (Math.abs(heightCandidate - widthCandidate) > ROUNDING_EPSILON) {
      const fromHeight = evaluateCandidate(heightCandidate);
      if (fromHeight !== null) {
        return fromHeight;
      }
    }

    multiplier -= 1;
  }

  return null;
};
