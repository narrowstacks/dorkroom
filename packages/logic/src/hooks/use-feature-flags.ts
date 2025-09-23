import { useMemo } from 'react';
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  type FeatureFlags,
} from '../constants/feature-flags';

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
