import {
  FEATURE_FLAGS,
  type FeatureFlags,
  isFeatureEnabled,
} from '../constants/feature-flags';

export const useFeatureFlags = () => {
  return {
    flags: FEATURE_FLAGS,
    isEnabled: <K extends keyof FeatureFlags>(featureName: K): boolean =>
      isFeatureEnabled(featureName),
    isCustomRecipeSharingEnabled: FEATURE_FLAGS.CUSTOM_RECIPE_SHARING,
    isRecipeImportEnabled: FEATURE_FLAGS.RECIPE_IMPORT,
  };
};

export type UseFeatureFlagsReturn = ReturnType<typeof useFeatureFlags>;
