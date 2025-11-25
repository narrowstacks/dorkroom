import type {
  ContrastGrade,
  GradeFilterFactor,
  SplitGradePreset,
} from '../types/split-grade-calculator';

/**
 * Default values for split-grade calculator
 */
export const DEFAULT_SPLIT_GRADE_BASE_TIME = 10;
export const DEFAULT_SPLIT_GRADE_CONTRAST_BALANCE = 50;
export const DEFAULT_SPLIT_GRADE_SOFT_GRADE: ContrastGrade = '00';
export const DEFAULT_SPLIT_GRADE_HARD_GRADE: ContrastGrade = '5';

/**
 * Filter factors for Ilford Multigrade filters
 * These represent the exposure adjustment needed relative to Grade 2
 * Based on typical Ilford Multigrade filter data
 *
 * Note: Actual factors vary by enlarger, paper batch, and filter condition.
 * These are starting points - users should calibrate for their setup.
 */
export const GRADE_FILTER_FACTORS: GradeFilterFactor[] = [
  {
    grade: '00',
    label: 'Grade 00',
    factor: 2.5,
    description: 'Very soft - maximum shadow detail',
  },
  {
    grade: '0',
    label: 'Grade 0',
    factor: 2.0,
    description: 'Soft - enhanced shadow detail',
  },
  {
    grade: '0.5',
    label: 'Grade 0.5',
    factor: 1.7,
    description: 'Soft-normal transition',
  },
  {
    grade: '1',
    label: 'Grade 1',
    factor: 1.4,
    description: 'Slightly soft',
  },
  {
    grade: '1.5',
    label: 'Grade 1.5',
    factor: 1.2,
    description: 'Soft-normal',
  },
  {
    grade: '2',
    label: 'Grade 2',
    factor: 1.0,
    description: 'Normal contrast - reference grade',
  },
  {
    grade: '2.5',
    label: 'Grade 2.5',
    factor: 1.1,
    description: 'Slightly above normal',
  },
  {
    grade: '3',
    label: 'Grade 3',
    factor: 1.2,
    description: 'Moderately hard',
  },
  {
    grade: '3.5',
    label: 'Grade 3.5',
    factor: 1.3,
    description: 'Hard',
  },
  {
    grade: '4',
    label: 'Grade 4',
    factor: 1.4,
    description: 'Very hard - enhanced highlights',
  },
  {
    grade: '4.5',
    label: 'Grade 4.5',
    factor: 1.5,
    description: 'Extra hard',
  },
  {
    grade: '5',
    label: 'Grade 5',
    factor: 1.6,
    description: 'Maximum contrast - strongest highlights',
  },
];

/**
 * Common soft grades used for split-grade printing
 */
export const SOFT_GRADE_OPTIONS: ContrastGrade[] = ['00', '0', '0.5', '1'];

/**
 * Common hard grades used for split-grade printing
 */
export const HARD_GRADE_OPTIONS: ContrastGrade[] = ['4', '4.5', '5'];

/**
 * Preset starting points for split-grade printing
 */
export const SPLIT_GRADE_PRESETS: SplitGradePreset[] = [
  {
    label: 'Low Contrast',
    description: 'Flat negative, needs more punch',
    contrastBalance: 65,
  },
  {
    label: 'Balanced',
    description: 'Normal negative, equal soft/hard',
    contrastBalance: 50,
  },
  {
    label: 'High Contrast',
    description: 'Contrasty negative, needs taming',
    contrastBalance: 35,
  },
  {
    label: 'Shadow Priority',
    description: 'Open shadows, subtle highlights',
    contrastBalance: 30,
  },
  {
    label: 'Highlight Priority',
    description: 'Punchy highlights, compressed shadows',
    contrastBalance: 70,
  },
];

/**
 * Get filter factor for a specific grade
 */
export const getFilterFactor = (grade: ContrastGrade): number => {
  const factor = GRADE_FILTER_FACTORS.find((f) => f.grade === grade);
  return factor?.factor ?? 1.0;
};

/**
 * Get grade info for a specific grade
 */
export const getGradeInfo = (
  grade: ContrastGrade
): GradeFilterFactor | undefined => {
  return GRADE_FILTER_FACTORS.find((f) => f.grade === grade);
};
