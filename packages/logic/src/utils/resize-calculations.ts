/**
 * Print-resize exposure arithmetic, shared by the web page and the iOS screen.
 *
 * Both surfaces previously carried their own copy of these formulas; the copies
 * were identical down to the rounding, which is exactly the shape that drifts
 * silently. Keeping the arithmetic here means a correction lands once.
 */

/** Exposure result for a resize, pre-formatted for display. */
export interface ResizeExposure {
  /** New exposure time in seconds, to one decimal. Empty when inputs are unusable. */
  newTime: string;
  /** Stop difference, to two decimals. Empty when inputs are unusable. */
  stopsDifference: string;
}

/** Dimensions and time describing a resize, in a single unit system. */
export interface ResizeExposureInput {
  /** When true, scale by enlarger height rather than print area. */
  isEnlargerHeightMode: boolean;
  originalTime: number;
  originalWidth: number;
  originalLength: number;
  newWidth: number;
  newLength: number;
  originalHeight: number;
  newHeight: number;
}

const EMPTY_EXPOSURE: ResizeExposure = { newTime: '', stopsDifference: '' };

const isPositive = (...values: number[]): boolean =>
  values.every((value) => Number.isFinite(value) && value > 0);

/** Formats an exposure ratio into the displayed time and stop difference. */
const fromRatio = (originalTime: number, ratio: number): ResizeExposure => ({
  newTime: (originalTime * ratio).toFixed(1),
  stopsDifference: Math.log2(ratio).toFixed(2),
});

/**
 * The exposure factor for a print resize: the ratio of print areas, or of
 * squared enlarger heights in enlarger-height mode. The original time is not
 * read.
 *
 * @returns The factor, or null when the relevant dimensions are not all
 *   positive and finite
 * @example
 * ```typescript
 * resizeExposureRatio({
 *   isEnlargerHeightMode: false,
 *   originalWidth: 8, originalLength: 10, newWidth: 11, newLength: 14,
 *   originalHeight: 0, newHeight: 0,
 * }); // 1.925
 * ```
 */
export const resizeExposureRatio = ({
  isEnlargerHeightMode,
  originalWidth,
  originalLength,
  newWidth,
  newLength,
  originalHeight,
  newHeight,
}: Omit<ResizeExposureInput, 'originalTime'>): number | null => {
  if (isEnlargerHeightMode) {
    return isPositive(originalHeight, newHeight)
      ? newHeight ** 2 / originalHeight ** 2
      : null;
  }
  return isPositive(originalWidth, originalLength, newWidth, newLength)
    ? (newWidth * newLength) / (originalWidth * originalLength)
    : null;
};

/**
 * Calculates the exposure change for a print resize.
 *
 * Both modes are inverse-square: print-size mode scales by the ratio of print
 * areas, enlarger-height mode by the ratio of squared heights
 * (`resizeExposureRatio`).
 *
 * @returns The new time and stop difference, or empty strings when the relevant
 *   inputs are not all positive and finite
 * @example
 * ```typescript
 * const bigger = calculateResizeExposure({
 *   isEnlargerHeightMode: false,
 *   originalTime: 10, originalWidth: 6, originalLength: 4,
 *   newWidth: 9, newLength: 6, originalHeight: 0, newHeight: 0,
 * });
 * // bigger.newTime === '22.5', bigger.stopsDifference === '1.17'
 * ```
 */
export const calculateResizeExposure = (
  input: ResizeExposureInput
): ResizeExposure => {
  const ratio = resizeExposureRatio(input);
  if (ratio === null || !isPositive(input.originalTime)) {
    return EMPTY_EXPOSURE;
  }
  return fromRatio(input.originalTime, ratio);
};

/** Print dimensions to compare, in a single unit system. */
export interface AspectRatioInput {
  /** Enlarger-height mode has no print dimensions to compare, so it always matches. */
  isEnlargerHeightMode: boolean;
  originalWidth: number;
  originalLength: number;
  newWidth: number;
  newLength: number;
}

/**
 * Relative difference under which two print ratios count as the same.
 *
 * Metric input is stored as inches rounded to 3 decimals, which perturbs each
 * dimension by up to 0.0005in. For a 1cm (0.394in) side that is 0.13%, so a
 * ratio can move by about 0.26% without the user changing anything (#343:
 * 11x16cm to 22x32cm used to warn). 0.5% clears that with margin, while the
 * closest pair of standard papers (8x10 vs 11x14) differs by 1.8%, and a 0.5%
 * crop is half a millimetre on a 10cm print.
 */
export const ASPECT_RATIO_TOLERANCE = 0.005;

/**
 * Reports whether the original and new print dimensions share an aspect ratio.
 *
 * Ratios are compared with a relative tolerance (`ASPECT_RATIO_TOLERANCE`) so
 * unit-conversion rounding never reads as a crop. Unusable dimensions report a
 * match rather than warning the user about input they have not finished typing.
 */
export const matchesAspectRatio = ({
  isEnlargerHeightMode,
  originalWidth,
  originalLength,
  newWidth,
  newLength,
}: AspectRatioInput): boolean => {
  if (isEnlargerHeightMode) {
    return true;
  }

  if (!isPositive(originalWidth, originalLength, newWidth, newLength)) {
    return true;
  }

  const originalRatio = originalWidth / originalLength;
  const newRatio = newWidth / newLength;

  return (
    Math.abs(originalRatio - newRatio) / Math.max(originalRatio, newRatio) <=
    ASPECT_RATIO_TOLERANCE
  );
};
