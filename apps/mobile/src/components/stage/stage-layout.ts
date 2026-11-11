/**
 * The stage screens' pure layout: where the drawing may sit, how tall the
 * control panel is at each detent, and which detent a release settles on. The
 * `.tsx` files only render what these return, and the worklet pieces run on
 * the UI thread inside the panel's pan.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

/** Height of the panel's grab strip, which is also its drag target. */
export const STRIP_HEIGHT = 40;
/** Space between the panel's sides and the screen's. */
export const PANEL_SIDE_MARGIN = 12;
/** Space between the panel and the tab bar it sits above. */
export const PANEL_TAB_GAP = 8;
/** Space left between the stage and the collapsed panel. */
export const STAGE_PANEL_GAP = 8;
/** How far from the screen's left edge a Back swipe may start (see `PhaseStack`). */
export const BACK_SWIPE_ZONE = 24;
/** Side margin of the stage. */
export const STAGE_GUTTER = 32;
/**
 * How far a drawing may bleed past the stage on every side: half an edge
 * handle's 44pt target. The drawing keeps its handles inside its own bounds,
 * where a touch is sure to reach them.
 */
export const STAGE_BLEED = 22;
/**
 * Where, in the drawing's own coordinates (which include the bleed), a hit
 * target may start at the left: the drawing sits `STAGE_GUTTER - STAGE_BLEED`
 * from the screen's edge at most, so a target starting here never reaches the
 * Back swipe's zone. A border near zero puts the left edge close to the bleed's
 * edge, where a full 44pt target would otherwise start inside the zone.
 */
export const HIT_MIN_LEFT = BACK_SWIPE_ZONE - (STAGE_GUTTER - STAGE_BLEED);
/**
 * What the drawing keeps while the panel is expanded: at least this many
 * points, or this share of the room between the header and the panel's resting
 * bottom, whichever is more.
 */
export const DRAWING_MIN_VISIBLE = 240;
export const DRAWING_MIN_SHARE = 0.45;
/** The collapsed panel's ceiling, as a share of that same room. Past it the
 * collapsed block scrolls inside the panel. */
export const COLLAPSED_MAX_SHARE = 0.45;
/** The widest the panel gets (an iPad), centred, like the hubs. */
export const PANEL_MAX_WIDTH = 560;
/**
 * The line under a drawing: the image or window size, and room for a
 * two-line warning. Font scaling on it is capped so it always fits.
 */
export const DRAWING_CAPTION_HEIGHT = 52;
export const CAPTION_MAX_FONT_SCALE = 1.2;
/** A release faster than this (px/s) picks its direction, wherever it is. */
export const FLING_VELOCITY = 600;
/** Space kept between the panel's top and the header when the keyboard is up. */
export const KEYBOARD_GAP = 8;

/**
 * The least room layout works with, in points. A smaller measured room (a very
 * small iPad window) is laid out as this, so the drawing and the panel still
 * render, a little over the header, instead of nothing.
 */
export const MIN_ROOM = 200;
/** The least height the stage is given. */
export const MIN_STAGE_HEIGHT = 100;

const finite = (n: number) => (Number.isFinite(n) ? n : 0);

/**
 * The area the drawing may fill: from under the header (and any pinned
 * readout) to just above the COLLAPSED panel. It reads only the collapsed
 * height, so the expanded panel and the keyboard can never move it.
 */
export function stageRect(input: {
  width: number;
  height: number;
  /** Where the stage starts: the header clearance plus any pinned header. */
  top: number;
  /** The panel's distance from the screen's bottom edge. */
  bottomOffset: number;
  collapsedHeight: number;
}): Rect {
  const { width, height, top, bottomOffset, collapsedHeight } = input;
  const bottom = height - bottomOffset - collapsedHeight - STAGE_PANEL_GAP;
  return {
    x: STAGE_GUTTER,
    y: top,
    width: Math.max(0, finite(width) - 2 * STAGE_GUTTER),
    height: Math.max(MIN_STAGE_HEIGHT, finite(bottom) - top),
  };
}

/** The panel's width and its left edge: full width less the margins, capped and centred. */
export function panelFrame(windowWidth: number) {
  const width = Math.max(
    0,
    Math.min(windowWidth - 2 * PANEL_SIDE_MARGIN, PANEL_MAX_WIDTH)
  );
  return { width, left: (windowWidth - width) / 2 };
}

/** The room between the header (and any pinned readout) and the panel's resting bottom. */
export function panelAvailable(
  windowHeight: number,
  topLimit: number,
  bottomOffset: number
): number {
  return Math.max(MIN_ROOM, finite(windowHeight - topLimit - bottomOffset));
}

/**
 * The collapsed panel's height: its block (strip included), but never more
 * than `COLLAPSED_MAX_SHARE` of the room, so the drawing keeps the rest. A
 * block taller than that scrolls inside the panel.
 */
export function collapsedPanelHeight(input: {
  /** The collapsed block's height, strip included. */
  blockHeight: number;
  available: number;
  /** A screen whose collapsed block is whole rows raises the cap so it never ends mid-row. */
  maxShare?: number;
}): number {
  const cap = Math.floor(
    input.available * (input.maxShare ?? COLLAPSED_MAX_SHARE)
  );
  return Math.min(Math.ceil(input.blockHeight), cap);
}

/**
 * The panel's height when expanded: its whole content, up to a ceiling that
 * leaves the drawing `max(240, 45%)` of the room in view. Content taller than
 * that scrolls inside. Never below the collapsed height.
 */
export function expandedPanelHeight(input: {
  /** Height of the panel with everything showing, strip included. */
  contentHeight: number;
  collapsedHeight: number;
  /** See `panelAvailable`. */
  available: number;
  /** A fixed floor for the drawing (see `drawingKeep`). */
  minDrawing?: number;
}): number {
  const { contentHeight, collapsedHeight, available } = input;
  const keep = drawingKeep(available, input.minDrawing);
  const ceiling = Math.max(collapsedHeight, Math.floor(available - keep));
  return Math.min(ceiling, Math.max(collapsedHeight, Math.ceil(contentHeight)));
}

/** Keeps a dragged height between the two detents. */
export function clampPanelHeight(
  height: number,
  collapsedHeight: number,
  expandedHeight: number
): number {
  'worklet';
  return Math.min(expandedHeight, Math.max(collapsedHeight, height));
}

/**
 * Whether a release settles on the expanded detent. A fling picks its
 * direction (`velocityY` is the finger's, so negative is up); a slower
 * release settles on the nearer detent.
 */
export function snapsToExpanded(input: {
  height: number;
  velocityY: number;
  collapsedHeight: number;
  expandedHeight: number;
}): boolean {
  'worklet';
  const { height, velocityY, collapsedHeight, expandedHeight } = input;
  if (expandedHeight <= collapsedHeight) return false;
  if (Math.abs(velocityY) >= FLING_VELOCITY) return velocityY < 0;
  return height >= (collapsedHeight + expandedHeight) / 2;
}

/** The panel's distance from the screen's bottom: above the keyboard when it is up. */
export function panelBottom(
  keyboardHeight: number,
  bottomOffset: number
): number {
  'worklet';
  return keyboardHeight > 0
    ? Math.max(bottomOffset, keyboardHeight + KEYBOARD_GAP)
    : bottomOffset;
}

/**
 * The tallest the panel may be with its bottom at `bottom` (above the keyboard,
 * when one is up): it leaves the drawing `keep` points under the header, so a
 * raised panel never covers more of it than the expanded one. The caller never
 * lets this take the panel below its collapsed height.
 */
export function panelRoom(
  windowHeight: number,
  topLimit: number,
  bottom: number,
  keep: number
): number {
  'worklet';
  return Math.max(0, windowHeight - topLimit - bottom - keep);
}

/**
 * The panel's hard ceiling: never above the header and its pinned readout, even
 * with the keyboard up and the collapsed block taller than what is left (the
 * block then clips a little at the bottom instead of covering the readout).
 */
export function panelCeiling(
  windowHeight: number,
  topLimit: number,
  bottom: number
): number {
  'worklet';
  // No `MIN_ROOM` floor: the panel must stay below the readout even when the
  // keyboard leaves little room. Only never negative or smaller than the strip.
  const room = windowHeight - topLimit - bottom;
  return Math.max(STRIP_HEIGHT, Number.isFinite(room) ? room : 0);
}

/** What the drawing keeps in view while the panel is up: `max(240, 45%)` of the room, or the screen's own floor. */
export function drawingKeep(available: number, minDrawing?: number): number {
  // A screen whose drawing is a schematic and whose inputs are the work (Resize)
  // asks for a fixed, smaller floor instead of `max(240, 45%)`.
  if (minDrawing !== undefined) return minDrawing;
  return Math.max(DRAWING_MIN_VISIBLE, available * DRAWING_MIN_SHARE);
}

/** Space kept above a field that is scrolled into view inside the panel. */
export const FIELD_MARGIN = 16;

/**
 * Where the panel's scroll view should go so a focused field is fully in
 * view, or null when it already is. Offsets are in the content's own
 * coordinates; a field taller than the view is aligned to its top.
 */
export function fieldScrollTarget(input: {
  fieldY: number;
  fieldHeight: number;
  scrollY: number;
  viewportHeight: number;
}): number | null {
  const { fieldY, fieldHeight, scrollY, viewportHeight } = input;
  if (!(viewportHeight > 0)) return null;
  const top = fieldY - FIELD_MARGIN;
  const bottom = fieldY + fieldHeight + FIELD_MARGIN;
  if (top >= scrollY && bottom <= scrollY + viewportHeight) return null;
  if (top < scrollY || fieldHeight + 2 * FIELD_MARGIN >= viewportHeight) {
    return Math.max(0, top);
  }
  return bottom - viewportHeight;
}
