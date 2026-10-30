/* ------------------------------------------------------------------ *
   border-layout.ts
   -------------------------------------------------------------
   The border calculator's geometry pipeline as one pure function:
   orient -> min border -> print size -> clamp offsets -> blades.
   -------------------------------------------------------------
   Exports:
     - computeBorderLayout: form values -> complete BorderCalculation
     - computePreviewScale: oriented paper + viewport -> preview scale
\* ------------------------------------------------------------------ */

import {
  ASPECT_RATIO_MAP,
  EASEL_SIZE_MAP,
  EASEL_SIZES,
  PAPER_SIZE_MAP,
} from '../constants/border-calculator';
import { isMobileWidth } from '../constants/breakpoints';
import type {
  BladeData,
  BorderCalculation,
  BorderCalculatorState,
  MinBorderData,
  OrientedDimensions,
  PaperEntry,
  RatioEntry,
} from '../types/border-calculator';
import {
  bladeReadings,
  bordersFromGaps,
  calculateBladeThickness,
  clampOffsets,
  computePrintSize,
  findCenteringOffsets,
  formatPaperSizeWarning,
} from './border-calculations';
import type { MeasurementUnit } from './unit-conversion';

// Pre-calculate max easel dimension for O(1) lookup
const MAX_EASEL_DIMENSION = Math.max(
  ...EASEL_SIZES.flatMap((e) => [e.width, e.height])
);

/**
 * The calculator state fields the layout reads. Any object carrying them,
 * such as the full calculator state, can be passed in.
 *
 * @public
 */
export type BorderLayoutInput = Pick<
  BorderCalculatorState,
  | 'paperSize'
  | 'lastValidCustomPaperWidth'
  | 'lastValidCustomPaperHeight'
  | 'aspectRatio'
  | 'lastValidCustomAspectWidth'
  | 'lastValidCustomAspectHeight'
  | 'isLandscape'
  | 'isRatioFlipped'
  | 'minBorder'
  | 'lastValidMinBorder'
  | 'enableOffset'
  | 'horizontalOffset'
  | 'verticalOffset'
  | 'ignoreMinBorder'
>;

/**
 * Window size in pixels, used only to size the on-screen preview.
 *
 * @public
 */
export interface BorderLayoutViewport {
  width: number;
  height: number;
}

/**
 * @public
 */
export interface BorderLayoutOptions {
  /** Window size the preview is fitted to (e.g. `useWindowDimensions()`). */
  viewport: BorderLayoutViewport;
  /** Unit the paper-size warning is written in. Defaults to imperial. */
  unit?: MeasurementUnit;
}

/**
 * Result of {@link computeBorderLayout}.
 *
 * @public
 */
export interface BorderLayout {
  /** Complete geometry, blade readings, preview size and warnings. */
  calculation: BorderCalculation;
  /** Paper and aspect ratio with orientation applied, in inches. */
  orientedDimensions: OrientedDimensions;
}

/**
 * Scale factor (pixels per inch) that fits the oriented paper into the
 * preview box for the given window size. On the web this is the only place
 * the preview is sized: `AnimatedPreview` renders `previewWidth` x
 * `previewHeight` as is. iOS reaches it through `useBorderCalculator` but
 * ignores `previewWidth`, `previewHeight` and `previewScale`, sizing its
 * preview natively in `apps/mobile/src/components/border/border-preview.tsx`.
 *
 * The box is 400px wide on desktop-layout windows and `min(320, width - 80)`
 * on mobile-layout ones (`isMobileWidth`, 768px and below) so the preview
 * fits its card. It is 400px tall above 800px of window height and 50% of the
 * height at 800px and below.
 *
 * @param paperWidth - Oriented paper width in inches
 * @param paperHeight - Oriented paper height in inches
 * @param viewport - Window size in pixels
 * @returns Preview scale, or 1 when either paper dimension is zero
 *
 * @public
 */
export function computePreviewScale(
  paperWidth: number,
  paperHeight: number,
  viewport: BorderLayoutViewport
): number {
  if (!paperWidth || !paperHeight) return 1;

  // The mobile cap is always the tighter of the two, so the old "90% of the
  // width below 445px" rule could never win and is gone.
  const maxW = isMobileWidth(viewport.width)
    ? Math.min(320, viewport.width - 80)
    : 400;
  const maxH = viewport.height > 800 ? 400 : viewport.height * 0.5;

  const scaleW = maxW / paperWidth;
  const scaleH = maxH / paperHeight;

  return scaleW < scaleH ? scaleW : scaleH;
}

function resolvePaperEntry(values: BorderLayoutInput): PaperEntry {
  if (values.paperSize === 'custom') {
    return {
      w: values.lastValidCustomPaperWidth,
      h: values.lastValidCustomPaperHeight,
      custom: true,
    };
  }

  const p = PAPER_SIZE_MAP.get(values.paperSize);
  return p
    ? { w: p.width, h: p.height, custom: false }
    : { w: 8, h: 10, custom: false }; // fallback to 8x10
}

function resolveRatioEntry(
  values: BorderLayoutInput,
  paperEntry: PaperEntry
): RatioEntry {
  if (values.aspectRatio === 'even-borders') {
    const safeWidth = paperEntry.w > 0 ? paperEntry.w : 1;
    const safeHeight = paperEntry.h > 0 ? paperEntry.h : 1;
    return { w: safeWidth, h: safeHeight };
  }

  if (values.aspectRatio === 'custom') {
    return {
      w: values.lastValidCustomAspectWidth,
      h: values.lastValidCustomAspectHeight,
    };
  }

  const r = ASPECT_RATIO_MAP.get(values.aspectRatio);
  return r ? { w: r.width || 1, h: r.height || 1 } : { w: 3, h: 2 }; // fallback to 3:2
}

function orient(
  values: BorderLayoutInput,
  paperEntry: PaperEntry,
  ratioEntry: RatioEntry
): OrientedDimensions {
  const orientedPaper = values.isLandscape
    ? { w: paperEntry.h, h: paperEntry.w }
    : { w: paperEntry.w, h: paperEntry.h };

  const orientedRatio =
    values.aspectRatio === 'even-borders'
      ? { w: orientedPaper.w, h: orientedPaper.h }
      : values.isRatioFlipped
        ? { w: ratioEntry.h, h: ratioEntry.w }
        : { w: ratioEntry.w, h: ratioEntry.h };

  return { orientedPaper, orientedRatio };
}

function validateMinBorder(
  values: BorderLayoutInput,
  orientedPaper: OrientedDimensions['orientedPaper']
): MinBorderData {
  const maxBorder =
    (orientedPaper.w < orientedPaper.h ? orientedPaper.w : orientedPaper.h) / 2;
  const inputMinBorder = values.minBorder;
  const lastValidMinBorder = values.lastValidMinBorder;

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

  return {
    minBorder: inputMinBorder,
    minBorderWarning: null,
    lastValid: inputMinBorder,
  };
}

function computeBladeData(
  printW: number,
  printH: number,
  shiftX: number,
  shiftY: number
): BladeData {
  const blades = bladeReadings(printW, printH, shiftX, shiftY);

  let bladeWarning: string | null = null;
  const values = Object.values(blades);
  if (values.some((v) => v < 0))
    bladeWarning = 'Negative blade reading – use opposite side of scale.';
  if (values.some((v) => Math.abs(v) < 3 && v !== 0))
    bladeWarning =
      (bladeWarning ? `${bladeWarning}\n` : '') +
      'Many easels have no markings below about 3 in.';

  return { blades, bladeWarning };
}

/**
 * Computes the complete border calculator layout from its form values: paper
 * and ratio lookup, orientation, minimum-border validation (falling back to
 * the last valid value), print size, offset clamping, easel fitting, blade
 * readings, preview size and every warning.
 *
 * Pure: callers that render the result wrap it in their own `useMemo`.
 *
 * @param values - Calculator state (any object carrying the input fields)
 * @param options - Preview viewport and warning unit
 * @returns The calculation plus the oriented paper and ratio
 *
 * @example
 * ```typescript
 * const { width, height } = useWindowDimensions();
 * const { calculation } = useMemo(
 *   () => computeBorderLayout(values, { viewport: { width, height } }),
 *   [values, width, height]
 * );
 * ```
 *
 * @public
 */
export function computeBorderLayout(
  values: BorderLayoutInput,
  { viewport, unit = 'imperial' }: BorderLayoutOptions
): BorderLayout {
  // Paper and paper-size warning
  const paperEntry = resolvePaperEntry(values);
  const paperSizeWarning =
    paperEntry.custom &&
    (paperEntry.w > MAX_EASEL_DIMENSION || paperEntry.h > MAX_EASEL_DIMENSION)
      ? formatPaperSizeWarning(paperEntry.w, paperEntry.h, unit)
      : null;

  // Orientation and minimum border
  const orientedDimensions = orient(
    values,
    paperEntry,
    resolveRatioEntry(values, paperEntry)
  );
  const { orientedPaper, orientedRatio } = orientedDimensions;
  const minBorderData = validateMinBorder(values, orientedPaper);
  const { minBorder } = minBorderData;

  // Print size and offsets
  const { printW, printH } = computePrintSize(
    orientedPaper.w,
    orientedPaper.h,
    orientedRatio.w,
    orientedRatio.h,
    minBorder
  );
  const {
    halfW,
    halfH,
    h: offH,
    v: offV,
    warning: offsetWarning,
  } = clampOffsets(
    orientedPaper.w,
    orientedPaper.h,
    printW,
    printH,
    minBorder,
    values.enableOffset ? values.horizontalOffset : 0,
    values.enableOffset ? values.verticalOffset : 0,
    values.ignoreMinBorder
  );
  const borders = bordersFromGaps(halfW, halfH, offH, offV);

  // Easel fitting and blade readings
  const { easelSize, effectiveSlot, isNonStandardPaperSize } =
    findCenteringOffsets(paperEntry.w, paperEntry.h, values.isLandscape);
  const spX = isNonStandardPaperSize
    ? (orientedPaper.w - effectiveSlot.width) / 2
    : 0;
  const spY = isNonStandardPaperSize
    ? (orientedPaper.h - effectiveSlot.height) / 2
    : 0;
  const { blades, bladeWarning } = computeBladeData(
    printW,
    printH,
    spX + offH,
    spY + offV
  );

  // Assembly
  const paperW = orientedPaper.w;
  const paperH = orientedPaper.h;
  const invPaperW = paperW ? 100 / paperW : 0;
  const invPaperH = paperH ? 100 / paperH : 0;
  const previewScale = computePreviewScale(paperW, paperH, viewport);

  const easelKey = `${easelSize.height}×${easelSize.width}`;
  const easelSizeLabel = EASEL_SIZE_MAP.get(easelKey)?.label ?? easelKey;

  const calculation: BorderCalculation = {
    leftBorder: borders.left,
    rightBorder: borders.right,
    topBorder: borders.top,
    bottomBorder: borders.bottom,

    printWidth: printW,
    printHeight: printH,
    paperWidth: paperW,
    paperHeight: paperH,

    printWidthPercent: printW * invPaperW,
    printHeightPercent: printH * invPaperH,
    leftBorderPercent: borders.left * invPaperW,
    rightBorderPercent: borders.right * invPaperW,
    topBorderPercent: borders.top * invPaperH,
    bottomBorderPercent: borders.bottom * invPaperH,

    leftBladeReading: blades.left,
    rightBladeReading: blades.right,
    topBladeReading: blades.top,
    bottomBladeReading: blades.bottom,
    bladeThickness: calculateBladeThickness(paperW, paperH),

    isNonStandardPaperSize: isNonStandardPaperSize && !paperSizeWarning,
    easelSize,
    easelSizeLabel,

    offsetWarning,
    bladeWarning,
    minBorderWarning:
      minBorder !== values.minBorder ? minBorderData.minBorderWarning : null,
    paperSizeWarning,
    lastValidMinBorder: minBorderData.lastValid,
    clampedHorizontalOffset: offH,
    clampedVerticalOffset: offV,

    previewScale,
    previewWidth: paperW * previewScale,
    previewHeight: paperH * previewScale,
  };

  return { calculation, orientedDimensions };
}
