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
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
