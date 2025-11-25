/**
 * Split-grade printing calculator types
 *
 * Split-grade printing is a technique where you make two exposures:
 * - A "soft" exposure at low contrast (Grade 00 or 0) for shadow detail
 * - A "hard" exposure at high contrast (Grade 4 or 5) for highlight separation
 *
 * This gives more control than single-grade printing because you can
 * adjust shadows and highlights independently.
 */

/**
 * Available contrast grades for multigrade paper
 */
export type ContrastGrade =
  | '00'
  | '0'
  | '0.5'
  | '1'
  | '1.5'
  | '2'
  | '2.5'
  | '3'
  | '3.5'
  | '4'
  | '4.5'
  | '5';

/**
 * Filter factor data for a contrast grade
 * Different grades require different exposure adjustments
 */
export interface GradeFilterFactor {
  grade: ContrastGrade;
  label: string;
  factor: number;
  description: string;
}

/**
 * Form state for the split-grade calculator
 */
export interface SplitGradeFormState {
  /** Base exposure time in seconds */
  baseTime: number;
  /** Contrast balance from 0 (all soft) to 100 (all hard) */
  contrastBalance: number;
  /** Grade to use for soft exposure */
  softGrade: ContrastGrade;
  /** Grade to use for hard exposure */
  hardGrade: ContrastGrade;
  /**
   * Whether to apply filter factor compensation.
   * Set to false for enlargers with built-in compensation (color heads,
   * Ilford Multigrade heads with ND filters, etc.)
   */
  useFilterFactors: boolean;
}

/**
 * Calculated split-grade exposure results
 */
export interface SplitGradeCalculation {
  /** Exposure time for soft (low contrast) grade in seconds */
  softTime: number;
  /** Exposure time for hard (high contrast) grade in seconds */
  hardTime: number;
  /** Total exposure time (soft + hard) in seconds */
  totalTime: number;
  /** Soft exposure as percentage of total */
  softPercentage: number;
  /** Hard exposure as percentage of total */
  hardPercentage: number;
  /** Whether the calculation inputs are valid */
  isValid: boolean;
}

/**
 * Preset for common split-grade starting points
 */
export interface SplitGradePreset {
  label: string;
  description: string;
  contrastBalance: number;
}

export const SPLIT_GRADE_STORAGE_KEY = 'splitGradeCalculatorState_v1';
