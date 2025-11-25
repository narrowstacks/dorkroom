import type {
  ContrastGrade,
  SplitGradeCalculation,
} from '../types/split-grade-calculator';
import { getFilterFactor } from '../constants/split-grade-calculator';
import { roundToStandardPrecision } from './precision';

/**
 * Calculate split-grade exposure times from a base exposure and contrast balance.
 *
 * The contrast balance determines how the total exposure is divided between
 * soft and hard grades:
 * - 0% = all soft exposure (minimum contrast)
 * - 50% = equal soft and hard (balanced)
 * - 100% = all hard exposure (maximum contrast)
 *
 * Filter factors are applied to compensate for the different light transmission
 * of each grade's filter, unless useFilterFactors is false.
 *
 * @param baseTime - Base exposure time in seconds
 * @param contrastBalance - Balance from 0 (all soft) to 100 (all hard)
 * @param softGrade - Grade to use for soft exposure (default: '00')
 * @param hardGrade - Grade to use for hard exposure (default: '5')
 * @param useFilterFactors - Whether to apply filter factor compensation (default: true).
 *   Set to false for enlargers with built-in compensation (color heads, Ilford MG heads).
 * @returns Calculated split-grade exposure times
 *
 * @example
 * ```typescript
 * // 10 second base with equal soft/hard balance (with filter factors)
 * const result = calculateSplitGrade(10, 50, '00', '5', true);
 * // result.softTime ~= 12.5s (adjusted for Grade 00 factor)
 * // result.hardTime ~= 8s (adjusted for Grade 5 factor)
 *
 * // Same calculation without filter factors (compensated enlarger)
 * const result2 = calculateSplitGrade(10, 50, '00', '5', false);
 * // result2.softTime = 5s, result2.hardTime = 5s (equal split)
 * ```
 */
export const calculateSplitGrade = (
  baseTime: number,
  contrastBalance: number,
  softGrade: ContrastGrade = '00',
  hardGrade: ContrastGrade = '5',
  useFilterFactors: boolean = true
): SplitGradeCalculation => {
  // Validate inputs
  if (
    !Number.isFinite(baseTime) ||
    baseTime <= 0 ||
    !Number.isFinite(contrastBalance) ||
    contrastBalance < 0 ||
    contrastBalance > 100
  ) {
    return {
      softTime: 0,
      hardTime: 0,
      totalTime: 0,
      softPercentage: 0,
      hardPercentage: 0,
      isValid: false,
    };
  }

  // Convert percentage to ratio (0-1)
  const hardRatio = contrastBalance / 100;
  const softRatio = 1 - hardRatio;

  // Get filter factors for compensation (or use 1.0 if disabled)
  const softFactor = useFilterFactors ? getFilterFactor(softGrade) : 1.0;
  const hardFactor = useFilterFactors ? getFilterFactor(hardGrade) : 1.0;

  // Calculate times with filter factor compensation
  // The base time is divided according to the balance,
  // then each portion is multiplied by its filter factor
  const softTime = roundToStandardPrecision(baseTime * softRatio * softFactor);
  const hardTime = roundToStandardPrecision(baseTime * hardRatio * hardFactor);
  const totalTime = roundToStandardPrecision(softTime + hardTime);

  // Calculate actual percentages of total exposure
  const softPercentage =
    totalTime > 0 ? roundToStandardPrecision((softTime / totalTime) * 100) : 0;
  const hardPercentage =
    totalTime > 0 ? roundToStandardPrecision((hardTime / totalTime) * 100) : 0;

  return {
    softTime,
    hardTime,
    totalTime,
    softPercentage,
    hardPercentage,
    isValid: true,
  };
};

/**
 * Calculate what contrast balance would produce a given soft/hard time ratio.
 * Useful for reverse-engineering an existing split-grade exposure.
 *
 * @param softTime - Current soft exposure time
 * @param hardTime - Current hard exposure time
 * @param softGrade - Grade used for soft exposure
 * @param hardGrade - Grade used for hard exposure
 * @returns Contrast balance (0-100) that would produce this ratio
 */
export const calculateContrastBalance = (
  softTime: number,
  hardTime: number,
  softGrade: ContrastGrade = '00',
  hardGrade: ContrastGrade = '5'
): number => {
  if (softTime <= 0 && hardTime <= 0) return 50;
  if (softTime <= 0) return 100;
  if (hardTime <= 0) return 0;

  // Remove filter factor compensation to get the "base" times
  const softFactor = getFilterFactor(softGrade);
  const hardFactor = getFilterFactor(hardGrade);

  const softBase = softTime / softFactor;
  const hardBase = hardTime / hardFactor;
  const totalBase = softBase + hardBase;

  // Calculate balance as percentage of hard in total
  const balance = (hardBase / totalBase) * 100;

  return roundToStandardPrecision(Math.max(0, Math.min(100, balance)));
};

/**
 * Adjust an existing split-grade exposure by a number of stops.
 * Both soft and hard times are scaled proportionally.
 *
 * @param softTime - Current soft exposure time
 * @param hardTime - Current hard exposure time
 * @param stops - Number of stops to adjust (positive = more exposure)
 * @returns New soft and hard times
 */
export const adjustSplitGradeByStops = (
  softTime: number,
  hardTime: number,
  stops: number
): { softTime: number; hardTime: number; totalTime: number } => {
  const multiplier = Math.pow(2, stops);

  const newSoftTime = roundToStandardPrecision(softTime * multiplier);
  const newHardTime = roundToStandardPrecision(hardTime * multiplier);

  return {
    softTime: newSoftTime,
    hardTime: newHardTime,
    totalTime: roundToStandardPrecision(newSoftTime + newHardTime),
  };
};

/**
 * Shift contrast balance while maintaining total exposure.
 * Increases one grade's time while decreasing the other.
 *
 * @param softTime - Current soft exposure time
 * @param hardTime - Current hard exposure time
 * @param balanceShift - Amount to shift balance (-100 to +100)
 * @param softGrade - Grade used for soft exposure
 * @param hardGrade - Grade used for hard exposure
 * @returns New soft and hard times with shifted balance
 */
export const shiftContrastBalance = (
  softTime: number,
  hardTime: number,
  balanceShift: number,
  softGrade: ContrastGrade = '00',
  hardGrade: ContrastGrade = '5'
): { softTime: number; hardTime: number; totalTime: number } => {
  // Get current balance
  const currentBalance = calculateContrastBalance(
    softTime,
    hardTime,
    softGrade,
    hardGrade
  );

  // Calculate new balance
  const newBalance = Math.max(0, Math.min(100, currentBalance + balanceShift));

  // Calculate total base time (removing filter factors)
  const softFactor = getFilterFactor(softGrade);
  const hardFactor = getFilterFactor(hardGrade);
  const totalBase = softTime / softFactor + hardTime / hardFactor;

  // Recalculate times with new balance
  const hardRatio = newBalance / 100;
  const softRatio = 1 - hardRatio;

  const newSoftTime = roundToStandardPrecision(
    totalBase * softRatio * softFactor
  );
  const newHardTime = roundToStandardPrecision(
    totalBase * hardRatio * hardFactor
  );

  return {
    softTime: newSoftTime,
    hardTime: newHardTime,
    totalTime: roundToStandardPrecision(newSoftTime + newHardTime),
  };
};

/**
 * Format split-grade times for display with appropriate precision.
 *
 * @param seconds - Time in seconds
 * @returns Formatted string (e.g., "12.5s" or "1m 30s")
 */
export const formatSplitGradeTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';

  const rounded = roundToStandardPrecision(seconds);

  if (rounded >= 60) {
    const minutes = Math.floor(rounded / 60);
    const remainingSeconds = roundToStandardPrecision(rounded % 60);
    if (remainingSeconds > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m`;
  }

  return `${rounded}s`;
};
