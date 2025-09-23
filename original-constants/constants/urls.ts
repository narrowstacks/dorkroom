/**
 * Application URLs for different environments and sharing functionality
 */

// Base URLs for different environments
export const BASE_URLS = {
  DEVELOPMENT: 'http://localhost:8081',
  PRODUCTION: 'https://beta.dorkroom.art',
} as const;

// Sharing URLs for different calculators
export const SHARING_URLS = {
  BORDER_CALCULATOR: {
    DEVELOPMENT: `${BASE_URLS.DEVELOPMENT}/border`,
    PRODUCTION: `${BASE_URLS.PRODUCTION}/border`,
  },
  // Add other calculators here as needed
  // EXPOSURE_CALCULATOR: {
  //   DEVELOPMENT: `${BASE_URLS.DEVELOPMENT}/exposure`,
  //   PRODUCTION: `${BASE_URLS.PRODUCTION}/exposure`,
  // },
} as const;

/**
 * Configuration for mobile web app functionality
 *
 * 🚀 TO ENABLE APP LINKS WHEN THE NATIVE APP LAUNCHES:
 * Simply change ENABLE_APP_LINKS_IN_PRODUCTION from false to true
 *
 * This will:
 * - Enable "Open in Dorkroom App" button on mobile web
 * - Show the "Get the Dorkroom app" banner on mobile web
 * - Allow deep linking from mobile web to native app
 */
export const MOBILE_WEB_APP_CONFIG = {
  // 🎯 MAIN TOGGLE: Set to true when the native app is available in app stores
  // Currently disabled for production until app launch
  ENABLE_APP_LINKS_IN_PRODUCTION: false,

  // 🚫 TEMPORARY DISABLE: Set to true to temporarily disable the app banner
  // This overrides all other settings and completely disables the banner
  TEMPORARILY_DISABLE_APP_BANNER: true,

  // Always enable in development for testing
  get ENABLE_APP_LINKS() {
    return __DEV__ || this.ENABLE_APP_LINKS_IN_PRODUCTION;
  },

  // Control app banner/popup visibility
  get SHOW_APP_BANNER() {
    // If temporarily disabled, never show the banner
    if (this.TEMPORARILY_DISABLE_APP_BANNER) {
      return false;
    }
    return __DEV__ || this.ENABLE_APP_LINKS_IN_PRODUCTION;
  },
};
