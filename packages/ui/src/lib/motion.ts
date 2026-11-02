import { hasGlobal } from './dom';

/** Attribute the legacy loader (`legacyGateScript` in
 *  apps/dorkroom/legacy-css.ts) sets on `<html>` for browsers that get the
 *  Chromium 80 fallback stylesheet: Kindle's e-ink browser and any other
 *  browser without cascade layers. Keep the
 *  two spellings in sync; a test in scripts/__tests__ compares them. */
export const LEGACY_BROWSER_ATTR = 'data-lc-legacy';

/** Whether the page runs in a browser that got the legacy stylesheet: any
 *  without cascade layers (Kindle's Chromium 80, Chrome before 99, Firefox
 *  before 97, Safari before 15.4). Motion is turned off there, mainly for
 *  e-ink, where it ghosts and slows full-screen refreshes. False during
 *  prerender and in every browser that gets the modern CSS. */
export function isLegacyBrowser(): boolean {
  return (
    hasGlobal('document') &&
    document.documentElement.hasAttribute(LEGACY_BROWSER_ATTR)
  );
}

/** `behavior` for `scrollTo` and `scrollIntoView`: smooth, except instant in a
 *  legacy browser. */
export function scrollBehavior(): ScrollBehavior {
  return isLegacyBrowser() ? 'auto' : 'smooth';
}
