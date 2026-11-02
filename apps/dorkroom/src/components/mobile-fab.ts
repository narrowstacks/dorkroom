/**
 * The floating buttons below lg (1024px), bottom right: the menu toggle at
 * the edge and the nav search beside it. Their size, offsets and gap live here only,
 * so the two cannot drift into each other. `__root.tsx` reserves bottom
 * padding for this size and bottom offset: change both together.
 *
 * They turn invisible (and untappable) while a SearchableSelect list is open
 * (`data-listbox-open` on <html>): the list is not portalled, so its lowest
 * rows would otherwise sit under them (#629).
 */
export const MOBILE_FAB =
  'fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] flex size-12 items-center justify-center rounded-full shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] lg:hidden [html[data-listbox-open]_&]:invisible';

/** The first spot, at the screen edge (the menu toggle). */
export const MOBILE_FAB_EDGE = 'right-[calc(env(safe-area-inset-right)+1rem)]';

/** The second spot: one button (3rem) and a 0.75rem gap in from the first. */
export const MOBILE_FAB_SECOND =
  'right-[calc(env(safe-area-inset-right)+4.75rem)]';
