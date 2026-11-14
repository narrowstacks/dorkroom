/** What was true when the Search tab was tapped, read before the tap is handled. */
export interface SearchTabPress {
  /** The Search tab was already the selected tab (a re-tap, not a switch). */
  tabWasSelected: boolean;
  /** Home was the screen showing in the Search tab, nothing pushed over it. */
  homeShowing: boolean;
  /** Home was scrolled to its top (see `isAtTop`). */
  atTop: boolean;
  /** Home's search field already had focus. */
  fieldFocused: boolean;
}

export type SearchTabPressAction = 'focus-field' | 'none';

/**
 * What a tap on the Search tab does on top of the system's own handling (pop
 * to Home, or scroll Home to the top). Only a re-tap while Home shows at its
 * top focuses the field: a switch from another tab only switches, so the
 * second tap of a double tap is the one that brings the keyboard up; a re-tap
 * over Settings only pops back to Home; and a re-tap on a scrolled Home only
 * scrolls to the top, since the keyboard rising mid-scroll re-applies the
 * scroll offset and can stop the scroll part-way. A field that has focus
 * keeps it.
 */
export function searchTabPressAction({
  tabWasSelected,
  homeShowing,
  atTop,
  fieldFocused,
}: SearchTabPress): SearchTabPressAction {
  if (!tabWasSelected || !homeShowing || !atTop || fieldFocused) return 'none';
  return 'focus-field';
}

/** Points past the resting offset that still count as the top. */
const AT_TOP_SLACK = 4;

/**
 * Whether a scroll view with automatic content insets is at its top. At rest
 * its offset is minus the adjusted top inset (the status bar on Home, which
 * has no header), so the top is measured from there, not from 0: an offset
 * of 0 has the first rows under the status bar.
 */
export function isAtTop(offsetY: number, adjustedTopInset: number): boolean {
  return offsetY <= -adjustedTopInset + AT_TOP_SLACK;
}
