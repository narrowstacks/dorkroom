/* ------------------------------------------------------------------ *
   index.ts
   -------------------------------------------------------------
   Main border calculator hook - orchestrates all sub-hooks
   -------------------------------------------------------------
   Exports:
     - useBorderCalculator: Main hook that composes all functionality
\* ------------------------------------------------------------------ */

import type { BorderCalculation } from '../../types/border-calculator';
import { useBorderCalculatorState } from './use-border-calculator-state';
import { useDimensionCalculations } from './use-dimension-calculations';
import { useGeometryCalculations } from './use-geometry-calculations';
import { useWarningSystem } from './use-warning-system';
import { useImageHandling } from './use-image-handling';
import { useInputHandlers } from './use-input-handlers';

export const useBorderCalculator = () => {
  // Core state management
  const { state, dispatch } = useBorderCalculatorState();

  // Dimension calculations
  const { paperEntry, paperSizeWarning, orientedDimensions, minBorderData } =
    useDimensionCalculations(state);

  // Geometry calculations
  const { calculation } = useGeometryCalculations(
    state,
    orientedDimensions,
    minBorderData,
    paperEntry,
    paperSizeWarning
  );

  // Warning system management
  useWarningSystem(state, dispatch, {
    offsetWarning: calculation.offsetWarning,
    bladeWarning: calculation.bladeWarning,
    minBorderWarning: calculation.minBorderWarning,
    paperSizeWarning: calculation.paperSizeWarning,
    lastValidMinBorder: calculation.lastValidMinBorder,
  });

  // Image handling helpers
  const imageHandling = useImageHandling(state, dispatch);

  // Input handlers
  const inputHandlers = useInputHandlers(state, dispatch);

  /* =============================================================== *
     Public API
  * =============================================================== */

  return {
    /* primitive state values */
    aspectRatio: state.aspectRatio,
    paperSize: state.paperSize,
    customAspectWidth: state.customAspectWidth,
    customAspectHeight: state.customAspectHeight,
    customPaperWidth: state.customPaperWidth,
    customPaperHeight: state.customPaperHeight,
    minBorder: state.minBorder,
    enableOffset: state.enableOffset,
    ignoreMinBorder: state.ignoreMinBorder,
    horizontalOffset: state.horizontalOffset,
    verticalOffset: state.verticalOffset,
    showBlades: state.showBlades,
    showBladeReadings: state.showBladeReadings,
    isLandscape: state.isLandscape,
    isRatioFlipped: state.isRatioFlipped,

    /* warnings */
    offsetWarning: state.offsetWarning,
    bladeWarning: state.bladeWarning,
    minBorderWarning: state.minBorderWarning,
    paperSizeWarning: state.paperSizeWarning,
    clampedHorizontalOffset: calculation.clampedHorizontalOffset,
    clampedVerticalOffset: calculation.clampedVerticalOffset,

    /* image helpers */
    ...imageHandling,

    /* geometry results */
    calculation: {
      leftBorder: calculation.leftBorder,
      rightBorder: calculation.rightBorder,
      topBorder: calculation.topBorder,
      bottomBorder: calculation.bottomBorder,
      printWidth: calculation.printWidth,
      printHeight: calculation.printHeight,
      paperWidth: calculation.paperWidth,
      paperHeight: calculation.paperHeight,

      printWidthPercent: calculation.printWidthPercent,
      printHeightPercent: calculation.printHeightPercent,
      leftBorderPercent: calculation.leftBorderPercent,
      rightBorderPercent: calculation.rightBorderPercent,
      topBorderPercent: calculation.topBorderPercent,
      bottomBorderPercent: calculation.bottomBorderPercent,

      leftBladeReading: calculation.leftBladeReading,
      rightBladeReading: calculation.rightBladeReading,
      topBladeReading: calculation.topBladeReading,
      bottomBladeReading: calculation.bottomBladeReading,
      bladeThickness: calculation.bladeThickness,

      isNonStandardPaperSize: calculation.isNonStandardPaperSize,
      easelSize: calculation.easelSize,
      easelSizeLabel: calculation.easelSizeLabel,

      previewScale: calculation.previewScale,
      previewWidth: calculation.previewWidth,
      previewHeight: calculation.previewHeight,

      offsetWarning: calculation.offsetWarning,
      bladeWarning: calculation.bladeWarning,
      minBorderWarning: calculation.minBorderWarning,
      paperSizeWarning: calculation.paperSizeWarning,
      lastValidMinBorder: calculation.lastValidMinBorder,
      clampedHorizontalOffset: calculation.clampedHorizontalOffset,
    } as BorderCalculation,

    /* setters (from input handlers) */
    ...inputHandlers,
  };
};

export default useBorderCalculator;

// Re-export sub-hooks for testing or advanced usage
export { useBorderCalculatorState } from './use-border-calculator-state';
export { useDimensionCalculations } from './use-dimension-calculations';
export { useGeometryCalculations } from './use-geometry-calculations';
export { useWarningSystem } from './use-warning-system';
export { useImageHandling } from './use-image-handling';
export { useInputHandlers } from './use-input-handlers';
export * from '../../types/border-calculator';
