// Types exports
export * from './types/border-calculator';

// Constants exports
export * from './constants/border-calculator';
export * from './constants/calculations';

// Utils exports
export * from './utils/border-calculations';
export * from './utils/input-validation';
export * from './utils/preset-sharing';
export * from './utils/url-helpers';

// Hook exports
export { useWindowDimensions } from './hooks/use-window-dimensions';
export { useBorderPresets } from './hooks/use-border-presets';
export { useBorderCalculator } from './hooks/use-border-calculator';
export { useResizeCalculator } from './hooks/use-resize-calculator';
export { usePresetSharing } from './hooks/use-preset-sharing';
export { useUrlPresetLoader } from './hooks/use-url-preset-loader';

// Border calculator modular hooks
export {
  useBorderCalculator as useModularBorderCalculator,
  useBorderCalculatorState,
  useDimensionCalculations,
  useGeometryCalculations,
  useWarningSystem,
  useImageHandling,
  useInputHandlers,
} from './hooks/border-calculator';