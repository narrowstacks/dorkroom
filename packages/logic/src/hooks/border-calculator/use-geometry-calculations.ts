/* ------------------------------------------------------------------ *
   use-geometry-calculations.ts
   -------------------------------------------------------------
   Hook for geometry calculations: print size, borders, blade readings
   -------------------------------------------------------------
   Exports:
     - useGeometryCalculations: All geometry-related calculations
\* ------------------------------------------------------------------ */

import { useMemo } from 'react';
import { useWindowDimensions } from '../use-window-dimensions';
import { EASEL_SIZE_MAP } from '../../constants/border-calculator';
import {
  calculateBladeThickness,
  findCenteringOffsets,
  computePrintSize,
  clampOffsets,
  bordersFromGaps,
  bladeReadings,
} from '../../utils/border-calculations';
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
} from '../../types/border-calculator';

/**
 * Hook for performing all geometry-related calculations including print size,
 * borders, blade readings, preview scaling, and warning generation.
 * This is the computational core of the border calculator.
 *
 * @param state - Current border calculator state
 * @param orientedDimensions - Paper and aspect ratio dimensions with orientation applied
 * @param minBorderData - Validated minimum border data
 * @param paperEntry - Paper size information
 * @param paperSizeWarning - Any warning about paper size compatibility
 * @returns Object containing complete calculation results and preview scale
 *
 * @example
 * ```typescript
 * const { calculation, previewScale } = useGeometryCalculations(
 *   state,
 *   orientedDimensions,
 *   minBorderData,
 *   paperEntry,
 *   paperSizeWarning
 * );
 *
 * // Use calculation results
 * console.log(`Print: ${calculation.printWidth}" x ${calculation.printHeight}"`);
 * console.log(`Borders: L${calculation.leftBorder}" R${calculation.rightBorder}"`);
 * console.log(`Blade readings: L${calculation.leftBladeReading}"`);
 * ```
 */
export const useGeometryCalculations = (
  state: BorderCalculatorState,
  orientedDimensions: OrientedDimensions,
  minBorderData: MinBorderData,
  paperEntry: PaperEntry,
  paperSizeWarning: string | null
) => {
  const { width: winW, height: winH } = useWindowDimensions();

  // Ultra-optimized preview scale calculation with aggressive caching
  const previewScale = useMemo(() => {
    const { w, h } = orientedDimensions.orientedPaper;
    if (!w || !h) return 1;

    // Pre-calculate constants to avoid repeated comparisons
    const maxW = winW > 444 ? 400 : winW * 0.9;
    const maxH = winH > 800 ? 400 : winH * 0.5;

    const scaleW = maxW / w;
    const scaleH = maxH / h;

    return scaleW < scaleH ? scaleW : scaleH;
  }, [orientedDimensions.orientedPaper, winW, winH]);

  // Optimized print size calculation with simpler memoization
  const printSize = useMemo((): PrintSize => {
    const { orientedPaper, orientedRatio } = orientedDimensions;
    const { minBorder } = minBorderData;

    return computePrintSize(
      orientedPaper.w,
      orientedPaper.h,
      orientedRatio.w,
      orientedRatio.h,
      minBorder
    );
  }, [orientedDimensions, minBorderData]);

  // Offset calculations
  const offsetData = useMemo((): OffsetData => {
    const { orientedPaper } = orientedDimensions;
    const { minBorder } = minBorderData;
    const { printW, printH } = printSize;

    return clampOffsets(
      orientedPaper.w,
      orientedPaper.h,
      printW,
      printH,
      minBorder,
      state.enableOffset ? state.horizontalOffset : 0,
      state.enableOffset ? state.verticalOffset : 0,
      state.ignoreMinBorder
    );
  }, [
    orientedDimensions,
    minBorderData,
    printSize,
    state.enableOffset,
    state.horizontalOffset,
    state.verticalOffset,
    state.ignoreMinBorder,
  ]);

  // Optimized border calculations without heavy caching overhead
  const borders = useMemo((): Borders => {
    const { halfW, halfH, h: offH, v: offV } = offsetData;
    return bordersFromGaps(halfW, halfH, offH, offV);
  }, [offsetData]);

  // Easel fitting calculations
  const easelData = useMemo((): EaselData => {
    return findCenteringOffsets(paperEntry.w, paperEntry.h, state.isLandscape);
  }, [paperEntry, state.isLandscape]);

  // Paper shift calculations
  const paperShift = useMemo((): PaperShift => {
    const { orientedPaper } = orientedDimensions;
    const { effectiveSlot, isNonStandardPaperSize } = easelData;

    const spX = isNonStandardPaperSize
      ? (orientedPaper.w - effectiveSlot.width) / 2
      : 0;
    const spY = isNonStandardPaperSize
      ? (orientedPaper.h - effectiveSlot.height) / 2
      : 0;

    return { spX, spY };
  }, [orientedDimensions, easelData]);

  // Blade readings and warnings
  const bladeData = useMemo((): BladeData => {
    const { printW, printH } = printSize;
    const { h: offH, v: offV } = offsetData;
    const { spX, spY } = paperShift;

    const blades = bladeReadings(printW, printH, spX + offH, spY + offV);

    let bladeWarning: string | null = null;
    const values = Object.values(blades);
    if (values.some((v) => v < 0))
      bladeWarning = 'Negative blade reading – use opposite side of scale.';
    if (values.some((v) => Math.abs(v) < 3 && v !== 0))
      bladeWarning =
        (bladeWarning ? bladeWarning + '\n' : '') +
        'Many easels have no markings below about 3 in.';

    return { blades, bladeWarning };
  }, [printSize, offsetData, paperShift]);

  // Ultra-optimized final calculation assembly with minimal object creation
  const calculation = useMemo(() => {
    const { orientedPaper } = orientedDimensions;
    const { printW, printH } = printSize;
    const { h: offH, v: offV, warning: offsetWarning } = offsetData;
    const { easelSize, isNonStandardPaperSize } = easelData;
    const { blades, bladeWarning } = bladeData;

    // Cache all frequently accessed values to avoid repeated property access
    const paperW = orientedPaper.w;
    const paperH = orientedPaper.h;
    const invPaperW = paperW ? 100 / paperW : 0;
    const invPaperH = paperH ? 100 / paperH : 0;
    const previewW = paperW * previewScale;
    const previewH = paperH * previewScale;

    // Pre-calculate blade thickness to avoid function call in object creation
    const bladeThickness = calculateBladeThickness(paperW, paperH);

    // Pre-calculate easel size label to avoid template literal in object
    const easelKey = `${easelSize.height}×${easelSize.width}`;
    const easelSizeLabel = EASEL_SIZE_MAP.get(easelKey)?.label ?? easelKey;

    // Return optimized object with minimal computation during creation
    return {
      // Border values (direct references)
      leftBorder: borders.left,
      rightBorder: borders.right,
      topBorder: borders.top,
      bottomBorder: borders.bottom,

      // Print and paper dimensions
      printWidth: printW,
      printHeight: printH,
      paperWidth: paperW,
      paperHeight: paperH,

      // Percentage calculations (using pre-calculated inverses)
      printWidthPercent: printW * invPaperW,
      printHeightPercent: printH * invPaperH,
      leftBorderPercent: borders.left * invPaperW,
      rightBorderPercent: borders.right * invPaperW,
      topBorderPercent: borders.top * invPaperH,
      bottomBorderPercent: borders.bottom * invPaperH,

      // Blade readings (direct references)
      leftBladeReading: blades.left,
      rightBladeReading: blades.right,
      topBladeReading: blades.top,
      bottomBladeReading: blades.bottom,
      bladeThickness,

      // Easel data
      isNonStandardPaperSize: isNonStandardPaperSize && !paperSizeWarning,
      easelSize,
      easelSizeLabel,

      // Warnings and offsets (direct references where possible)
      offsetWarning,
      bladeWarning,
      minBorderWarning:
        minBorderData.minBorder !== state.minBorder
          ? minBorderData.minBorderWarning
          : null,
      paperSizeWarning,
      lastValidMinBorder: minBorderData.lastValid,
      clampedHorizontalOffset: offH,
      clampedVerticalOffset: offV,

      // Preview dimensions
      previewScale,
      previewWidth: previewW,
      previewHeight: previewH,
    };
  }, [
    // Include all required dependencies for ESLint compliance
    borders,
    printSize,
    orientedDimensions,
    offsetData,
    easelData,
    bladeData,
    minBorderData,
    paperSizeWarning,
    previewScale,
    state.minBorder,
  ]);

  return {
    calculation,
    previewScale,
  };
};
