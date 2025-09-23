/* ------------------------------------------------------------------ *
  useOptimizedBorderCalculator.ts
  -------------------------------------------------------------
  Ultra-optimized border calculator hook with maximum performance
  -------------------------------------------------------------
  Key optimizations:
  - Web worker integration for heavy calculations
  - Reduced re-renders through optimized state management
  - Aggressive memoization with intelligent caching
  - Minimal object allocations
  - Performance monitoring integration
  - Smart dependency tracking
\* ------------------------------------------------------------------ */

import { useMemo, useCallback } from 'react';
import type { BorderCalculation } from '@/types/borderTypes';
import { useOptimizedBorderCalculatorState } from './useOptimizedBorderCalculatorState';
import { useDimensionCalculations } from './useDimensionCalculations';
import { useOptimizedGeometryCalculations } from './useOptimizedGeometryCalculations';
import { useWarningSystem } from './useWarningSystem';
import { useImageHandling } from './useImageHandling';
import { useInputHandlers } from './useInputHandlers';

export const useOptimizedBorderCalculator = () => {
  // Ultra-optimized state management with reduced re-renders
  const { state, dispatch } = useOptimizedBorderCalculatorState();

  // Dimension calculations (already optimized)
  const { paperEntry, paperSizeWarning, orientedDimensions, minBorderData } =
    useDimensionCalculations(state);

  // Ultra-optimized geometry calculations with web worker integration
  const { calculation, isCalculating, error, clearCaches } =
    useOptimizedGeometryCalculations(
      state,
      orientedDimensions,
      minBorderData,
      paperEntry,
      paperSizeWarning
    );

  // Warning system management (only run if calculation exists)
  useWarningSystem(
    state,
    dispatch,
    calculation
      ? {
          offsetWarning: calculation.offsetWarning,
          bladeWarning: calculation.bladeWarning,
          minBorderWarning: calculation.minBorderWarning,
          paperSizeWarning: calculation.paperSizeWarning,
          lastValidMinBorder: calculation.lastValidMinBorder,
        }
      : {
          offsetWarning: null,
          bladeWarning: null,
          minBorderWarning: null,
          paperSizeWarning: null,
          lastValidMinBorder: state.lastValidMinBorder,
        }
  );

  // Image handling (called at top level to follow Rules of Hooks)
  const imageHandling = useImageHandling(state, dispatch);

  // Input handlers (called at top level to follow Rules of Hooks)
  const inputHandlers = useInputHandlers(state, dispatch);

  // Optimized calculation object with minimal re-creation
  const optimizedCalculation = useMemo((): BorderCalculation | null => {
    if (!calculation) return null;

    return {
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
    };
  }, [calculation]);

  // Performance cleanup function
  const cleanup = useCallback(() => {
    clearCaches();
  }, [clearCaches]);

  /* =============================================================== *
     Optimized Public API with minimal object creation
  * =============================================================== */

  return useMemo(
    () => ({
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
      isLandscape: state.isLandscape,
      isRatioFlipped: state.isRatioFlipped,

      /* warnings */
      offsetWarning: state.offsetWarning,
      bladeWarning: state.bladeWarning,
      minBorderWarning: state.minBorderWarning,
      paperSizeWarning: state.paperSizeWarning,
      clampedHorizontalOffset: calculation?.clampedHorizontalOffset ?? 0,
      clampedVerticalOffset: calculation?.clampedVerticalOffset ?? 0,

      /* image‑related */
      ...imageHandling,

      /* geometry results */
      calculation: optimizedCalculation,

      /* performance state */
      isCalculating,
      error,

      /* setters (from input handlers) */
      ...inputHandlers,

      /* performance utilities */
      cleanup,
    }),
    [
      // Optimized dependency array - only primitive values that actually affect the API
      state.aspectRatio,
      state.paperSize,
      state.customAspectWidth,
      state.customAspectHeight,
      state.customPaperWidth,
      state.customPaperHeight,
      state.minBorder,
      state.enableOffset,
      state.ignoreMinBorder,
      state.horizontalOffset,
      state.verticalOffset,
      state.showBlades,
      state.isLandscape,
      state.isRatioFlipped,
      state.offsetWarning,
      state.bladeWarning,
      state.minBorderWarning,
      state.paperSizeWarning,
      optimizedCalculation,
      isCalculating,
      error,
      imageHandling,
      inputHandlers,
      cleanup,
      calculation?.clampedHorizontalOffset,
      calculation?.clampedVerticalOffset,
    ]
  );
};

export default useOptimizedBorderCalculator;
