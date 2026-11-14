// Pure height maths for a form inside a `BottomSheet` whose body scrolls
// (the camera and lens forms, #733). Tested in `form-sheet-layout.test.ts`.

import { sheetHeaderHeight } from '@/components/bottom-sheet-layout';
/** Room kept above the sheet so its title never goes under the status bar. */
export const SHEET_TOP_GAP = 24;
/** The body never takes more than this share of the window, so the page
 * behind stays in view. */
export const MAX_BODY_SHARE = 0.6;
/** The body never gets shorter than this, so a field and a half show. */
export const MIN_BODY_HEIGHT = 120;

/** From this text size the camera form's "Interchangeable lenses" / "Fixed
 * lens" choice stacks its two segments, which no longer fit side by side. */
export const LENS_KIND_STACK_FONT_SCALE = 1.3;

export function stacksLensKind(fontScale: number): boolean {
  return fontScale >= LENS_KIND_STACK_FONT_SCALE;
}

/**
 * The scrolling body's maximum height: what is left of the window once the
 * keyboard (the sheet rides on it), the safe areas, the sheet's header, the
 * pinned footer (the commit) and the sheet's bottom padding are taken out,
 * capped at 60% of the window.
 */
export function formBodyMaxHeight(input: {
  windowHeight: number;
  keyboardHeight: number;
  topInset: number;
  bottomInset: number;
  footerHeight: number;
  fontScale: number;
}): number {
  const free =
    input.windowHeight -
    input.keyboardHeight -
    input.topInset -
    SHEET_TOP_GAP -
    sheetHeaderHeight(input.fontScale) -
    input.footerHeight -
    // BottomSheet pads its panel by the bottom inset plus 16.
    (input.bottomInset + 16);
  return Math.max(
    MIN_BODY_HEIGHT,
    Math.min(input.windowHeight * MAX_BODY_SHARE, free)
  );
}
