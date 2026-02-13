/* ------------------------------------------------------------------ *
   border-calculator.ts
   -------------------------------------------------------------
   Constants adapted from the original border calculator implementation
\* ------------------------------------------------------------------ */

import type {
  AspectRatio,
  BorderPreset,
  PaperSize,
} from '../types/border-calculator';

export const DESKTOP_BREAKPOINT = 768;

// ---- Border slider ----
export const SLIDER_MIN_BORDER = 0;
export const SLIDER_MAX_BORDER = 6;
export const SLIDER_STEP_BORDER = 0.125;
export const BORDER_SLIDER_LABELS = ['0', '1.5', '3', '4.5', '6'];

// ---- Offset sliders ----
export const OFFSET_SLIDER_MIN = -3;
export const OFFSET_SLIDER_MAX = 3;
export const OFFSET_SLIDER_STEP = 0.125;
export const OFFSET_SLIDER_LABELS = ['-3', '-1.5', '0', '1.5', '3'];

// ---- Shared UI dimensions ----
export const COMMON_INPUT_HEIGHT = 40;
export const COMMON_BORDER_RADIUS = 8;

// Raw data replicated from the original project (for easel sizes only)
const rawEaselSizesData = [
  { label: '5x7', width: 7, height: 5 },
  { label: '8x10', width: 10, height: 8 },
  { label: '11x14', width: 14, height: 11 },
  { label: '16x20', width: 20, height: 16 },
  { label: '20x24', width: 24, height: 20 },
] as const;

export const ASPECT_RATIOS: readonly AspectRatio[] = [
  {
    label: '35mm standard frame, 6x9 (3:2)',
    width: 3,
    height: 2,
    value: '3:2',
  },
  {
    label: 'Even borders (match paper)',
    value: 'even-borders',
  },
  { label: 'XPan Pano (65:24)', width: 65, height: 24, value: '65:24' },
  {
    label: '6x4.5/6x8/35mm Half Frame (4:3)',
    width: 4,
    height: 3,
    value: '4:3',
  },
  { label: '6x6/Square (1:1)', width: 1, height: 1, value: '1:1' },
  { label: '6x7', width: 7, height: 6, value: '7:6' },
  { label: '4x5', width: 5, height: 4, value: '5:4' },
  { label: '5x7', width: 7, height: 5, value: '7:5' },
  { label: 'HDTV (16:9)', width: 16, height: 9, value: '16:9' },
  {
    label: 'Academy Ratio (1.37:1)',
    width: 1.37,
    height: 1,
    value: '1.37:1',
  },
  {
    label: 'Widescreen (1.85:1)',
    width: 1.85,
    height: 1,
    value: '1.85:1',
  },
  { label: 'Univisium (2:1)', width: 2, height: 1, value: '2:1' },
  {
    label: 'CinemaScope (2.39:1)',
    width: 2.39,
    height: 1,
    value: '2.39:1',
  },
  {
    label: 'Ultra Panavision (2.76:1)',
    width: 2.76,
    height: 1,
    value: '2.76:1',
  },
  { label: 'Custom Ratio', value: 'custom', width: 0, height: 0 },
];

export const PAPER_SIZES: readonly PaperSize[] = [
  { label: '5x7', width: 5, height: 7, value: '5x7' },
  {
    label: '3⅞x5⅞ (postcard)',
    width: 3.875,
    height: 5.875,
    value: '3.875x5.875',
  },
  { label: '8x10', width: 8, height: 10, value: '8x10' },
  { label: '11x14', width: 11, height: 14, value: '11x14' },
  { label: '16x20', width: 16, height: 20, value: '16x20' },
  { label: '20x24', width: 20, height: 24, value: '20x24' },
  { label: 'Custom Paper Size', value: 'custom', width: 0, height: 0 },
];

export const EASEL_SIZES: readonly PaperSize[] = Object.freeze([
  ...rawEaselSizesData.map((item) => ({
    ...item,
    value: `${item.width}x${item.height}`,
  })),
  { label: 'Custom Paper Size', value: 'custom', width: 0, height: 0 },
]);

// Create maps for quick lookup
export const PAPER_SIZE_MAP = new Map(
  PAPER_SIZES.map((size) => [size.value, size])
);

export const ASPECT_RATIO_MAP = new Map(
  ASPECT_RATIOS.map((ratio) => [ratio.value, ratio])
);

export const EASEL_SIZE_MAP = new Map(
  EASEL_SIZES.map((size) => [size.value, size])
);

export const BLADE_THICKNESS = 15;

/**
 * Generates evenly-spaced slider labels from 0 to maxBorder.
 * Returns 5 labels: 0, 25%, 50%, 75%, 100% of maxBorder.
 * Values are formatted with 1 decimal place, omitting ".0" for whole numbers.
 *
 * @param maxBorder - The maximum border value in inches
 * @returns Array of 5 formatted label strings
 *
 * @example
 * generateBorderSliderLabels(6) // ['0', '1.5', '3', '4.5', '6']
 * generateBorderSliderLabels(4) // ['0', '1', '2', '3', '4']
 */
export function generateBorderSliderLabels(maxBorder: number): string[] {
  const step = maxBorder / 4;
  return [0, step, step * 2, step * 3, maxBorder].map((v) =>
    v === 0 ? '0' : v.toFixed(1).replace(/\.0$/, '')
  );
}

export const DEFAULT_BORDER_PRESETS: BorderPreset[] = [
  {
    id: 'default-8x10',
    name: '35mm on 8x10, 6x9in',
    settings: {
      aspectRatio: '3:2',
      paperSize: '8x10',
      customAspectWidth: 0,
      customAspectHeight: 0,
      customPaperWidth: 0,
      customPaperHeight: 0,
      minBorder: 0.5,
      enableOffset: false,
      ignoreMinBorder: false,
      horizontalOffset: 0,
      verticalOffset: 0,
      showBlades: false,
      showBladeReadings: false,
      isLandscape: true,
      isRatioFlipped: false,
      hasManuallyFlippedPaper: false,
    },
  },
];

// Export everything as a single object for convenience
export default {
  DESKTOP_BREAKPOINT,
  SLIDER_MIN_BORDER,
  SLIDER_MAX_BORDER,
  SLIDER_STEP_BORDER,
  BORDER_SLIDER_LABELS,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_STEP,
  OFFSET_SLIDER_LABELS,
  COMMON_INPUT_HEIGHT,
  COMMON_BORDER_RADIUS,
  ASPECT_RATIOS,
  PAPER_SIZES,
  EASEL_SIZES,
  PAPER_SIZE_MAP,
  ASPECT_RATIO_MAP,
  EASEL_SIZE_MAP,
  BLADE_THICKNESS,
  DEFAULT_BORDER_PRESETS,
};
