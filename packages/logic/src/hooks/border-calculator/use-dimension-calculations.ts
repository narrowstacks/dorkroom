/* ------------------------------------------------------------------ *
   use-dimension-calculations.ts
   -------------------------------------------------------------
   Hook for paper size, aspect ratio, and orientation calculations
   -------------------------------------------------------------
   Exports:
     - useDimensionCalculations: Dimension and orientation logic
\* ------------------------------------------------------------------ */

import { useMemo } from 'react';
import {
  PAPER_SIZE_MAP,
  ASPECT_RATIO_MAP,
  EASEL_SIZES,
} from '../../constants/border-calculator';
import type {
  BorderCalculatorState,
  PaperEntry,
  RatioEntry,
  OrientedDimensions,
  MinBorderData,
} from '../../types/border-calculator';

// Pre-calculate max easel dimension for O(1) lookup
const MAX_EASEL_DIMENSION = Math.max(
  ...EASEL_SIZES.flatMap((e) => [e.width, e.height])
);

export const useDimensionCalculations = (state: BorderCalculatorState) => {
  // Optimized paper size calculations with better caching
  const paperEntry = useMemo((): PaperEntry => {
    if (state.paperSize === 'custom') {
      return {
        w: state.lastValidCustomPaperWidth,
        h: state.lastValidCustomPaperHeight,
        custom: true,
      };
    }

    // Use O(1) lookup with fallback
    const p = PAPER_SIZE_MAP.get(state.paperSize);
    return p
      ? { w: p.width, h: p.height, custom: false }
      : { w: 8, h: 10, custom: false }; // fallback to 8x10
  }, [
    state.paperSize,
    state.lastValidCustomPaperWidth,
    state.lastValidCustomPaperHeight,
  ]);

  // Optimized paper size warning with early exit
  const paperSizeWarning = useMemo(() => {
    if (!paperEntry.custom) return null;

    const exceedsMax =
      paperEntry.w > MAX_EASEL_DIMENSION || paperEntry.h > MAX_EASEL_DIMENSION;
    return exceedsMax
      ? `Custom paper (${paperEntry.w}×${paperEntry.h}) exceeds largest standard easel (20×24").`
      : null;
  }, [paperEntry.custom, paperEntry.w, paperEntry.h]);

  // Optimized aspect ratio calculations
  const ratioEntry = useMemo((): RatioEntry => {
    if (state.aspectRatio === 'custom') {
      return {
        w: state.lastValidCustomAspectWidth,
        h: state.lastValidCustomAspectHeight,
      };
    }

    // Use O(1) lookup with safer fallback
    const r = ASPECT_RATIO_MAP.get(state.aspectRatio);
    return r ? { w: r.width || 1, h: r.height || 1 } : { w: 3, h: 2 }; // fallback to 3:2
  }, [
    state.aspectRatio,
    state.lastValidCustomAspectWidth,
    state.lastValidCustomAspectHeight,
  ]);

  // Optimized oriented dimensions with direct property access
  const orientedDimensions = useMemo((): OrientedDimensions => {
    const orientedPaper = state.isLandscape
      ? { w: paperEntry.h, h: paperEntry.w }
      : { w: paperEntry.w, h: paperEntry.h };

    const orientedRatio = state.isRatioFlipped
      ? { w: ratioEntry.h, h: ratioEntry.w }
      : { w: ratioEntry.w, h: ratioEntry.h };

    return { orientedPaper, orientedRatio };
  }, [
    paperEntry.w,
    paperEntry.h,
    ratioEntry.w,
    ratioEntry.h,
    state.isLandscape,
    state.isRatioFlipped,
  ]);

  // Optimized minimum border validation with direct calculations
  const minBorderData = useMemo((): MinBorderData => {
    const { orientedPaper } = orientedDimensions;
    const paperW = orientedPaper.w;
    const paperH = orientedPaper.h;
    const maxBorder = (paperW < paperH ? paperW : paperH) / 2; // More efficient than Math.min

    const inputMinBorder = state.minBorder;
    const lastValidMinBorder = state.lastValidMinBorder;

    // Early validation with optimized logic
    if (inputMinBorder < 0) {
      return {
        minBorder: lastValidMinBorder,
        minBorderWarning: `Border cannot be negative; using ${lastValidMinBorder}.`,
        lastValid: lastValidMinBorder,
      };
    }

    if (inputMinBorder >= maxBorder && maxBorder > 0) {
      return {
        minBorder: lastValidMinBorder,
        minBorderWarning: `Minimum border too large; using ${lastValidMinBorder}.`,
        lastValid: lastValidMinBorder,
      };
    }

    // Valid input
    return {
      minBorder: inputMinBorder,
      minBorderWarning: null,
      lastValid: inputMinBorder,
    };
  }, [orientedDimensions, state.minBorder, state.lastValidMinBorder]);

  return {
    paperEntry,
    paperSizeWarning,
    ratioEntry,
    orientedDimensions,
    minBorderData,
  };
};
