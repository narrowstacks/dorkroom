/** Pure geometry for the meter scrub ruler — shared by the overlay (rendering)
 * and the scrubber (gesture → value). No React, so it stays unit-testable. */

/** Finger distance (px) that advances one stop — also the tick spacing, so the
 * ruler tracks the drag 1:1. */
export const SCRUB_COL_WIDTH = 56;
/** Empty gap (px) inserted between repeats of the value list, so the infinite
 * wrap reads as a deliberate loop seam rather than max butting against min. */
export const SCRUB_GAP = 28;

/**
 * Which option index sits under the center window for a given drag, accounting
 * for the inter-cycle gap. Returns `0..len`; `len` means the loop wrapped to the
 * next cycle's first value (caller takes it mod len). `dir` is +1 when a positive
 * drag raises the index (ISO) and −1 when it lowers it (aperture/shutter).
 */
export function scrubLandingIndex(
  baseIndex: number,
  drag: number,
  len: number,
  dir: number
): number {
  const period = len * SCRUB_COL_WIDTH + SCRUB_GAP;
  const scroll = baseIndex * SCRUB_COL_WIDTH + drag * dir;
  const s = ((scroll % period) + period) % period;
  let i = Math.round(s / SCRUB_COL_WIDTH);
  if (i < 0) i = 0;
  if (i >= len) {
    // Centered over the gap — snap to whichever loop end is nearer.
    const distToLast = s - (len - 1) * SCRUB_COL_WIDTH;
    const distToNext = period - s;
    i = distToLast <= distToNext ? len - 1 : len;
  }
  return i;
}
