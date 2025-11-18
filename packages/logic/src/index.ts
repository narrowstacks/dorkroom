// Types exports
export * from './types/border-calculator';
export * from './types/reciprocity';
export * from './types/custom-recipes';
export * from './types/development-recipes-url';
export * from './types/exposure-calculator';

// Constants exports
export * from './constants/border-calculator';
export * from './constants/border-calculator-defaults';
export * from './constants/resize-calculator';
export * from './constants/calculations';
export * from './constants/reciprocity';
export * from './constants/reciprocity-calculator-defaults';
export * from './constants/exposure-calculator-defaults';
export * from './constants/development-recipes';
export * from './constants/feature-flags';

// Utils exports
export * from './utils/border-calculations';
export * from './utils/input-validation';
export * from './utils/preset-sharing';
export * from './utils/url-helpers';
export * from './utils/recipe-sharing';
export * from './utils/custom-recipe-helpers';
export * from './utils/exposure-calculations';
export * from './utils/precision';
export * from './utils/temperature-formatting';
export * from './utils/time-formatting';
export * from './utils/filmdev-mapper';
export * from './utils/device-detection';
export * from './utils/unit-conversion';
export * from './utils/object-comparison';
export { debugLog, debugWarn, debugError } from './utils/debug-logger';

// Schemas
export * from './schemas/border-calculator.schema';

// Services exports
export * from './services/filmdev-api';

// Hook exports
export { useWindowDimensions } from './hooks/use-window-dimensions';
export { useBorderPresets } from './hooks/use-border-presets';
export { useBorderCalculator } from './hooks/use-border-calculator';
export { useResizeCalculator } from './hooks/use-resize-calculator';
export { usePresetSharing } from './hooks/use-preset-sharing';
export { useUrlPresetLoader } from './hooks/use-url-preset-loader';
export {
  useReciprocityCalculator,
  formatReciprocityTime,
  parseReciprocityTime,
} from './hooks/use-reciprocity-calculator';
export {
  useExposureCalculator,
  type UseExposureCalculatorReturn,
} from './hooks/use-exposure-calculator';
export { useFeatureFlags } from './hooks/use-feature-flags';
export { useDebounce, useDebouncedCallback } from './hooks/use-debounce';
export {
  useDevelopmentTable,
  type DevelopmentCombinationView,
} from './hooks/development-recipes/use-development-table';
export { useCustomRecipes } from './hooks/custom-recipes/use-custom-recipes-unified';
export {
  useAddCustomRecipe,
  useUpdateCustomRecipe,
  useDeleteCustomRecipe,
  useClearCustomRecipes,
} from './hooks/custom-recipes/use-custom-recipe-mutations';
export { useCustomRecipeSharing } from './hooks/development-recipes/use-custom-recipe-sharing';
export { useRecipeSharing } from './hooks/development-recipes/use-recipe-sharing';
export { useRecipeUrlState } from './hooks/development-recipes/use-recipe-url-state';
export { useFavorites } from './hooks/development-recipes/use-favorites';
export {
  useDevelopmentRecipes,
  type CustomRecipeFilter,
} from './hooks/development-recipes/use-development-recipes';
export {
  useViewPreference,
  type ViewMode,
} from './hooks/development-recipes/use-view-preference';

// Border calculator modular hooks
export {
  useBorderCalculator as useModularBorderCalculator,
  useBorderCalculatorState,
  initialState as borderCalculatorInitialState,
  useDimensionCalculations,
  useGeometryCalculations,
  useWarningSystem,
  useImageHandling,
  useInputHandlers,
  usePaperDimensionInput,
  usePresetManagement,
  useCalculatorSharing,
} from './hooks/border-calculator';
