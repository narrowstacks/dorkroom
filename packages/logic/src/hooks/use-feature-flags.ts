import { useMemo } from 'react';
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  type FeatureFlags,
} from '../constants/feature-flags';

/**
 * Hook for accessing feature flags and checking if specific features are enabled.
 * Provides convenient access to application feature toggles and individual flag checks.
 *
 * @returns Object containing feature flags and helper functions
 *
 * @example
 * ```typescript
 * const {
 *   isEnabled,
 *   isCustomRecipeSharingEnabled,
 *   isRecipeImportEnabled
 * } = useFeatureFlags();
 *
 * // Check individual features
 * if (isEnabled('CUSTOM_RECIPE_SHARING')) {
 *   // Show custom recipe sharing UI
 * }
 *
 * // Use convenience properties
 * if (isCustomRecipeSharingEnabled) {
 *   // Show sharing button
 * }
 * ```
 */
export const useFeatureFlags = () => {
  const flags = useMemo(() => FEATURE_FLAGS, []);

  const isEnabled = useMemo(
    () =>
      <K extends keyof FeatureFlags>(featureName: K): boolean =>
        isFeatureEnabled(featureName),
    []
  );

  const isCustomRecipeSharingEnabled = useMemo(
    () => flags.CUSTOM_RECIPE_SHARING,
    [flags.CUSTOM_RECIPE_SHARING]
  );

  const isRecipeImportEnabled = useMemo(
    () => flags.RECIPE_IMPORT,
    [flags.RECIPE_IMPORT]
  );

  const isAdvancedChemistryCalculatorEnabled = useMemo(
    () => flags.ADVANCED_CHEMISTRY_CALCULATOR,
    [flags.ADVANCED_CHEMISTRY_CALCULATOR]
  );

  return {
    flags,
    isEnabled,
    isCustomRecipeSharingEnabled,
    isRecipeImportEnabled,
    isAdvancedChemistryCalculatorEnabled,
  };
};

export type UseFeatureFlagsReturn = ReturnType<typeof useFeatureFlags>;
