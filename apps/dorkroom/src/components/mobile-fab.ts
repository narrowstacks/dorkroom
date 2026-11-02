/**
 * The floating buttons below lg (1024px), bottom right: the menu toggle at
 * the edge and the nav search beside it. Their size, offsets and gap live here only,
 * so the two cannot drift into each other. `__root.tsx` reserves bottom
 * padding for this size and bottom offset, and MOBILE_FAB_BAR below matches
 * it: change all three together.
 */
export const MOBILE_FAB =
  'fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] flex size-12 items-center justify-center rounded-full shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] lg:hidden';

/** The first spot, at the screen edge (the menu toggle). */
export const MOBILE_FAB_EDGE = 'right-[calc(env(safe-area-inset-right)+1rem)]';

/** The second spot: one button (3rem) and a 0.75rem gap in from the first. */
export const MOBILE_FAB_SECOND =
  'right-[calc(env(safe-area-inset-right)+4.75rem)]';

/**
 * The bar the buttons sit in, as tall as the padding `<main>` reserves (1rem
 * + 3rem + 1rem). Floating over the page, the buttons covered whatever
 * scrolled under them, such as recipe times and match counts (#552); the bar
 * takes that strip out of the reading area instead. Translucent and blurred
 * like the lg+ header. z-30 keeps it under the buttons, the drawer's backdrop
 * and every modal.
 */
export const MOBILE_FAB_BAR =
  'fixed inset-x-0 bottom-0 z-30 h-[calc(env(safe-area-inset-bottom)+5rem)] border-t backdrop-blur lg:hidden';
