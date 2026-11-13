/**
 * The pure maths of `DetentSheet`: how tall the sheet is at each detent, what a
 * release does, and how the sheet rides above the keyboard. The `.tsx` only
 * renders what these return; the worklet pieces run on the UI thread inside the
 * sheet's pan. The release snap is shared with the stage panel
 * (`snapsToExpanded`).
 */
import {
  FLING_VELOCITY,
  snapsToExpanded,
} from '@/components/stage/stage-layout';

/** The grab strip's height when the sheet resizes. It is also a drag handle. */
export const GRAB_STRIP_HEIGHT = 24;
/** The strip's height with one detent: no grabber, just room above the header. */
export const PLAIN_STRIP_HEIGHT = 12;
/** The header row: Cancel, title, commit. Also the minimum target height. */
export const HEADER_HEIGHT = 44;
/** The medium detent never grows past this share of the window. */
export const MEDIUM_MAX_SHARE = 0.55;
/** Space kept between the sheet's top and the safe area's top. */
export const TOP_GAP = 24;
/** Dragging the sheet this far below its medium height dismisses it. */
export const DISMISS_DRAG = 80;
/** Space under the medium block, before the footer. */
export const CONTENT_BOTTOM_PAD = 12;
/** Space between the medium block and the extra content shown at large. */
export const EXPANDED_GAP = 16;
/** The panel's bottom padding while the keyboard is up. */
export const KEYBOARD_BOTTOM_PADDING = 16;
/** The scrim's alpha at the medium detent (the page behind stays readable). */
export const SCRIM_MEDIUM = 0.2;
/** The scrim's alpha at the large detent. */
export const SCRIM_LARGE = 0.6;

const finite = (n: number) => (Number.isFinite(n) ? n : 0);

/** The panel's padding under its content: above the home indicator, or a plain
 * 16 while the keyboard covers it. */
export function bottomPaddingFor(
  insetBottom: number,
  keyboardHeight: number
): number {
  'worklet';
  return keyboardHeight > 0 ? KEYBOARD_BOTTOM_PADDING : insetBottom + 16;
}

export interface SheetHeights {
  /** The resting height at the medium detent. */
  medium: number;
  /** The resting height at the large detent (equal to `medium` with one detent). */
  large: number;
  /** The fixed part of the panel at rest: strip, header, footer, bottom padding. */
  chrome: number;
  /** The same without the bottom padding, which depends on the keyboard. */
  fixedTop: number;
}

/**
 * The two detent heights. Medium is the chrome plus the measured medium block,
 * capped at `MEDIUM_MAX_SHARE` of the window (a taller block scrolls). Large
 * adds the extra content, capped under the top safe area. With no extra
 * content, or no more room than medium has, large equals medium.
 */
export function sheetHeights(input: {
  windowHeight: number;
  topInset: number;
  stripHeight: number;
  /** The medium block, measured. */
  childrenHeight: number;
  /** The extra block shown at large, measured; ignored without `hasExpanded`. */
  expandedHeight: number;
  hasExpanded: boolean;
  /** The pinned footer, measured, padding included; 0 without one. */
  footerHeight: number;
  /** The bottom safe-area inset: the resting padding is this plus 16. */
  insetBottom: number;
}): SheetHeights {
  const fixedTop = input.stripHeight + HEADER_HEIGHT + input.footerHeight;
  const chrome = fixedTop + bottomPaddingFor(input.insetBottom, 0);
  const mediumContent = input.childrenHeight + CONTENT_BOTTOM_PAD;
  const cap = Math.floor(input.windowHeight * MEDIUM_MAX_SHARE);
  const medium = Math.min(Math.ceil(chrome + mediumContent), cap);
  if (!input.hasExpanded) return { medium, large: medium, chrome, fixedTop };
  const ceiling = Math.max(
    medium,
    Math.floor(input.windowHeight - input.topInset - TOP_GAP)
  );
  const wanted = Math.ceil(
    chrome + mediumContent + EXPANDED_GAP + input.expandedHeight
  );
  return {
    medium,
    large: Math.min(ceiling, Math.max(medium, wanted)),
    chrome,
    fixedTop,
  };
}

/** What a release does to the sheet. */
export type ReleaseOutcome = 'dismiss' | 'medium' | 'large';

/**
 * Where a release settles. Dragged more than `DISMISS_DRAG` under the medium
 * height, or flung down from medium, it dismisses (never within a drag that
 * began at large with the keyboard up). Otherwise it settles on a
 * detent the way the stage panel does: a fling picks the direction, a slower
 * release takes the nearer one.
 */
export function releaseOutcome(input: {
  /** The height at release: below `mediumHeight` while pulling down to dismiss. */
  height: number;
  /** Where the drag began. */
  startHeight: number;
  /** The finger's vertical velocity: positive is down. */
  velocityY: number;
  mediumHeight: number;
  largeHeight: number;
  /**
   * The drag began at large with the keyboard up (`beganAtLargeWithKeyboard`):
   * it never dismisses.
   */
  guardDismiss?: boolean;
}): ReleaseOutcome {
  'worklet';
  const { height, startHeight, velocityY, mediumHeight, largeHeight } = input;
  // With the keyboard up the sheet is drawn shorter than large, so the same
  // finger travel lands lower. A drag that began at large then never dismisses:
  // it settles at medium (which also drops the keyboard) or back at large.
  const guarded = input.guardDismiss === true;
  if (!guarded && height < mediumHeight - DISMISS_DRAG) return 'dismiss';
  const flungDown = velocityY >= FLING_VELOCITY;
  if (!guarded && flungDown && startHeight <= mediumHeight + 1) {
    return 'dismiss';
  }
  return snapsToExpanded({
    height,
    velocityY,
    collapsedHeight: mediumHeight,
    expandedHeight: largeHeight,
  })
    ? 'large'
    : 'medium';
}

/**
 * The height a drag asks for: the finger's travel from where it began, never
 * above the large detent and never below nothing. Below the medium height the
 * sheet slides down instead of shrinking (`panelPlacement`).
 */
export function draggedHeight(
  startHeight: number,
  translationY: number,
  largeHeight: number
): number {
  'worklet';
  return Math.max(0, Math.min(largeHeight, startHeight - translationY));
}

/** The tallest the panel may be with the keyboard up: under the top safe area. */
export function keyboardCeiling(
  windowHeight: number,
  topInset: number,
  keyboardHeight: number
): number {
  'worklet';
  return Math.max(0, windowHeight - topInset - TOP_GAP - keyboardHeight);
}

/**
 * How the one shared height becomes a frame. At or above medium it is the
 * panel's height; below medium (the dismiss drag) the panel keeps its medium
 * height and slides down by the difference. The height never passes the keyboard
 * ceiling, so a raised panel never reaches the top safe area.
 */
export function panelPlacement(input: {
  height: number;
  mediumHeight: number;
  ceiling: number;
}) {
  'worklet';
  const { height, mediumHeight, ceiling } = input;
  return {
    height: Math.min(Math.max(height, mediumHeight), ceiling),
    slide: Math.max(0, mediumHeight - height),
  };
}

/** The scrim's alpha for a height: `SCRIM_MEDIUM` at medium up to `SCRIM_LARGE` at large. */
export function scrimAlpha(
  height: number,
  mediumHeight: number,
  largeHeight: number
): number {
  'worklet';
  if (largeHeight <= mediumHeight) return SCRIM_MEDIUM;
  const t = Math.min(
    1,
    Math.max(0, (height - mediumHeight) / (largeHeight - mediumHeight))
  );
  return SCRIM_MEDIUM + t * (SCRIM_LARGE - SCRIM_MEDIUM);
}

/**
 * Whether a drag began at large with the keyboard up, from the RAW held height:
 * the drawn start height is clamped under the keyboard ceiling and can equal
 * medium on a short screen even though the sheet was held at large.
 */
export function beganAtLargeWithKeyboard(input: {
  keyboardHeight: number;
  heldHeight: number;
  mediumHeight: number;
}): boolean {
  'worklet';
  return input.keyboardHeight > 0 && input.heldHeight > input.mediumHeight + 1;
}

/**
 * The height a drag starts from: what is drawn, not what is held. With the
 * keyboard up the held `large` can exceed the capped panel, and a drag counted
 * from it would sit in a dead zone until the finger had travelled the
 * difference. Below medium (a dismiss drag under way) the height is as held.
 */
export function dragStartHeight(input: {
  height: number;
  mediumHeight: number;
  ceiling: number;
}): number {
  'worklet';
  const { height, mediumHeight, ceiling } = input;
  if (height < mediumHeight) return height;
  return Math.min(height, Math.max(ceiling, mediumHeight));
}

/**
 * Whether a new expand signal moves the sheet: only when it can resize and is
 * not already at large. With one detent, or at large, the signal is a no-op.
 */
export function shouldExpandOnSignal(input: {
  canResize: boolean;
  expanded: boolean;
}): boolean {
  return input.canResize && !input.expanded;
}

/**
 * What to do when an expand signal could not move the sheet. A closing sheet
 * does nothing, and so does one with a spring running (the spring reports its
 * own arrival); a settled sheet reports where it rests.
 */
export function unmovedAction(input: {
  closing: boolean;
  moving: boolean;
}): 'ignore' | 'report' {
  return input.closing || input.moving ? 'ignore' : 'report';
}

/**
 * How tall the scroll area is for a keyboard of the given height, from the same
 * numbers the panel's animation uses: the resting height, capped under the top
 * safe area, less the fixed chrome and the keyboard-aware bottom padding.
 */
export function scrollViewportHeight(input: {
  restHeight: number;
  windowHeight: number;
  topInset: number;
  keyboardHeight: number;
  insetBottom: number;
  fixedTop: number;
}): number {
  return Math.max(
    0,
    Math.min(
      finite(input.restHeight),
      keyboardCeiling(input.windowHeight, input.topInset, input.keyboardHeight)
    ) -
      input.fixedTop -
      bottomPaddingFor(input.insetBottom, input.keyboardHeight)
  );
}
