/* ------------------------------------------------------------------ *
   border-calculator.ts
   -------------------------------------------------------------
   Shared types for the border calculator feature set
\* ------------------------------------------------------------------ */

/**
 * Generic interface for dropdown/select item representation.
 * Used throughout the application for consistent select component APIs.
 *
 * @public
 */
export interface SelectItem {
  /** Human-readable display text for the item */
  label: string;
  /** Unique identifier/value for the item */
  value: string;
}

/**
 * Common props interface for select/dropdown components.
 * Provides standardized API for select list components across the application.
 *
 * @public
 */
export interface SelectListProps {
  /** Currently selected value */
  value: string;
  /** Callback function called when selection changes */
  onValueChange: (value: string) => void;
  /** Array of selectable items */
  items: SelectItem[];
  /** Optional placeholder text shown when no value is selected */
  placeholder?: string;
}

/**
 * Represents an aspect ratio option in the border calculator.
 * Extends SelectItem with optional numerical width and height values.
 *
 * @public
 */
export interface AspectRatio extends SelectItem {
  /** Width component of the aspect ratio (optional for custom ratios) */
  width?: number;
  /** Height component of the aspect ratio (optional for custom ratios) */
  height?: number;
}

/**
 * Represents a paper size option in the border calculator.
 * Extends SelectItem with specific width and height dimensions in inches.
 *
 * @public
 */
export interface PaperSize extends SelectItem {
  /** Paper width in inches */
  width: number;
  /** Paper height in inches */
  height: number;
}

/**
 * Complete configuration for border calculator settings.
 * Contains all parameters needed to calculate print borders and positioning.
 *
 * @public
 */
export type AspectRatioValue =
  | 'custom'
  | '3:2'
  | '65:24'
  | '4:3'
  | '1:1'
  | '7:6'
  | '5:4'
  | '7:5'
  | '16:9'
  | '1.37:1'
  | '1.85:1'
  | '2:1'
  | '2.39:1'
  | '2.76:1';
export type PaperSizeValue =
  | 'custom'
  | '5x7'
  | '4x6'
  | '8x10'
  | '11x14'
  | '16x20'
  | '20x24';

export interface BorderPresetSettings {
  /** Selected aspect ratio identifier */
  aspectRatio: AspectRatioValue;
  /** Selected paper size identifier */
  paperSize: PaperSizeValue;
  /** Custom aspect ratio width (when using custom aspect ratio) */
  customAspectWidth: number;
  /** Custom aspect ratio height (when using custom aspect ratio) */
  customAspectHeight: number;
  /** Custom paper width in inches (when using custom paper size) */
  customPaperWidth: number;
  /** Custom paper height in inches (when using custom paper size) */
  customPaperHeight: number;
  /** Minimum border width in inches for all sides */
  minBorder: number;
  /** Whether to enable horizontal and vertical offset adjustments */
  enableOffset: boolean;
  /** Whether to ignore minimum border constraints when positioning */
  ignoreMinBorder: boolean;
  /** Horizontal offset from center position in inches */
  horizontalOffset: number;
  /** Vertical offset from center position in inches */
  verticalOffset: number;
  /** Whether to show blade guides in the preview */
  showBlades: boolean;
  /** Whether to display blade measurement readings */
  showBladeReadings: boolean;
  /** Whether paper is oriented in landscape mode */
  isLandscape: boolean;
  /** Whether the aspect ratio is flipped from its default orientation */
  isRatioFlipped: boolean;
  /** Whether the user has manually flipped the paper orientation */
  hasManuallyFlippedPaper: boolean;
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
  // Form state fields from preset management
  selectedPresetId?: string;
  presetName?: string;
  isEditingPreset?: boolean;
}

// Calculation output
/**
 * Complete result of border calculation with all computed values.
 * Contains border measurements, print dimensions, preview data, and warnings.
 *
 * @public
 */
export interface BorderCalculation {
  /** Left border width in inches */
  leftBorder: number;
  /** Right border width in inches */
  rightBorder: number;
  /** Top border height in inches */
  topBorder: number;
  /** Bottom border height in inches */
  bottomBorder: number;
  /** Print area width in inches */
  printWidth: number;
  /** Print area height in inches */
  printHeight: number;
  /** Total paper width in inches */
  paperWidth: number;
  /** Total paper height in inches */
  paperHeight: number;
  /** Scale factor for preview display */
  previewScale: number;
  /** Preview height in pixels */
  previewHeight: number;
  /** Preview width in pixels */
  previewWidth: number;
  /** Print width as percentage of paper width */
  printWidthPercent: number;
  /** Print height as percentage of paper height */
  printHeightPercent: number;
  /** Left border as percentage of paper width */
  leftBorderPercent: number;
  /** Top border as percentage of paper height */
  topBorderPercent: number;
  /** Right border as percentage of paper width */
  rightBorderPercent: number;
  /** Bottom border as percentage of paper height */
  bottomBorderPercent: number;
  /** Left blade reading for trimmer setup */
  leftBladeReading: number;
  /** Right blade reading for trimmer setup */
  rightBladeReading: number;
  /** Top blade reading for trimmer setup */
  topBladeReading: number;
  /** Bottom blade reading for trimmer setup */
  bottomBladeReading: number;
  /** Blade thickness for visual guides */
  bladeThickness: number;
  /** Whether paper size requires non-standard easel */
  isNonStandardPaperSize: boolean;
  /** Recommended easel dimensions */
  easelSize: { width: number; height: number };
  /** Human-readable easel size description */
  easelSizeLabel: string;
  /** Warning about offset adjustments, if any */
  offsetWarning: string | null;
  /** Warning about blade positioning, if any */
  bladeWarning: string | null;
  /** Warning about minimum border violations, if any */
  minBorderWarning: string | null;
  /** Warning about paper size issues, if any */
  paperSizeWarning: string | null;
  /** Last valid minimum border value before error */
  lastValidMinBorder: number;
  /** Horizontal offset after clamping to valid range */
  clampedHorizontalOffset: number;
  /** Vertical offset after clamping to valid range */
  clampedVerticalOffset: number;
}

// Reducer actions
export type BorderCalculatorAction =
  | {
      type: 'SET_FIELD';
      key: keyof BorderCalculatorState;
      value: BorderCalculatorState[keyof BorderCalculatorState];
    }
  | { type: 'SET_PAPER_SIZE'; value: PaperSizeValue }
  | { type: 'SET_ASPECT_RATIO'; value: AspectRatioValue }
  | {
      type: 'SET_IMAGE_FIELD';
      key: 'selectedImageUri';
      value: string | null;
    }
  | {
      type: 'SET_IMAGE_FIELD';
      key: 'isCropping';
      value: boolean;
    }
  | {
      type: 'SET_IMAGE_FIELD';
      key: 'cropScale';
      value: number;
    }
  | {
      type: 'SET_IMAGE_FIELD';
      key: 'cropOffset';
      value: { x: number; y: number };
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
export const CALC_STORAGE_KEY = 'borderCalculatorState_v2';

export type { BorderCalculatorState as PersistedBorderCalculatorState };
