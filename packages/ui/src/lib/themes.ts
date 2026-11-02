import { hasGlobal } from './dom';

export type Theme = 'light' | 'dark' | 'darkroom' | 'high-contrast' | 'system';

/**
 * Collapse `system` to the concrete theme to apply. The palettes themselves
 * live in `apps/dorkroom/src/styles/theme.css`, one `[data-theme]` block each.
 */
export function resolveTheme(
  theme: Theme
): 'light' | 'dark' | 'darkroom' | 'high-contrast' {
  if (theme !== 'system') {
    return theme;
  }
  if (!hasGlobal('window')) {
    return 'dark';
  }
  if (isEInkDevice()) {
    return 'high-contrast';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Best-effort e-ink detection. On an e-ink device the theme is locked to high
 * contrast (nothing is persisted), and `system` resolves to it. Two signals,
 * since neither covers every reader:
 * - the standard `monochrome` media feature, false on color screens and in
 *   engines that don't know it (an unknown query never matches);
 * - `Kindle/` (the old Kindle browser) or `Kindle Build/` (Silk, Chromium 80,
 *   on the Kindle Scribe, which likely reports a color screen) in the user
 *   agent, but only on the legacy path, where the browser lacks
 *   `CSSLayerBlockRule`. Fire tablets also run Silk, but have color LCDs: their
 *   agent says `Kindle Fire Build/` or has no `Kindle` at all, and they are
 *   never monochrome.
 *
 * Web only: the iOS app has neither a `window` nor a user agent like these.
 */
export function isEInkDevice(): boolean {
  if (!hasGlobal('window')) {
    return false;
  }
  if (hasGlobal('matchMedia') && window.matchMedia('(monochrome)').matches) {
    return true;
  }
  return (
    hasGlobal('navigator') &&
    /\bKindle(\/|\sBuild\/)/.test(navigator.userAgent) &&
    !('CSSLayerBlockRule' in window)
  );
}
