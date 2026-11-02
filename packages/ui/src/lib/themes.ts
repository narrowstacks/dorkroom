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
  if (isEInkDisplay()) {
    return 'high-contrast';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Best-effort e-ink detection, used only to resolve `system`: a stored
 * explicit theme always wins, and nothing here is persisted. Two signals,
 * since neither covers every reader:
 * - the standard `monochrome` media feature, false on color screens and in
 *   engines that don't know it (an unknown query never matches);
 * - `Kindle` in the user agent, present in both the old Kindle browser's UA
 *   and the Silk (Chromium 80) UA on the Kindle Scribe, which likely reports a
 *   color screen.
 */
function isEInkDisplay(): boolean {
  if (hasGlobal('matchMedia') && window.matchMedia('(monochrome)').matches) {
    return true;
  }
  return hasGlobal('navigator') && /\bKindle\b/.test(navigator.userAgent);
}
