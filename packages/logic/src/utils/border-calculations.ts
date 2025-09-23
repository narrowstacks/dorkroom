/* ------------------------------------------------------------------ *
   border-calculations.ts
   -------------------------------------------------------------
   Geometry helpers adapted from the original border calculator
\* ------------------------------------------------------------------ */

import { EASEL_SIZES, BLADE_THICKNESS } from '../constants/border-calculator';
import {
  CALCULATION_CONSTANTS,
  DERIVED_CONSTANTS,
} from '../constants/calculations';
import { roundToStandardPrecision, createMemoKey } from './precision';

const { BORDER_OPTIMIZATION, CACHE, PAPER } = CALCULATION_CONSTANTS;

/* ------------------------------------------------------------------ *
   Easel fitting helpers
 * ------------------------------------------------------------------ */

const SORTED_EASEL_SIZES = [...EASEL_SIZES].sort(
  (a, b) => a.width * a.height - b.width * b.height
);

const exactMatchLookup = new Set(
  EASEL_SIZES.flatMap((e) => [
    `${e.width}x${e.height}`,
    `${e.height}x${e.width}`,
  ])
);

const fitMemo = new Map<string, ReturnType<typeof computeFit>>();

function computeFit(paperW: number, paperH: number, landscape: boolean) {
  const oriented = landscape
    ? { width: paperH, height: paperW }
    : { width: paperW, height: paperH };
  const isNonStandard = !exactMatchLookup.has(`${paperW}x${paperH}`);

  if (!isNonStandard) {
    const easel = EASEL_SIZES.find(
      (e) =>
        (e.width === oriented.width && e.height === oriented.height) ||
        (e.height === oriented.width && e.width === oriented.height)
    );

    if (easel) {
      const easelSize = { width: easel.width, height: easel.height };
      return {
        easelSize,
        effectiveSlot: easelSize,
        isNonStandardPaperSize: false,
      } as const;
    }
  }

  let bestFit: {
    easel: { width: number; height: number };
    slot: { width: number; height: number };
  } | null = null;
  let minWaste = Infinity;

  for (const easel of SORTED_EASEL_SIZES) {
    const fits =
      easel.width >= oriented.width && easel.height >= oriented.height;
    const fitsRotated =
      easel.height >= oriented.width && easel.width >= oriented.height;

    if (!fits && !fitsRotated) continue;

    const waste = easel.width * easel.height - oriented.width * oriented.height;
    if (waste < minWaste) {
      minWaste = waste;
      bestFit = {
        easel,
        slot: fits
          ? { width: easel.width, height: easel.height }
          : { width: easel.height, height: easel.width },
      };
      if (waste === 0) break;
    }
  }

  if (!bestFit) {
    return {
      easelSize: oriented,
      effectiveSlot: oriented,
      isNonStandardPaperSize: true,
    } as const;
  }

  return {
    easelSize: { width: bestFit.easel.width, height: bestFit.easel.height },
    effectiveSlot: bestFit.slot,
    isNonStandardPaperSize: true,
  } as const;
}

export const findCenteringOffsets = (
  paperW: number,
  paperH: number,
  landscape: boolean
) => {
  const key = createMemoKey(paperW, paperH, landscape);
  let cached = fitMemo.get(key);

  if (!cached) {
    cached = computeFit(paperW, paperH, landscape);
    if (fitMemo.size >= CACHE.MAX_MEMO_SIZE) {
      const firstKey = fitMemo.keys().next().value;
      if (firstKey) fitMemo.delete(firstKey);
    }
    fitMemo.set(key, cached);
  }

  return cached;
};

/* ------------------------------------------------------------------ *
   Blade thickness
 * ------------------------------------------------------------------ */

export const calculateBladeThickness = (paperW: number, paperH: number) => {
  if (paperW <= 0 || paperH <= 0) return BLADE_THICKNESS;

  const area = paperW * paperH;
  const scale = Math.min(
    DERIVED_CONSTANTS.BASE_PAPER_AREA /
      Math.max(area, BORDER_OPTIMIZATION.EPSILON),
    PAPER.MAX_SCALE_FACTOR
  );

  return Math.round(BLADE_THICKNESS * scale);
};

/* ------------------------------------------------------------------ *
   Border optimisation helpers
 * ------------------------------------------------------------------ */

const computeBorders = (
  paperW: number,
  paperH: number,
  ratio: number,
  minBorder: number
) => {
  const availableW = paperW - 2 * minBorder;
  const availableH = paperH - 2 * minBorder;

  if (availableW <= 0 || availableH <= 0) return null;

  const [printW, printH] =
    availableW / availableH > ratio
      ? [availableH * ratio, availableH]
      : [availableW, availableW / ratio];

  const borderW = (paperW - printW) / 2;
  const borderH = (paperH - printH) / 2;

  return [borderW, borderW, borderH, borderH] as const;
};

export const calculateOptimalMinBorder = (
  paperW: number,
  paperH: number,
  ratioW: number,
  ratioH: number,
  start: number
) => {
  if (ratioH === 0) return start;

  const ratio = ratioW / ratioH;
  const lower = Math.max(0.01, start - BORDER_OPTIMIZATION.SEARCH_SPAN);
  const upper = start + BORDER_OPTIMIZATION.SEARCH_SPAN;
  let best = start;
  let bestScore = Infinity;

  const adaptiveStep = Math.max(
    BORDER_OPTIMIZATION.STEP,
    (upper - lower) / BORDER_OPTIMIZATION.ADAPTIVE_STEP_DIVISOR
  );

  for (let candidate = lower; candidate <= upper; candidate += adaptiveStep) {
    const borders = computeBorders(paperW, paperH, ratio, candidate);
    if (!borders) continue;

    let score = 0;
    for (const border of borders) {
      const remainder = border % BORDER_OPTIMIZATION.SNAP;
      score += Math.min(remainder, BORDER_OPTIMIZATION.SNAP - remainder);
      if (score >= bestScore) break;
    }

    if (score < bestScore - BORDER_OPTIMIZATION.EPSILON) {
      bestScore = score;
      best = candidate;
      if (bestScore < BORDER_OPTIMIZATION.EPSILON) break;
    }
  }

  return roundToStandardPrecision(best);
};

/* ------------------------------------------------------------------ *
   Geometry helpers consumed by hooks
 * ------------------------------------------------------------------ */

export const computePrintSize = (
  paperW: number,
  paperH: number,
  ratioW: number,
  ratioH: number,
  minBorder: number
) => {
  if (ratioH <= 0 || paperW <= 0 || paperH <= 0 || minBorder < 0) {
    return { printW: 0, printH: 0 };
  }

  const availableW = paperW - 2 * minBorder;
  const availableH = paperH - 2 * minBorder;

  if (availableW <= 0 || availableH <= 0) {
    return { printW: 0, printH: 0 };
  }

  const targetRatio = ratioW / ratioH;
  const availableRatio = availableW / availableH;

  if (availableRatio > targetRatio) {
    const printH = availableH;
    return { printW: printH * targetRatio, printH };
  }

  const printW = availableW;
  return { printW, printH: printW / targetRatio };
};

export const clampOffsets = (
  paperW: number,
  paperH: number,
  printW: number,
  printH: number,
  minBorder: number,
  horizontalOffset: number,
  verticalOffset: number,
  ignoreMinBorder: boolean
) => {
  const halfW = (paperW - printW) / 2;
  const halfH = (paperH - printH) / 2;
  const maxH = ignoreMinBorder ? halfW : Math.min(halfW - minBorder, halfW);
  const maxV = ignoreMinBorder ? halfH : Math.min(halfH - minBorder, halfH);

  const clampedH = Math.max(-maxH, Math.min(maxH, horizontalOffset));
  const clampedV = Math.max(-maxV, Math.min(maxV, verticalOffset));

  let warning: string | null = null;
  if (clampedH !== horizontalOffset || clampedV !== verticalOffset) {
    warning = ignoreMinBorder
      ? 'Offset adjusted to keep print on paper.'
      : 'Offset adjusted to honour min-border.';
  }

  return { halfW, halfH, h: clampedH, v: clampedV, warning };
};

export const bordersFromGaps = (
  halfW: number,
  halfH: number,
  offsetH: number,
  offsetV: number
) => ({
  left: halfW - offsetH,
  right: halfW + offsetH,
  bottom: halfH - offsetV,
  top: halfH + offsetV,
});

export const bladeReadings = (
  printW: number,
  printH: number,
  shiftX: number,
  shiftY: number
) => ({
  left: printW - 2 * shiftX,
  right: printW + 2 * shiftX,
  top: printH - 2 * shiftY,
  bottom: printH + 2 * shiftY,
});

export const validatePrintFits = (
  paperW: number,
  paperH: number,
  printW: number,
  printH: number,
  offsetH: number,
  offsetV: number
) => {
  const halfW = (paperW - printW) / 2;
  const halfH = (paperH - printH) / 2;

  const left = halfW - offsetH;
  const right = halfW + offsetH;
  const top = halfH - offsetV;
  const bottom = halfH + offsetV;

  return left >= 0 && right >= 0 && top >= 0 && bottom >= 0;
};
