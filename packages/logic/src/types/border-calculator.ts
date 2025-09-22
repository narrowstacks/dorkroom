/* ------------------------------------------------------------------ *
   border-calculator.ts
   -------------------------------------------------------------
   Shared types for the border calculator feature set
\* ------------------------------------------------------------------ */

// Select helpers
export interface SelectItem {
  label: string;
  value: string;
}

// Core select list props (useful for shared components)
export interface SelectListProps {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
}

// Data models
export interface AspectRatio extends SelectItem {
  width?: number;
  height?: number;
}

export interface PaperSize extends SelectItem {
  width: number;
  height: number;
}

export interface BorderPresetSettings {
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
}

export type BorderSettings = BorderPresetSettings;

export interface BorderPreset {
  id: string;
  name: string;
  settings: BorderPresetSettings;
}

export interface BorderCalculatorState extends BorderPresetSettings {
  offsetWarning: string | null;
  bladeWarning: string | null;
  minBorderWarning: string | null;
  paperSizeWarning: string | null;
  lastValidMinBorder: number;
  lastValidCustomAspectWidth: number;
  lastValidCustomAspectHeight: number;
  lastValidCustomPaperWidth: number;
  lastValidCustomPaperHeight: number;
  selectedImageUri: string | null;
  imageDimensions: { width: number; height: number };
  isCropping: boolean;
  cropOffset: { x: number; y: number };
  cropScale: number;
}

// Calculation output
export interface BorderCalculation {
  leftBorder: number;
  rightBorder: number;
  topBorder: number;
  bottomBorder: number;
  printWidth: number;
  printHeight: number;
  paperWidth: number;
  paperHeight: number;
  previewScale: number;
  previewHeight: number;
  previewWidth: number;
  printWidthPercent: number;
  printHeightPercent: number;
  leftBorderPercent: number;
  topBorderPercent: number;
  rightBorderPercent: number;
  bottomBorderPercent: number;
  leftBladeReading: number;
  rightBladeReading: number;
  topBladeReading: number;
  bottomBladeReading: number;
  bladeThickness: number;
  isNonStandardPaperSize: boolean;
  easelSize: { width: number; height: number };
  easelSizeLabel: string;
  // Warning states
  offsetWarning: string | null;
  bladeWarning: string | null;
  minBorderWarning: string | null;
  paperSizeWarning: string | null;
  lastValidMinBorder: number;
  clampedHorizontalOffset: number;
  clampedVerticalOffset: number;
}

// Reducer actions
export type BorderCalculatorAction =
  | {
      type: 'SET_FIELD';
      key: keyof BorderCalculatorState;
      value: BorderCalculatorState[keyof BorderCalculatorState];
    }
  | { type: 'SET_PAPER_SIZE'; value: string }
  | { type: 'SET_ASPECT_RATIO'; value: string }
  | {
      type: 'SET_IMAGE_FIELD';
      key: Extract<
        keyof BorderCalculatorState,
        | 'selectedImageUri'
        | 'isCropping'
        | 'cropScale'
        | 'cropOffset'
      >;
      value: BorderCalculatorState[keyof BorderCalculatorState];
    }
  | {
      type: 'SET_IMAGE_DIMENSIONS';
      value: { width: number; height: number };
    }
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

// Calculation helpers
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

export interface WarningTimeouts {
  offset: ReturnType<typeof setTimeout> | null;
  blade: ReturnType<typeof setTimeout> | null;
  minBorder: ReturnType<typeof setTimeout> | null;
  paperSize: ReturnType<typeof setTimeout> | null;
}

// Defaults (sharing values from original project)
export const DEFAULT_MIN_BORDER = 0.5;
export const DEFAULT_CUSTOM_PAPER_WIDTH = 13;
export const DEFAULT_CUSTOM_PAPER_HEIGHT = 10;
export const DEFAULT_CUSTOM_ASPECT_WIDTH = 2;
export const DEFAULT_CUSTOM_ASPECT_HEIGHT = 3;
export const CALC_STORAGE_KEY = 'borderCalculatorState';

export type { BorderCalculatorState as PersistedBorderCalculatorState };
