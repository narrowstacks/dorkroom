/*
 * URL configuration for different environments
 */
const URL_CONFIG = {
  // Base URLs for different environments
  PRODUCTION_WEB: 'https://beta.dorkroom.art',
  DEVELOPMENT_WEB: 'http://localhost:4200',

  // Native app URL schemes
  NATIVE_SCHEME: 'dorkroom',

  // Paths
  BORDER_CALCULATOR_PATH: '/border',
};

/**
 * Gets the base URL for the current environment.
 * Automatically detects development vs production and constructs appropriate URL.
 *
 * @returns Base URL string for the current environment
 * @example
 * ```typescript
 * const baseUrl = getBaseUrl();
 * // Development: 'http://localhost:4200'
 * // Production: 'https://beta.dorkroom.art'
 * ```
 */
function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering - default to production
    return URL_CONFIG.PRODUCTION_WEB;
  }

  const { hostname, port, protocol } = window.location;

  // Development environment detection
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }

  // Production or staging
  return `${protocol}//${hostname}`;
}

/**
 * Generates a dynamic share URL for the border calculator.
 * Uses current environment's base URL for context-appropriate sharing.
 *
 * @param path - Path to append to base URL, defaults to border calculator path
 * @returns Complete shareable URL for the specified path
 * @example
 * ```typescript
 * const url = getDynamicShareUrl();
 * console.log(url); // 'https://beta.dorkroom.art/border'
 *
 * const customUrl = getDynamicShareUrl('/custom-path');
 * console.log(customUrl); // 'https://beta.dorkroom.art/custom-path'
 * ```
 */
export function getDynamicShareUrl(
  path: string = URL_CONFIG.BORDER_CALCULATOR_PATH
): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
}

/**
 * Generates a native app URL for deep linking to presets.
 * Creates URL using custom scheme for opening in native mobile app.
 *
 * @param encoded - Encoded preset string
 * @returns Native app deep link URL
 * @example
 * ```typescript
 * const nativeUrl = getNativeUrl('preset123abc');
 * console.log(nativeUrl); // 'dorkroom://preset/preset123abc'
 * ```
 */
export function getNativeUrl(encoded: string): string {
  return `${URL_CONFIG.NATIVE_SCHEME}://preset/${encoded}`;
}

/**
 * Generates both web and native sharing URLs for a preset.
 * Provides complete sharing solution for cross-platform compatibility.
 *
 * @param encoded - Encoded preset string
 * @returns Object containing both web and native URLs
 * @example
 * ```typescript
 * const urls = generateSharingUrls('preset123abc');
 * console.log(urls.webUrl); // 'https://beta.dorkroom.art/border#preset123abc'
 * console.log(urls.nativeUrl); // 'dorkroom://preset/preset123abc'
 * ```
 */
export function generateSharingUrls(encoded: string): {
  webUrl: string;
  nativeUrl: string;
} {
  const webUrl = `${getDynamicShareUrl()}#${encoded}`;
  const nativeUrl = getNativeUrl(encoded);

  return {
    webUrl,
    nativeUrl,
  };
}

/**
 * Extracts encoded preset from current URL hash.
 * Safely handles SSR environments and invalid hash formats.
 *
 * @returns Encoded preset string from URL hash, or null if not found
 * @example
 * ```typescript
 * // URL: https://example.com/border#preset123abc
 * const preset = getPresetFromUrl();
 * console.log(preset); // 'preset123abc'
 *
 * // URL: https://example.com/border
 * const noPreset = getPresetFromUrl();
 * console.log(noPreset); // null
 * ```
 */
export function getPresetFromUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#')) {
    return null;
  }

  return hash.substring(1); // Remove the '#' prefix
}

/**
 * Updates the URL hash with an encoded preset without triggering page reload.
 * Uses history.replaceState to maintain browser navigation without refresh.
 *
 * @param encoded - Encoded preset string to add to URL hash
 * @returns void
 * @example
 * ```typescript
 * updateUrlWithPreset('preset123abc');
 * // URL changes to: https://example.com/border#preset123abc
 * ```
 */
export function updateUrlWithPreset(encoded: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const newUrl = `${window.location.pathname}${window.location.search}#${encoded}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Clears the preset from the URL hash without page reload.
 * Removes hash portion while preserving path and query parameters.
 *
 * @returns void
 * @example
 * ```typescript
 * // URL: https://example.com/border?param=1#preset123abc
 * clearPresetFromUrl();
 * // URL becomes: https://example.com/border?param=1
 * ```
 */
export function clearPresetFromUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const newUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Checks if the current environment supports the Web Share API.
 * Used to determine if native sharing UI is available.
 *
 * @returns True if Web Share API is supported, false otherwise
 * @example
 * ```typescript
 * if (isWebShareSupported()) {
 *   navigator.share({ title: 'My Preset', url: shareUrl });
 * } else {
 *   // Fall back to copy to clipboard
 * }
 * ```
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Checks if the current environment supports the Clipboard API.
 * Used to determine if copy-to-clipboard functionality is available.
 *
 * @returns True if Clipboard API is supported, false otherwise
 * @example
 * ```typescript
 * if (isClipboardSupported()) {
 *   navigator.clipboard.writeText(shareUrl);
 * } else {
 *   // Show manual copy instructions
 * }
 * ```
 */
export function isClipboardSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'clipboard' in navigator &&
    'writeText' in navigator.clipboard
  );
}

/**
 * Gets a user-friendly URL for display purposes by removing the protocol.
 * Creates cleaner URLs for UI display while preserving path and hash.
 *
 * @param url - Full URL to make display-friendly
 * @returns URL without protocol, or original string if parsing fails
 * @example
 * ```typescript
 * const displayUrl = getDisplayUrl('https://beta.dorkroom.art/border#preset123');
 * console.log(displayUrl); // 'beta.dorkroom.art/border#preset123'
 *
 * const invalid = getDisplayUrl('not-a-url');
 * console.log(invalid); // 'not-a-url'
 * ```
 */
export function getDisplayUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.host + urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    return url;
  }
}
