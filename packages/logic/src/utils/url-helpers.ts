import { isBrowser } from './environment';

/**
 * Extracts encoded preset from the current URL.
 * Checks `?preset=` query param first, falls back to URL hash for backwards compatibility.
 *
 * @public
 * @returns Encoded preset string, or null if not found
 * @example
 * ```typescript
 * // URL: https://example.com/border?preset=preset123abc
 * const preset = getPresetFromUrl();
 * console.log(preset); // 'preset123abc'
 *
 * // URL: https://example.com/border
 * const noPreset = getPresetFromUrl();
 * console.log(noPreset); // null
 * ```
 */
export function getPresetFromUrl(): string | null {
  if (!isBrowser()) {
    return null;
  }

  // Prefer query param, fall back to hash for backwards compatibility
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get('preset');
  if (fromParam) {
    return fromParam;
  }

  const hash = window.location.hash;
  if (hash?.startsWith('#')) {
    return hash.substring(1);
  }

  return null;
}

/**
 * Updates the URL with an encoded preset as a query param without triggering page reload.
 * Uses history.replaceState to maintain browser navigation without refresh.
 *
 * @public
 * @param encoded - Encoded preset string to add to URL query params
 * @returns void
 * @example
 * ```typescript
 * updateUrlWithPreset('preset123abc');
 * // URL changes to: https://example.com/border?preset=preset123abc
 * ```
 */
export function updateUrlWithPreset(encoded: string): void {
  if (!isBrowser()) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.set('preset', encoded);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Clears the preset query param from the URL without page reload.
 * Removes `preset` param while preserving path and other query parameters.
 *
 * @public
 * @returns void
 * @example
 * ```typescript
 * // URL: https://example.com/border?preset=abc123&other=1
 * clearPresetFromUrl();
 * // URL becomes: https://example.com/border?other=1
 * ```
 */
export function clearPresetFromUrl(): void {
  if (!isBrowser()) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.delete('preset');
  const qs = params.toString();
  const newUrl = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Checks whether a value points at filmdev.org (or a subdomain of it).
 *
 * Parses the value as a URL and compares the host, rather than using a
 * substring match like `value.includes('filmdev.org')` — a substring check
 * would wrongly accept `evil.com/filmdev.org` or `filmdev.org.attacker.com`.
 * Accepts protocol-less input (e.g. `filmdev.org/12345`) by assuming https.
 *
 * @public
 * @param value - URL or host-like string to test
 * @returns True if the host is `filmdev.org` or `*.filmdev.org`
 * @example
 * ```typescript
 * isFilmDevOrgUrl('https://www.filmdev.org/recipe/123'); // true
 * isFilmDevOrgUrl('filmdev.org/12345');                  // true
 * isFilmDevOrgUrl('https://evil.com/filmdev.org');       // false
 * ```
 */
export function isFilmDevOrgUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  try {
    const { hostname } = new URL(
      trimmed.includes('://') ? trimmed : `https://${trimmed}`
    );
    return hostname === 'filmdev.org' || hostname.endsWith('.filmdev.org');
  } catch {
    return false;
  }
}
