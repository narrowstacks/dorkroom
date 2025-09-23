/* ------------------------------------------------------------------ *\
   types.ts
   -------------------------------------------------------------
   Shared types and interfaces for border calculator hooks
\* ------------------------------------------------------------------ */

// Main state interface
export interface BorderCalculatorState {
  /* inputs */
  aspectRatio: string;
  paperSize: string;
  customAspectWidth: number;
  customAspectHeight: number;
  customPaperWidth: number;
  customPaperHeight: number;
  minBorder: number;
  enableOffset: boolean;
  ignoreMinBorder: boolean;
  horizontalOffset: number;
  verticalOffset: number;
  showBlades: boolean;
  isLandscape: boolean;
  isRatioFlipped: boolean;

  /* warnings & last‑valid tracking */
  offsetWarning: string | null;
  bladeWarning: string | null;
  minBorderWarning: string | null;
  paperSizeWarning: string | null;
  lastValidMinBorder: number;

  /* image‑related */
  selectedImageUri: string | null;
  imageDimensions: { width: number; height: number };
  isCropping: boolean;
  cropOffset: { x: number; y: number };
  cropScale: number;

  /* "last valid" for custom free‑text inputs */
  lastValidCustomAspectWidth: number;
  lastValidCustomAspectHeight: number;
  lastValidCustomPaperWidth: number;
  lastValidCustomPaperHeight: number;
}

// Reducer actions
type SetFieldAction<K extends keyof BorderCalculatorState> = {
  type: 'SET_FIELD';
  key: K;
  value: BorderCalculatorState[K];
};

export type BorderCalculatorAction =
  | SetFieldAction<keyof BorderCalculatorState>
  | { type: 'SET_PAPER_SIZE'; value: string }
  | { type: 'SET_ASPECT_RATIO'; value: string }
  | {
      type: 'SET_IMAGE_FIELD';
      key: Exclude<
        keyof BorderCalculatorState,
        'imageDimensions' | 'cropOffset'
      >;
      value: any;
    }
  | { type: 'SET_IMAGE_DIMENSIONS'; value: { width: number; height: number } }
  | { type: 'SET_CROP_OFFSET'; value: { x: number; y: number } }
  | { type: 'RESET' }
  | {
      type: 'INTERNAL_UPDATE';
      payload: Partial<
        Pick<
          BorderCalculatorState,
          | 'offsetWarning'
          | 'bladeWarning'
          | 'minBorderWarning'
          | 'paperSizeWarning'
          | 'lastValidMinBorder'
        >
      >;
    }
  | {
      type: 'SET_IMAGE_CROP_DATA';
      payload: Partial<
        Pick<
          BorderCalculatorState,
          | 'selectedImageUri'
          | 'imageDimensions'
          | 'isCropping'
          | 'cropOffset'
          | 'cropScale'
        >
      >;
    }
  | {
      type: 'BATCH_UPDATE';
      payload: Partial<BorderCalculatorState>;
    };

// Dimension calculation types
export interface PaperEntry {
  w: number;
  h: number;
  custom: boolean;
}

export interface RatioEntry {
  w: number;
  h: number;
}

export interface OrientedDimensions {
  orientedPaper: { w: number; h: number };
  orientedRatio: { w: number; h: number };
}

export interface MinBorderData {
  minBorder: number;
  minBorderWarning: string | null;
  lastValid: number;
}

// Geometry calculation types
export interface PrintSize {
  printW: number;
  printH: number;
}

export interface OffsetData {
  halfW: number;
  halfH: number;
  h: number;
  v: number;
  warning: string | null;
}

export interface Borders {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface EaselData {
  easelSize: { width: number; height: number };
  effectiveSlot: { width: number; height: number };
  isNonStandardPaperSize: boolean;
}

export interface PaperShift {
  spX: number;
  spY: number;
}

export interface BladeData {
  blades: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  bladeWarning: string | null;
}

// Warning system types
export interface WarningTimeouts {
  offset: ReturnType<typeof setTimeout> | null;
  blade: ReturnType<typeof setTimeout> | null;
  minBorder: ReturnType<typeof setTimeout> | null;
  paperSize: ReturnType<typeof setTimeout> | null;
}

// Constants
export const DEFAULT_MIN_BORDER = 0.5;
export const DEFAULT_CUSTOM_PAPER_WIDTH = 13;
export const DEFAULT_CUSTOM_PAPER_HEIGHT = 10;
export const DEFAULT_CUSTOM_ASPECT_WIDTH = 2;
export const DEFAULT_CUSTOM_ASPECT_HEIGHT = 3;
export const CALC_STORAGE_KEY = 'borderCalculatorState';
