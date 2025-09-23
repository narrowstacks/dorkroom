import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Utility functions for detecting and interacting with the native app from mobile web
 */

export const isRunningOnMobileWeb = (): boolean => {
  return Platform.OS === 'web' && isMobileDevice();
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  );
};

/**
 * Checks if the native Dorkroom app is available on the device
 */
export const checkNativeAppAvailability = async (): Promise<boolean> => {
  if (!isRunningOnMobileWeb()) return false;

  try {
    // In development, we might be using Expo Go
    if (typeof window !== 'undefined') {
      // Check for Expo Go first (common in development)
      const canOpenExpo = await Linking.canOpenURL('exp://');
      if (canOpenExpo) return true;
    }

    // Check if we can open the dorkroom:// scheme (production)
    const canOpen = await Linking.canOpenURL('dorkroom://');
    return canOpen;
  } catch (error) {
    console.warn('Failed to check app availability:', error);
    return false;
  }
};

/**
 * Attempts to open the native app with the provided URI
 */
export const openInNativeApp = async (uri: string): Promise<boolean> => {
  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to open native app:', error);
    return false;
  }
};

/**
 * Creates a banner message for app detection
 */
export const createAppDetectionMessage = (
  hasSharedContent: boolean = false
): string => {
  if (hasSharedContent) {
    return 'Open this in the Dorkroom app for the best experience!';
  }
  return 'Get the Dorkroom app for a better mobile experience!';
};

/**
 * Generates app store URLs for download prompts
 */
export const getAppStoreUrls = () => {
  return {
    ios: 'https://apps.apple.com/app/dorkroom', // Replace with actual App Store URL
    android: 'https://play.google.com/store/apps/details?id=com.dorkroom', // Replace with actual Play Store URL
  };
};

/**
 * Detects the mobile platform for app store redirects
 */
export const getMobilePlatform = (): 'ios' | 'android' | 'unknown' => {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios';
  } else if (/Android/.test(userAgent)) {
    return 'android';
  }

  return 'unknown';
};
