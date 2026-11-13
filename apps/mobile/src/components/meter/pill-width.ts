/** Side margin of the Meter's top control stacks (their `left`/`right`). */
export const TOP_STACK_MARGIN = 16;
/** Clear space the left pill keeps from the right-hand stack. */
const STACK_GAP = 8;
/** Narrower than this a pill cannot be read, so none is drawn. */
export const MIN_PILL_WIDTH = 88;
/** Used while the right stack is measured and empty. */
const HALF_SCREEN_INSET = 28;

/**
 * The widest the Reciprocity pill (top left, under the gear) may be without
 * reaching the stack at the top right (ISO lock and roll pills), whose measured
 * width is `rightStackWidth`: undefined before the first layout (no pill yet,
 * so it can never overlap for a frame), 0 when the stack is measured and empty.
 * Null when what is left is under `MIN_PILL_WIDTH`: draw no pill. With a
 * non-empty stack the pill always ends at least 8pt before it; with an empty
 * one it stays within half the screen.
 */
export function meterPillMaxWidth(input: {
  windowWidth: number;
  rightStackWidth: number | undefined;
}): number | null {
  const { windowWidth, rightStackWidth } = input;
  if (rightStackWidth === undefined) return null;
  const room =
    rightStackWidth > 0
      ? windowWidth - 2 * TOP_STACK_MARGIN - rightStackWidth - STACK_GAP
      : windowWidth / 2 - HALF_SCREEN_INSET;
  const width = Math.floor(room);
  return width < MIN_PILL_WIDTH ? null : width;
}
