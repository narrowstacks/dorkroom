import { hasGlobal } from './dom';

/** Attribute the legacy-stylesheet loader (`legacyCssLoader` in
 *  apps/dorkroom/legacy-css.ts) sets on `<html>` for browsers that get the
 *  Chromium 80 fallback stylesheet, which is Kindle's e-ink browser. Keep the
 *  two spellings in sync; a test in scripts/__tests__ compares them. */
export const LEGACY_BROWSER_ATTR = 'data-lc-legacy';

/** Whether the page runs in a legacy (e-ink) browser, where motion ghosts and
 *  slows full-screen refreshes, so nothing should animate or scroll smoothly.
 *  False during prerender and in every browser that gets the modern CSS. */
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
