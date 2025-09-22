/**
 * Feature Flags Configuration
 *
 * This file defines all available feature flags for the DorkroomReact application.
 * Feature flags allow for runtime enabling/disabling of features without requiring app updates.
 *
 * Usage:
 * - Set flags to `true` to enable features
 * - Set flags to `false` to disable features
 * - Use the useFeatureFlags hook to access these flags in components
 */

export interface FeatureFlags {
  /**
   * Custom Recipe Sharing
   *
   * Controls the ability to share custom recipes created by users.
   * When disabled:
   * - Share button is hidden for custom recipes
   * - Custom recipe sharing functionality is not available
   * - API recipe sharing remains unaffected
   *
   * @default true
   */
  CUSTOM_RECIPE_SHARING: boolean;

  /**
   * Recipe Import from URLs
   *
   * Controls the ability to import recipes from shared URLs.
   * When disabled:
   * - URL-based recipe import is blocked
   * - Import modals will not appear
   *
   * @default true
   */
  RECIPE_IMPORT: boolean;

  /**
   * Advanced Chemistry Calculator
   *
   * Controls access to advanced chemistry calculation features.
   * When disabled:
   * - Basic calculator remains available
   * - Advanced features are hidden
   *
   * @default true
   */
  ADVANCED_CHEMISTRY_CALCULATOR: boolean;
}

/**
 * Development Environment Feature Flags
 * These flags are used during development and can be more permissive
 */
const DEVELOPMENT_FLAGS: FeatureFlags = {
  CUSTOM_RECIPE_SHARING: true,
  RECIPE_IMPORT: true,
  ADVANCED_CHEMISTRY_CALCULATOR: true,
};

/**
 * Production Environment Feature Flags
 * These flags are used in production and should be more conservative
 */
const PRODUCTION_FLAGS: FeatureFlags = {
  CUSTOM_RECIPE_SHARING: false,
  RECIPE_IMPORT: true,
  ADVANCED_CHEMISTRY_CALCULATOR: true,
};

/**
 * Get the current feature flags based on the environment
 *
 * @returns The appropriate feature flags for the current environment
 */
export const getFeatureFlags = (): FeatureFlags => {
  // In development, use development flags
  if (__DEV__) {
    return DEVELOPMENT_FLAGS;
  }

  // In production, use production flags
  return PRODUCTION_FLAGS;
};

/**
 * Default feature flags export
 * This is the main export that should be used throughout the application
 */
export const FEATURE_FLAGS = getFeatureFlags();

/**
 * Helper function to check if a specific feature is enabled
 *
 * @param featureName - The name of the feature to check
 * @returns Whether the feature is enabled
 */
export const isFeatureEnabled = <K extends keyof FeatureFlags>(
  featureName: K,
): boolean => {
  return FEATURE_FLAGS[featureName];
};

/**
 * Feature flag descriptions for documentation and debugging
 */
export const FEATURE_FLAG_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  CUSTOM_RECIPE_SHARING: "Enable sharing of user-created custom recipes",
  RECIPE_IMPORT: "Enable importing recipes from shared URLs",
  ADVANCED_CHEMISTRY_CALCULATOR:
    "Enable advanced chemistry calculation features",
};
