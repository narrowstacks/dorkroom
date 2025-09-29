/**
 * Utility functions for dynamic URL construction
 */
import Constants from 'expo-constants';
import { debugLog } from '@/utils/debugLogger';

/**
 * Gets the current domain and constructs the base URL for sharing
 * Works for any deployment (localhost, Vercel, production, etc.)
 * @param path - The path to append to the base URL (e.g., '/border')
 * @returns The full URL for the current domain
 */
export const getDynamicShareUrl = (path: string): string => {
  // For web platforms, we can use window.location
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, host } = window.location;
    return `${protocol}//${host}${path}`;
  }

  // Fallback for development
  return `http://localhost:8081${path}`;
};

/**
 * Generates the appropriate native URL for the current environment
 * @param encoded - The encoded preset data
 * @returns Native URL (Expo Go in dev, custom scheme in production)
 */
export const getNativeUrl = (encoded: string): string => {
  debugLog('🌐 [URL HELPER] Generating native URL for encoded data:', encoded);
  debugLog(
    '🌐 [URL HELPER] Environment - DEV:',
    __DEV__,
    'App ownership:',
    Constants.appOwnership
  );
  debugLog('🌐 [URL HELPER] Constants.expoConfig:', Constants.expoConfig);
  debugLog(
    '🌐 [URL HELPER] window.location available:',
    typeof window !== 'undefined' && !!window.location
  );
  if (typeof window !== 'undefined' && window.location) {
    debugLog('🌐 [URL HELPER] window.location.host:', window.location.host);
  }

  // Check if we're in development mode (more robust detection)
  const isDevelopment =
    __DEV__ &&
    (Constants.appOwnership === 'expo' ||
      Constants.appOwnership === null ||
      Constants.expoConfig?.hostUri);

  debugLog('🌐 [URL HELPER] Development mode detected:', isDevelopment);

  // Check if we're in development and have a hostUri available
  if (isDevelopment) {
    const manifest = Constants.expoConfig;
    debugLog('🌐 [URL HELPER] Expo config manifest:', manifest);

    // Try to get the host from multiple sources
    let hostUri = manifest?.hostUri;

    // If no hostUri in manifest, try to construct it from window.location (for web)
    if (!hostUri && typeof window !== 'undefined' && window.location) {
      // Extract just the host:port from current location for exp:// URL
      hostUri = window.location.host;
      debugLog(
        '🌐 [URL HELPER] Using window.location.host as hostUri:',
        hostUri
      );
    }

    if (hostUri) {
      // Use the border route with a query parameter instead of nested path
      const url = `exp://${hostUri}/--/border?preset=${encoded}`;
      debugLog('🌐 [URL HELPER] Generated Expo Go URL:', url);
      return url;
    } else {
      debugLog(
        '🌐 [URL HELPER] No hostUri available, falling back to production URL'
      );
    }
  }

  // Production or standalone build - use custom scheme
  const url = `dorkroom://border?preset=${encoded}`;
  debugLog('🌐 [URL HELPER] Generated production URL:', url);
  return url;
};

/**
 * Generates a sharing URL for the border calculator with encoded preset data
 * @param encoded - The encoded preset data
 * @returns Object containing web and native URLs
 */
export const generateSharingUrls = (encoded: string) => {
  debugLog('🌐 [URL HELPER] Generating sharing URLs for:', encoded);
  const webUrl = `${getDynamicShareUrl('/border')}#${encoded}`;
  const nativeUrl = getNativeUrl(encoded);

  debugLog(
    '🌐 [URL HELPER] Generated URLs - Web:',
    webUrl,
    'Native:',
    nativeUrl
  );

  return {
    webUrl,
    nativeUrl,
  };
};
