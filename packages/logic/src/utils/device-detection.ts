/**
 * Device detection utilities for determining mobile vs desktop context
 */

/**
 * Detects if the current device is likely a mobile device.
 * Uses a combination of user agent detection, touch capability, and screen size
 * to provide reliable mobile detection across different devices and browsers.
 *
 * @returns True if the device appears to be mobile, false otherwise
 *
 * @example
 * ```typescript
 * if (isMobileDevice()) {
 *   // Show mobile-optimized UI
 *   showMobileInterface();
 * } else {
 *   // Show desktop interface
 *   showDesktopInterface();
 * }
 * ```
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
 * Detects if the device is specifically an iOS device (iPhone, iPad, or iPod).
 *
 * @returns True if the device is running iOS, false otherwise
 *
 * @example
 * ```typescript
 * if (isIOS()) {
 *   // Apply iOS-specific styling or behavior
 *   document.body.classList.add('ios-device');
 * }
 * ```
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
 * Detects if the device is specifically an Android device.
 *
 * @returns True if the device is running Android, false otherwise
 *
 * @example
 * ```typescript
 * if (isAndroid()) {
 *   // Apply Android-specific behavior
 *   setupAndroidSpecificFeatures();
 * }
 * ```
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
 * Determines if the Web Share API is available and should be used.
 * Returns true for mobile devices with Web Share API support, combining
 * API availability with mobile device detection for optimal UX.
 *
 * @returns True if Web Share API should be used, false otherwise
 *
 * @example
 * ```typescript
 * if (shouldUseWebShare()) {
 *   // Use native sharing
 *   navigator.share({ title: 'Check this out!', url: shareUrl });
 * } else {
 *   // Show custom share menu
 *   showCustomShareMenu();
 * }
 * ```
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
