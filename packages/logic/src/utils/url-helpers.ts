/**
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
 * Get the base URL for the current environment
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
 * Generate a dynamic share URL for the border calculator
 */
export function getDynamicShareUrl(
  path: string = URL_CONFIG.BORDER_CALCULATOR_PATH
): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
}

/**
 * Generate a native app URL for deep linking
 */
export function getNativeUrl(encoded: string): string {
  return `${URL_CONFIG.NATIVE_SCHEME}://preset/${encoded}`;
}

/**
 * Generate both web and native sharing URLs for a preset
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
 * Extract encoded preset from current URL hash
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
 * Update the URL hash with an encoded preset (without page reload)
 */
export function updateUrlWithPreset(encoded: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const newUrl = `${window.location.pathname}${window.location.search}#${encoded}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Clear the preset from the URL hash
 */
export function clearPresetFromUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const newUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Check if the current environment supports the Web Share API
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Check if the current environment supports clipboard API
 */
export function isClipboardSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'clipboard' in navigator &&
    'writeText' in navigator.clipboard
  );
}

/**
 * Get a user-friendly URL for display purposes (removes protocol)
 */
export function getDisplayUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.host + urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    return url;
  }
}
