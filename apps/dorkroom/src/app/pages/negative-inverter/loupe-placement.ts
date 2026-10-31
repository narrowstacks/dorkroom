/** Loupe diameter in CSS pixels. */
export const LOUPE_SIZE = 132;

/** Gap between the finger (or crosshair) and the loupe, in CSS pixels. */
export const LOUPE_GAP = 40;

/** Room above the loupe kept clear of the viewport top (the sticky site
 *  header sits there). */
const VIEWPORT_MARGIN = 16;

export interface LoupeAnchor {
  /** The point's distance below the top of the photo frame, in CSS pixels. */
  yInFrame: number;
  /** The point's height in the viewport, in CSS pixels. */
  clientY: number;
}

/**
 * Whether the loupe goes under the point instead of above it.
 *
 * Above is preferred, since a finger covers what is below it. But the photo
 * sits in a card that clips its overflow, so the loupe drops below whenever
 * it would stick out of the top of the photo frame, or past the top of the
 * viewport. Under the photo there is always room: the tool controls follow
 * it inside the same card.
 */
export function loupeBelow({ yInFrame, clientY }: LoupeAnchor): boolean {
  const needed = LOUPE_SIZE + LOUPE_GAP;
  return yInFrame < needed || clientY < needed + VIEWPORT_MARGIN;
}
