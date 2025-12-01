export interface FeatureFlags {
  CUSTOM_RECIPE_SHARING: boolean;
  RECIPE_IMPORT: boolean;
}

const isDevelopment =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' &&
    (window as unknown as { __DORKROOM_DEV__?: boolean }).__DORKROOM_DEV__ ===
      true);

const DEVELOPMENT_FLAGS: FeatureFlags = {
  CUSTOM_RECIPE_SHARING: true,
  RECIPE_IMPORT: true,
};

const PRODUCTION_FLAGS: FeatureFlags = {
  CUSTOM_RECIPE_SHARING: false,
  RECIPE_IMPORT: true,
};

export const FEATURE_FLAGS: FeatureFlags = isDevelopment
  ? DEVELOPMENT_FLAGS
  : PRODUCTION_FLAGS;

export const isFeatureEnabled = <K extends keyof FeatureFlags>(
  featureName: K
): boolean => FEATURE_FLAGS[featureName];

export const FEATURE_FLAG_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  CUSTOM_RECIPE_SHARING: 'Enable sharing of user-created custom recipes',
  RECIPE_IMPORT: 'Enable importing recipes from shared URLs',
};
