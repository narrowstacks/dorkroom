import { useMemo } from 'react';
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  type FeatureFlags,
} from '@/constants/featureFlags';

/**
 * Hook for accessing feature flags throughout the application
 *
 * This hook provides a React-friendly way to access feature flags and check
 * if specific features are enabled. It returns both the complete flag object
 * and convenience methods for checking individual flags.
 *
 * @example
 * ```typescript
 * const { flags, isEnabled } = useFeatureFlags();
 *
 * // Check if custom recipe sharing is enabled
 * if (isEnabled('CUSTOM_RECIPE_SHARING')) {
 *   // Show sharing functionality
 * }
 *
 * // Or access flags directly
 * if (flags.CUSTOM_RECIPE_SHARING) {
 *   // Show sharing functionality
 * }
 * ```
 */
export const useFeatureFlags = () => {
  // Memoize the flags to prevent unnecessary re-renders
  const flags = useMemo(() => FEATURE_FLAGS, []);

  /**
   * Check if a specific feature is enabled
   *
   * @param featureName - The name of the feature to check
   * @returns Whether the feature is enabled
   */
  const isEnabled = useMemo(
    () =>
      <K extends keyof FeatureFlags>(featureName: K): boolean => {
        return isFeatureEnabled(featureName);
      },
    []
  );

  /**
   * Check if custom recipe sharing is enabled
   * Convenience method for the most commonly checked flag
   */
  const isCustomRecipeSharingEnabled = useMemo(
    () => flags.CUSTOM_RECIPE_SHARING,
    [flags.CUSTOM_RECIPE_SHARING]
  );

  /**
   * Check if recipe import is enabled
   * Convenience method for recipe import functionality
   */
  const isRecipeImportEnabled = useMemo(
    () => flags.RECIPE_IMPORT,
    [flags.RECIPE_IMPORT]
  );

  /**
   * Check if advanced chemistry calculator is enabled
   * Convenience method for advanced calculator features
   */
  const isAdvancedChemistryCalculatorEnabled = useMemo(
    () => flags.ADVANCED_CHEMISTRY_CALCULATOR,
    [flags.ADVANCED_CHEMISTRY_CALCULATOR]
  );

  return {
    /**
     * Complete feature flags object
     */
    flags,

    /**
     * Generic method to check if any feature is enabled
     */
    isEnabled,

    /**
     * Convenience methods for commonly checked features
     */
    isCustomRecipeSharingEnabled,
    isRecipeImportEnabled,
    isAdvancedChemistryCalculatorEnabled,
  };
};

/**
 * Type for the return value of useFeatureFlags hook
 * Useful for prop types and other type definitions
 */
export type UseFeatureFlagsReturn = ReturnType<typeof useFeatureFlags>;
