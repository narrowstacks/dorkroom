/* ------------------------------------------------------------------ *\
   Pure geometry helpers
\* ------------------------------------------------------------------ */

import { EASEL_SIZES, BLADE_THICKNESS } from '@/constants/border';
import {
  CALCULATION_CONSTANTS,
  DERIVED_CONSTANTS,
} from '@/constants/calculations';
import { roundToStandardPrecision, createMemoKey } from '@/utils/precision';

export type Size = { width: number; height: number };

/* ---------- constants ------------------------------------------- */

const { BASE_PAPER_AREA } = DERIVED_CONSTANTS;
const {
  STEP,
  SEARCH_SPAN,
  SNAP,
  EPSILON: EPS,
} = CALCULATION_CONSTANTS.BORDER_OPTIMIZATION;
const { MAX_MEMO_SIZE } = CALCULATION_CONSTANTS.CACHE;
const { MAX_SCALE_FACTOR } = CALCULATION_CONSTANTS.PAPER;

/* ---------- helpers --------------------------------------------- */

export const orient = (w: number, h: number, landscape: boolean): Size =>
  landscape ? { width: h, height: w } : { width: w, height: h };

// Removed - replaced with optimized lookup table above

/* ---------- memoised centring ----------------------------------- */

// Pre-sort EASEL_SIZES by area for optimal performance
const SORTED_EASEL_SIZES = [...EASEL_SIZES].sort(
  (a, b) => a.width * a.height - b.width * b.height
);

// Optimized memoization with better memory management and performance
const fitMemo = new Map<string, ReturnType<typeof computeFit>>();

// Pre-computed exact match lookup for O(1) performance
const exactMatchLookup = new Set(
  EASEL_SIZES.flatMap((e) => [
    `${e.width}x${e.height}`,
    `${e.height}x${e.width}`,
  ])
);

const isExactMatchOptimized = (paperW: number, paperH: number): boolean => {
  return exactMatchLookup.has(`${paperW}x${paperH}`);
};

function computeFit(paperW: number, paperH: number, landscape: boolean) {
  const paper = orient(paperW, paperH, landscape);
  const isNonStandard = !isExactMatchOptimized(paperW, paperH);

  // Early return for exact matches - no need to search
  if (!isNonStandard) {
    // For exact matches, find the actual easel that matches this paper size
    const matchingEasel = EASEL_SIZES.find(
      (e) =>
        (e.width === paper.width && e.height === paper.height) ||
        (e.height === paper.width && e.width === paper.height)
    );

    if (matchingEasel) {
      const easelSize = {
        width: matchingEasel.width,
        height: matchingEasel.height,
      };
      return {
        easelSize: easelSize,
        effectiveSlot: easelSize,
        isNonStandardPaperSize: false,
      };
    }
  }

  // Binary search optimization for finding best fit
  let bestFit = null;
  let minWaste = Infinity;

  for (const easel of SORTED_EASEL_SIZES) {
    const canFitNormal =
      easel.width >= paper.width && easel.height >= paper.height;
    const canFitRotated =
      easel.height >= paper.width && easel.width >= paper.height;

    if (canFitNormal || canFitRotated) {
      const waste = easel.width * easel.height - paper.width * paper.height;
      if (waste < minWaste) {
        minWaste = waste;
        bestFit = {
          easel,
          slot: canFitNormal
            ? { width: easel.width, height: easel.height }
            : { width: easel.height, height: easel.width },
        };
        // Early exit for perfect fit
        if (waste === 0) break;
      }
    }
  }

  if (!bestFit) {
    return {
      easelSize: paper,
      effectiveSlot: paper,
      isNonStandardPaperSize: true,
    };
  }

  return {
    easelSize: { width: bestFit.easel.width, height: bestFit.easel.height },
    effectiveSlot: bestFit.slot,
    isNonStandardPaperSize: true,
  };
}

export const findCenteringOffsets = (
  paperW: number,
  paperH: number,
  landscape: boolean
) => {
  // Use integer keys for better hash performance
  const key = createMemoKey(paperW, paperH, landscape);
  let result = fitMemo.get(key);

  if (!result) {
    result = computeFit(paperW, paperH, landscape);

    // LRU-style cache management for better performance
    if (fitMemo.size >= MAX_MEMO_SIZE) {
      const firstKey = fitMemo.keys().next().value!;
      fitMemo.delete(firstKey);
    }

    fitMemo.set(key, result);
  }

  return result;
};

/* ---------- blade thickness ------------------------------------- */

export const calculateBladeThickness = (paperW: number, paperH: number) => {
  if (paperW <= 0 || paperH <= 0) return BLADE_THICKNESS;

  const area = paperW * paperH;
  const scale = Math.min(
    BASE_PAPER_AREA / Math.max(area, EPS),
    MAX_SCALE_FACTOR
  );
  return Math.round(BLADE_THICKNESS * scale);
};

/* ---------- internal snap‑score helper -------------------------- */

const snapScore = (b: number) => {
  const r = b % SNAP;
  return Math.min(r, SNAP - r);
};

/* ---------- minimum‑border optimiser ---------------------------- */

const computeBorders = (
  paperW: number,
  paperH: number,
  ratio: number,
  mb: number
) => {
  const availW = paperW - 2 * mb;
  const availH = paperH - 2 * mb;
  if (availW <= 0 || availH <= 0) return null;

  const [printW, printH] =
    availW / availH > ratio
      ? [availH * ratio, availH]
      : [availW, availW / ratio];

  const bW = (paperW - printW) / 2;
  const bH = (paperH - printH) / 2;

  return [bW, bW, bH, bH] as const;
};

// Optimized border calculation with better algorithm
export const calculateOptimalMinBorder = (
  paperW: number,
  paperH: number,
  ratioW: number,
  ratioH: number,
  start: number
) => {
  if (ratioH === 0) return start;
  const ratio = ratioW / ratioH;

  const lo = Math.max(0.01, start - SEARCH_SPAN);
  const hi = start + SEARCH_SPAN;

  let best = start;
  let bestScore = Infinity;

  // Adaptive step size for better performance
  const adaptiveStep = Math.max(
    STEP,
    (hi - lo) / CALCULATION_CONSTANTS.BORDER_OPTIMIZATION.ADAPTIVE_STEP_DIVISOR
  );

  for (let mb = lo; mb <= hi; mb += adaptiveStep) {
    const borders = computeBorders(paperW, paperH, ratio, mb);
    if (!borders) continue;

    // Optimized score calculation - exit early if perfect
    let score = 0;
    for (const border of borders) {
      const remainder = border % SNAP;
      score += Math.min(remainder, SNAP - remainder);
      if (score >= bestScore) break; // Early exit if already worse
    }

    if (score < bestScore - EPS) {
      bestScore = score;
      best = mb;
      if (bestScore < EPS) break; // Perfect snap found
    }
  }

  return roundToStandardPrecision(best); // More efficient than toFixed
};

/* ---------- other helpers (unchanged) --------------------------- */

// Optimized print size calculation with early validation
export const computePrintSize = (
  w: number,
  h: number,
  rw: number,
  rh: number,
  mb: number
) => {
  // Early validation to avoid unnecessary calculations
  if (rh <= 0 || w <= 0 || h <= 0 || mb < 0) {
    return { printW: 0, printH: 0 };
  }

  const availW = w - 2 * mb;
  const availH = h - 2 * mb;

  if (availW <= 0 || availH <= 0) {
    return { printW: 0, printH: 0 };
  }

  const ratio = rw / rh;
  const availRatio = availW / availH;

  // Single comparison with cached ratio
  if (availRatio > ratio) {
    const printH = availH;
    return { printW: printH * ratio, printH };
  } else {
    const printW = availW;
    return { printW, printH: printW / ratio };
  }
};

export const clampOffsets = (
  paperW: number,
  paperH: number,
  printW: number,
  printH: number,
  mb: number,
  offH: number,
  offV: number,
  ignoreMB: boolean
) => {
  const halfW = (paperW - printW) / 2;
  const halfH = (paperH - printH) / 2;
  const maxH = ignoreMB ? halfW : Math.min(halfW - mb, halfW);
  const maxV = ignoreMB ? halfH : Math.min(halfH - mb, halfH);

  const h = Math.max(-maxH, Math.min(maxH, offH));
  const v = Math.max(-maxV, Math.min(maxV, offV));

  let warning: string | null = null;
  if (h !== offH || v !== offV)
    warning = ignoreMB
      ? 'Offset adjusted to keep print on paper.'
      : 'Offset adjusted to honour min‑border.';

  return { h, v, halfW, halfH, warning };
};

export const bordersFromGaps = (
  halfW: number,
  halfH: number,
  h: number,
  v: number
) => ({
  left: halfW - h,
  right: halfW + h,
  bottom: halfH - v,
  top: halfH + v,
});

export const bladeReadings = (
  printW: number,
  printH: number,
  sX: number,
  sY: number
) => ({
  left: printW - 2 * sX,
  right: printW + 2 * sX,
  top: printH - 2 * sY,
  bottom: printH + 2 * sY,
});
