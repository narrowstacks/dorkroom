// Pure sizes of `BottomSheet`'s chrome, shared with forms that fit a scrolling
// body under it (`film-log/form-sheet-layout.ts`).
import { CHROME_MAX_FONT_SCALE } from '@/theme/tokens';

/** The sheet's title and dismiss action stop growing with Dynamic Type at the
 * app's chrome cap, like the detent sheet's header and a navigation bar. */
export const SHEET_TITLE_MAX_FONT_SCALE = CHROME_MAX_FONT_SCALE;

/** The title's font size; it has no fixed line height, so a line is about
 * 1.2 times this (the system font's natural line height). */
const TITLE_FONT_SIZE = 18;
const NATURAL_LINE_HEIGHT = 1.2;
/** The dismiss button's minimum height (`min-h-11`), which sets the row's. */
const ROW_MIN_HEIGHT = 44;

/** The header's height at a text size: the panel's 16pt top padding, the title
 * row (at least the 44pt dismiss button, or the capped title line if taller)
 * and the 16pt gap under it. */
export function sheetHeaderHeight(fontScale: number): number {
  const scale = Math.min(Math.max(fontScale, 1), SHEET_TITLE_MAX_FONT_SCALE);
  const titleLine = TITLE_FONT_SIZE * NATURAL_LINE_HEIGHT * scale;
  return 16 + Math.max(ROW_MIN_HEIGHT, titleLine) + 16;
}
