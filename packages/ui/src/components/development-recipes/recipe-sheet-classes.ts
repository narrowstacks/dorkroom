/** The X close button's 44px target and focus ring. */
export const SHEET_CLOSE_BUTTON =
  'flex size-11 items-center justify-center p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] hoverable-icon-btn';

/**
 * Lets a sheet pin its input and scroll its own list. The bottom padding moves
 * into the list, or the last row would stop short of the sheet's edge.
 */
export const SHEET_DRAWER_BODY =
  'flex min-h-0 flex-col overflow-hidden pb-0 pt-3';

/** The list fills what is left of the drawer, clear of a phone's home indicator. */
export const SHEET_LIST =
  'min-h-0 flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]';
