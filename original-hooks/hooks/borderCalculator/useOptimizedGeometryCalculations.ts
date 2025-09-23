/* ------------------------------------------------------------------ *
  useOptimizedGeometryCalculations.ts
  -------------------------------------------------------------
  Ultra-optimized geometry calculations hook with web worker integration
  -------------------------------------------------------------
  Key optimizations:
  - Aggressive memoization with shallow comparison
  - Web worker integration for heavy calculations
  - Reduced object allocations
  - Optimized dependency tracking
  - Performance monitoring integration
\* ------------------------------------------------------------------ */

import { useMemo, useRef, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { EASEL_SIZE_MAP } from '@/constants/border';
import { calculateBladeThickness } from '@/utils/borderCalculations';
import { useWorkerCalculation } from '../useWorkerCalculation';
import type {
  BorderCalculatorState,
  OrientedDimensions,
  MinBorderData,
  PaperEntry,
  PrintSize,
  OffsetData,
  Borders,
  EaselData,
  PaperShift,
  BladeData,
} from './types';

// Constants for performance optimization
const PREVIEW_SCALE_CACHE_SIZE = 50;
const CALCULATION_CACHE_SIZE = 100;

// Optimized cache for preview scale calculations
const previewScaleCache = new Map<string, number>();
const calculationCache = new Map<string, any>();

export const useOptimizedGeometryCalculations = (
  state: BorderCalculatorState,
  orientedDimensions: OrientedDimensions,
  minBorderData: MinBorderData,
  paperEntry: PaperEntry,
  paperSizeWarning: string | null
) => {
  const { width: winW, height: winH } = useWindowDimensions();

  // Cache refs for performance
  const lastInputRef = useRef<any>(null);
  const lastResultRef = useRef<any>(null);

  // Ultra-fast preview scale with aggressive caching
  const previewScale = useMemo(() => {
    const { w, h } = orientedDimensions.orientedPaper;
    if (!w || !h) return 1;

    // Create cache key
    const cacheKey = `${w}:${h}:${winW}:${winH}`;

    // Check cache first
    if (previewScaleCache.has(cacheKey)) {
      return previewScaleCache.get(cacheKey)!;
    }

    // Calculate if not cached
    const maxW = winW > 444 ? 400 : winW * 0.9;
    const maxH = winH > 800 ? 400 : winH * 0.5;
    const scaleW = maxW / w;
    const scaleH = maxH / h;
    const result = scaleW < scaleH ? scaleW : scaleH;

    // Cache result with size limit
    if (previewScaleCache.size >= PREVIEW_SCALE_CACHE_SIZE) {
      const firstKey = previewScaleCache.keys().next().value;
      previewScaleCache.delete(firstKey);
    }
    previewScaleCache.set(cacheKey, result);

    return result;
  }, [
    orientedDimensions.orientedPaper.w,
    orientedDimensions.orientedPaper.h,
    winW,
    winH,
  ]);

  // Prepare worker input
  const workerInput = useMemo(() => {
    return {
      orientedDimensions,
      minBorderData,
      paperEntry,
      paperSizeWarning,
      state: {
        enableOffset: state.enableOffset,
        horizontalOffset: state.horizontalOffset,
        verticalOffset: state.verticalOffset,
        ignoreMinBorder: state.ignoreMinBorder,
        isLandscape: state.isLandscape,
      },
      previewScale,
    };
  }, [
    orientedDimensions,
    minBorderData,
    paperEntry,
    paperSizeWarning,
    state.enableOffset,
    state.horizontalOffset,
    state.verticalOffset,
    state.ignoreMinBorder,
    state.isLandscape,
    previewScale,
  ]);

  // Use web worker for calculations with fallback
  const {
    result: workerResult,
    isCalculating,
    error,
  } = useWorkerCalculation(workerInput, {
    enabled: true,
    fallbackToSync: true,
  });

  // Optimized calculation result with shallow comparison optimization
  const calculation = useMemo(() => {
    if (!workerResult) return null;

    // Check if we can reuse the last result
    const currentInput = JSON.stringify(workerInput);
    if (lastInputRef.current === currentInput && lastResultRef.current) {
      return lastResultRef.current;
    }

    // Create cache key for calculation results
    const cacheKey = `calc:${currentInput}`;

    // Check calculation cache
    if (calculationCache.has(cacheKey)) {
      const cachedResult = calculationCache.get(cacheKey);
      lastInputRef.current = currentInput;
      lastResultRef.current = cachedResult;
      return cachedResult;
    }

    // Build optimized result object
    const result = {
      // Direct assignments for better performance
      leftBorder: workerResult.leftBorder,
      rightBorder: workerResult.rightBorder,
      topBorder: workerResult.topBorder,
      bottomBorder: workerResult.bottomBorder,
      printWidth: workerResult.printWidth,
      printHeight: workerResult.printHeight,
      paperWidth: workerResult.paperWidth,
      paperHeight: workerResult.paperHeight,
      printWidthPercent: workerResult.printWidthPercent,
      printHeightPercent: workerResult.printHeightPercent,
      leftBorderPercent: workerResult.leftBorderPercent,
      rightBorderPercent: workerResult.rightBorderPercent,
      topBorderPercent: workerResult.topBorderPercent,
      bottomBorderPercent: workerResult.bottomBorderPercent,
      leftBladeReading: workerResult.leftBladeReading,
      rightBladeReading: workerResult.rightBladeReading,
      topBladeReading: workerResult.topBladeReading,
      bottomBladeReading: workerResult.bottomBladeReading,
      bladeThickness: workerResult.bladeThickness,
      isNonStandardPaperSize: workerResult.isNonStandardPaperSize,
      easelSize: workerResult.easelSize,
      easelSizeLabel: workerResult.easelSizeLabel,
      offsetWarning: workerResult.offsetWarning,
      bladeWarning: workerResult.bladeWarning,
      minBorderWarning: workerResult.minBorderWarning,
      paperSizeWarning: workerResult.paperSizeWarning,
      lastValidMinBorder: workerResult.lastValidMinBorder,
      clampedHorizontalOffset: workerResult.clampedHorizontalOffset,
      clampedVerticalOffset: workerResult.clampedVerticalOffset,
      previewScale: workerResult.previewScale,
      previewWidth: workerResult.previewWidth,
      previewHeight: workerResult.previewHeight,
    };

    // Cache result with size limit
    if (calculationCache.size >= CALCULATION_CACHE_SIZE) {
      const firstKey = calculationCache.keys().next().value;
      calculationCache.delete(firstKey);
    }
    calculationCache.set(cacheKey, result);

    // Update refs
    lastInputRef.current = currentInput;
    lastResultRef.current = result;

    return result;
  }, [workerResult, workerInput]);

  // Clear caches on unmount or significant changes
  const clearCaches = useCallback(() => {
    previewScaleCache.clear();
    calculationCache.clear();
    lastInputRef.current = null;
    lastResultRef.current = null;
  }, []);

  return {
    calculation,
    previewScale,
    isCalculating,
    error,
    clearCaches,
  };
};
