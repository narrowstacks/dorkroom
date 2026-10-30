export interface FeatureFlags {
  CUSTOM_RECIPE_SHARING: boolean;
  RECIPE_IMPORT: boolean;
}

const isDevelopment =
  globalThis.process !== undefined && process.env.NODE_ENV !== 'production';

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
