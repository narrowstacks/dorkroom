/**
 * The phone's floating buttons, bottom right: the menu toggle at the edge
 * and the nav search beside it. Their size, offsets and gap live here only,
 * so the two cannot drift into each other. `__root.tsx` reserves bottom
 * padding for this size and bottom offset: change both together.
 */
export const MOBILE_FAB =
  'fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] flex size-12 items-center justify-center rounded-full shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] sm:hidden';

/** The first spot, at the screen edge (the menu toggle). */
export const MOBILE_FAB_EDGE = 'right-[calc(env(safe-area-inset-right)+1rem)]';

/** The second spot: one button (3rem) and a 0.75rem gap in from the first. */
export const MOBILE_FAB_SECOND =
  'right-[calc(env(safe-area-inset-right)+4.75rem)]';
