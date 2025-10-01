export interface FeatureFlags {
  CUSTOM_RECIPE_SHARING: boolean;
  RECIPE_IMPORT: boolean;
  ADVANCED_CHEMISTRY_CALCULATOR: boolean;
  INFOBASE: boolean;
}

const isDevelopment =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' &&
    (window as unknown as { __DORKROOM_DEV__?: boolean }).__DORKROOM_DEV__ ===
      true);

/**
 * Parse environment variable as boolean
 * @param value - Environment variable value
 * @param defaultValue - Default value if not set
 */
const getEnvFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

const DEVELOPMENT_FLAGS: FeatureFlags = {
  CUSTOM_RECIPE_SHARING: true,
  RECIPE_IMPORT: true,
  ADVANCED_CHEMISTRY_CALCULATOR: true,
  INFOBASE: getEnvFlag(import.meta.env?.VITE_FEATURE_INFOBASE, true),
};

const PRODUCTION_FLAGS: FeatureFlags = {
  CUSTOM_RECIPE_SHARING: false,
  RECIPE_IMPORT: true,
  ADVANCED_CHEMISTRY_CALCULATOR: true,
  INFOBASE: getEnvFlag(import.meta.env?.VITE_FEATURE_INFOBASE, false),
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
  ADVANCED_CHEMISTRY_CALCULATOR:
    'Enable advanced chemistry calculation features',
  INFOBASE: 'Enable the MDX-based infobase/wiki system',
};
