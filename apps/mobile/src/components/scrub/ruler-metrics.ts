/**
 * Vertical layout of the ruler strip, in px. Labels sit in their own band at
 * the top and the centre indicator starts below it, so nothing can overlap a
 * label: they pass above the indicator untouched.
 */
export const RULER_METRICS = {
  height: 42,
  labelTop: 6,
  labelHeight: 12,
  /** Clear space between the bottom of the labels and the indicator's top. */
  labelGap: 4,
  majorTick: 16,
  minorTick: 9,
} as const;

const labelBottom = RULER_METRICS.labelTop + RULER_METRICS.labelHeight;

/** Top of the centre indicator; it runs from here to the bottom of the strip. */
export const INDICATOR_TOP = labelBottom + RULER_METRICS.labelGap;

/** How much taller than a major tick the indicator is. */
export const INDICATOR_OVERHANG =
  RULER_METRICS.height - INDICATOR_TOP - RULER_METRICS.majorTick;
