/**
 * Types for the Lens Equivalency Calculator
 * Calculates equivalent focal lengths between different sensor/film formats
 */

/**
 * Sensor format categories
 */
export type SensorCategory = 'digital' | 'film-medium';

/**
 * Represents a sensor or film format with its physical dimensions
 */
export interface SensorFormat {
  id: string;
  name: string;
  shortName: string;
  category: SensorCategory;
  /** Width in mm */
  width: number;
  /** Height in mm */
  height: number;
  /** Diagonal in mm (calculated) */
  diagonal: number;
  /** Crop factor relative to full frame 35mm */
  cropFactor: number;
}

/**
 * Form state for the lens calculator (string values for input handling)
 */
export interface LensCalculatorState {
  focalLength: string;
  sourceFormat: string;
  targetFormat: string;
}

/**
 * Form state with parsed numeric values
 */
export interface LensFormState {
  focalLength: number;
  sourceFormat: string;
  targetFormat: string;
}

/**
 * Calculated lens equivalency results
 */
export interface LensCalculation {
  /** Original focal length in mm */
  sourceFocalLength: number;
  /** Equivalent focal length on target format */
  equivalentFocalLength: number;
  /** Source format details */
  sourceFormat: SensorFormat;
  /** Target format details */
  targetFormat: SensorFormat;
  /** Crop factor difference (target/source) */
  cropFactorRatio: number;
  /** Equivalent field of view angle (diagonal) in degrees */
  fieldOfView: number;
  /** Whether the calculation is valid */
  isValid: boolean;
}

/**
 * Common focal length presets for quick selection
 */
export interface FocalLengthPreset {
  label: string;
  value: number;
  description?: string;
}

export const LENS_STORAGE_KEY = 'lensCalculatorState_v1';
