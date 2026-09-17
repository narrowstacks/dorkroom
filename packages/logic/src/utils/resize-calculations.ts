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
 * Calculates the exposure change for a print resize.
 *
 * Both modes are inverse-square: print-size mode scales by the ratio of print
 * areas, enlarger-height mode by the ratio of squared heights.
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
export const calculateResizeExposure = ({
  isEnlargerHeightMode,
  originalTime,
  originalWidth,
  originalLength,
  newWidth,
  newLength,
  originalHeight,
  newHeight,
}: ResizeExposureInput): ResizeExposure => {
  if (isEnlargerHeightMode) {
    if (!isPositive(originalTime, originalHeight, newHeight)) {
      return EMPTY_EXPOSURE;
    }

    return fromRatio(originalTime, newHeight ** 2 / originalHeight ** 2);
  }

  if (
    !isPositive(
      originalTime,
      originalWidth,
      originalLength,
      newWidth,
      newLength
    )
  ) {
    return EMPTY_EXPOSURE;
  }

  const originalArea = originalWidth * originalLength;

  return fromRatio(originalTime, (newWidth * newLength) / originalArea);
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
 * Reports whether the original and new print dimensions share an aspect ratio.
 *
 * Ratios are compared at three decimals so that near-identical crops (6x4 to
 * 9x6) count as matched. Unusable dimensions report a match rather than warning
 * the user about input they have not finished typing.
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

  return (
    (originalWidth / originalLength).toFixed(3) ===
    (newWidth / newLength).toFixed(3)
  );
};
