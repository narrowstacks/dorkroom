// Types exports

// Constants exports
export * from './constants/border-calculator';
export * from './constants/border-calculator-defaults';
export * from './constants/calculations';
export * from './constants/development-recipes';
export * from './constants/exposure-calculator-defaults';
export * from './constants/feature-flags';
export * from './constants/lens-calculator-defaults';
export * from './constants/reciprocity';
export * from './constants/reciprocity-calculator-defaults';
export * from './constants/resize-calculator';
// API Hooks
export * from './hooks/api';
// Border calculator modular hooks (recommended)
export {
  initialState as borderCalculatorInitialState,
  useAlertSystem,
  useBorderCalculator,
  // Alias for backwards compatibility
  useBorderCalculator as useModularBorderCalculator,
  useBorderCalculatorState,
  useCalculatorSharing,
  useDimensionCalculations,
  useGeometryCalculations,
  useImageHandling,
  useInputHandlers,
  usePaperDimensionInput,
  usePresetManagement,
} from './hooks/border-calculator';
export {
  useAddCustomRecipe,
  useClearCustomRecipes,
  useDeleteCustomRecipe,
  useUpdateCustomRecipe,
} from './hooks/custom-recipes/use-custom-recipe-mutations';
export { useCustomRecipes } from './hooks/custom-recipes/use-custom-recipes-unified';
export {
  type CustomRecipeShareOptions,
  type CustomRecipeShareResult,
  type ImportedCustomRecipe,
  useCustomRecipeSharing,
} from './hooks/development-recipes/use-custom-recipe-sharing';
export {
  type CustomRecipeFilter,
  useDevelopmentRecipes,
} from './hooks/development-recipes/use-development-recipes';
export {
  type DevelopmentCombinationView,
  useDevelopmentTable,
} from './hooks/development-recipes/use-development-table';
export { useFavorites } from './hooks/development-recipes/use-favorites';
export {
  type RecipeShareResult,
  type RegularRecipeShareOptions,
  useRecipeSharing,
} from './hooks/development-recipes/use-recipe-sharing';
export { useRecipeUrlState } from './hooks/development-recipes/use-recipe-url-state';
export {
  useViewPreference,
  type ViewMode,
} from './hooks/development-recipes/use-view-preference';
// Film hooks
export { type UseFilmDatabaseReturn, useFilmDatabase } from './hooks/films';
/**
 * @deprecated Use `useBorderCalculator` from './hooks/border-calculator' instead.
 * This legacy hook will be removed in v2.0.0.
 */
export { useBorderCalculator as useLegacyBorderCalculator } from './hooks/use-border-calculator';
export { useBorderPresets } from './hooks/use-border-presets';
export { useDebounce, useDebouncedCallback } from './hooks/use-debounce';
export {
  type UseExposureCalculatorReturn,
  useExposureCalculator,
} from './hooks/use-exposure-calculator';
export { useFeatureFlags } from './hooks/use-feature-flags';
export {
  calculateEquivalentFocalLength,
  calculateFieldOfView,
  formatFocalLength,
  type UseLensCalculatorReturn,
  useLensCalculator,
} from './hooks/use-lens-calculator';
export {
  type FieldValidator,
  type LocalStorageFormPersistenceOptions,
  type LocalStorageFormPersistenceReturn,
  useLocalStorageFormPersistence,
} from './hooks/use-local-storage-form-persistence';
export { usePresetSharing } from './hooks/use-preset-sharing';
export {
  formatReciprocityTime,
  parseReciprocityTime,
  useReciprocityCalculator,
} from './hooks/use-reciprocity-calculator';
export { useResizeCalculator } from './hooks/use-resize-calculator';
export { useUrlPresetLoader } from './hooks/use-url-preset-loader';
// Hook exports
export { useWindowDimensions } from './hooks/use-window-dimensions';
// Schemas
export * from './schemas/border-calculator.schema';
export * from './schemas/validators';
// Services exports
export * from './services/filmdev-api';
export {
  createStorageManager,
  isArray,
  isStringArray,
  type StorageManager,
  type StorageManagerOptions,
} from './services/local-storage';
export * from './types/border-calculator';
export * from './types/custom-recipes';
export * from './types/development-recipes-url';
export * from './types/exposure-calculator';
export * from './types/lens-calculator';
export * from './types/reciprocity';
// Utils exports
export * from './utils/border-calculations';
export * from './utils/combination-factory';
export * from './utils/custom-recipe-helpers';
export { debugError, debugLog, debugWarn } from './utils/debug-logger';
export * from './utils/device-detection';
export * from './utils/dilution-parser';
export * from './utils/exposure-calculations';
export * from './utils/filmdev-mapper';
export * from './utils/fuzzy-search';
export * from './utils/input-validation';
export * from './utils/object-comparison';
export * from './utils/precision';
export * from './utils/preset-sharing';
export * from './utils/recipe-sharing';
export * from './utils/temperature-formatting';
export * from './utils/text-sanitization';
export * from './utils/time-formatting';
export * from './utils/unit-conversion';
export * from './utils/url-helpers';
export * from './utils/volume-conversion';
