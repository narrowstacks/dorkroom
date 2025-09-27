/**
 * Device detection utilities for determining mobile vs desktop context
 */

/**
 * Detects if the current device is likely a mobile device
 * Uses a combination of user agent detection, touch capability, and screen size
 */
export const isMobileDevice = (): boolean => {
  if (
    typeof window === 'undefined' ||
    typeof window.navigator === 'undefined'
  ) {
    return false;
  }

  const { navigator } = window;

  // Check for touch capability
  const hasTouchscreen =
    'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;

  // Check user agent for mobile patterns
  const userAgent = navigator.userAgent ?? '';
  const mobileUserAgent =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );

  // Check screen size (mobile-like dimensions)
  const smallScreen = window.innerWidth <= 768 || window.innerHeight <= 768;

  // Consider it mobile if it has touch AND (mobile user agent OR small screen)
  return hasTouchscreen && (mobileUserAgent || smallScreen);
};

/**
 * Detects if the device is specifically an iOS device
 */
export const isIOS = (): boolean => {
  if (
    typeof window === 'undefined' ||
    typeof window.navigator === 'undefined'
  ) {
    return false;
  }

  const userAgent = window.navigator.userAgent ?? '';
  return /iPad|iPhone|iPod/.test(userAgent);
};

/**
 * Detects if the device is specifically an Android device
 */
export const isAndroid = (): boolean => {
  if (
    typeof window === 'undefined' ||
    typeof window.navigator === 'undefined'
  ) {
    return false;
  }

  const userAgent = window.navigator.userAgent ?? '';
  return /Android/.test(userAgent);
};

/**
 * Determines if the Web Share API is available and should be used
 * Returns true for mobile devices with Web Share API support
 */
export const shouldUseWebShare = (): boolean => {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function'
  ) {
    return false;
  }

  // Only use Web Share API on mobile devices
  return isMobileDevice();
};
