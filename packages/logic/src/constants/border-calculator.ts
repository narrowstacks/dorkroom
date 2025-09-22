/* ------------------------------------------------------------------ *
   border-calculator.ts
   -------------------------------------------------------------
   Constants adapted from the original border calculator implementation
\* ------------------------------------------------------------------ */

import type {
  AspectRatio,
  PaperSize,
  BorderPreset,
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

// Raw data replicated from the original project
const rawAspectRatiosData = [
  { label: "35mm standard frame, 6x9 (3:2)", width: 3, height: 2 },
  { label: "XPan Pano (65:24)", width: 65, height: 24 },
  { label: "6x4.5/6x8/35mm Half Frame (4:3)", width: 4, height: 3 },
  { label: "6x6/Square (1:1)", width: 1, height: 1 },
  { label: "6x7", width: 7, height: 6 },
  { label: "4x5", width: 5, height: 4 },
  { label: "5x7", width: 7, height: 5 },
  { label: "HDTV (16:9)", width: 16, height: 9 },
  { label: "Academy Ratio (1.37:1)", width: 1.37, height: 1 },
  { label: "Widescreen (1.85:1)", width: 1.85, height: 1 },
  { label: "Univisium (2:1)", width: 2, height: 1 },
  { label: "CinemaScope (2.39:1)", width: 2.39, height: 1 },
  { label: "Ultra Panavision (2.76:1)", width: 2.76, height: 1 },
] as const;

const rawPaperSizesData = [
  { label: '5x7', width: 5, height: 7 },
  { label: '4x6 (postcard)', width: 4, height: 6 },
  { label: '8x10', width: 8, height: 10 },
  { label: '11x14', width: 11, height: 14 },
  { label: '16x20', width: 16, height: 20 },
  { label: '20x24', width: 20, height: 24 },
] as const;

const rawEaselSizesData = [
  { label: '5x7', width: 7, height: 5 },
  { label: '8x10', width: 10, height: 8 },
  { label: '11x14', width: 14, height: 11 },
  { label: '16x20', width: 20, height: 16 },
  { label: '20x24', width: 24, height: 20 },
] as const;

export const ASPECT_RATIOS: AspectRatio[] = [
  ...rawAspectRatiosData.map((item) => ({
    ...item,
    value: `${item.width}/${item.height}`,
  })),
  { label: 'Custom Ratio', value: 'custom', width: 0, height: 0 },
];

export const PAPER_SIZES: PaperSize[] = [
  ...rawPaperSizesData.map((item) => ({
    ...item,
    value: `${item.width}x${item.height}`,
  })),
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

export const DEFAULT_BORDER_PRESETS: BorderPreset[] = [
  {
    id: 'default-8x10',
    name: 'Standard 8x10',
    settings: {
      aspectRatio: '3/2',
      paperSize: '10x8',
      customAspectWidth: 3,
      customAspectHeight: 2,
      customPaperWidth: 10,
      customPaperHeight: 8,
      minBorder: 0.5,
      enableOffset: false,
      ignoreMinBorder: false,
      horizontalOffset: 0,
      verticalOffset: 0,
      showBlades: true,
      isLandscape: false,
      isRatioFlipped: false,
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
