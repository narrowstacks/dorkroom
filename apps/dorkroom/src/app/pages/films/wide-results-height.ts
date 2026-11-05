/**
 * One height for the list and the page beside it, fitting the viewport under
 * the toolbar: one line on desktop, two on tablet.
 */
export const wideResultsHeight = (isDesktop: boolean) =>
  isDesktop ? 'calc(100dvh - 336px)' : 'calc(100dvh - 380px)';
