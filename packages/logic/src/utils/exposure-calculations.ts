import type { ExposureCalculation } from '../types/exposure-calculator';
import { parseDecimalInput } from './input-validation';
import { roundToPrecision, roundToStandardPrecision } from './precision';

/**
 * A third of a stop written to two decimals (0.33, 0.67, 1.33) is off its
 * exact value by at most 1/300; anything this close is read as the third.
 */
const EXACT_THIRD_TOLERANCE = 0.004;

/**
 * Reads a stop value that is a rounded third (0.33, -0.67, 0.3333) as the
 * exact third, so a third of a stop multiplies by 2^(1/3), not 2^0.33. Stops
 * are stored and linked rounded to two decimals; this keeps the math exact.
 *
 * @example
 * ```typescript
 * exactThirds(0.33); // 1/3
 * exactThirds(0.34); // 0.34 (not a third)
 * ```
 */
export const exactThirds = (stops: number): number => {
  const third = Math.round(stops * 3) / 3;
  return Math.abs(third - stops) <= EXACT_THIRD_TOLERANCE ? third : stops;
};

/**
 * Calculates new exposure time based on stop adjustment using the standard formula.
 * Each stop represents a doubling or halving of light, following the formula: newTime = originalTime * 2^stopChange
 * A rounded third (0.33) counts as the exact third (see {@link exactThirds}).
 *
 * @param originalTime - Original exposure time in seconds
 * @param stopChange - Number of stops to adjust (positive = longer exposure, negative = shorter)
 * @returns New exposure time in seconds
 * @example
 * ```typescript
 * const newTime = calculateNewExposureTime(10, 1); // 20 seconds (+1 stop)
 * const shorterTime = calculateNewExposureTime(10, -1); // 5 seconds (-1 stop)
 * const fractionalStop = calculateNewExposureTime(10, 0.5); // ~14.14 seconds (+1/2 stop)
 * ```
 */
export const calculateNewExposureTime = (
  originalTime: number,
  stopChange: number
): number => {
  return originalTime * 2 ** exactThirds(stopChange);
};

/**
 * Rounds stops to the nearest practical value with 1/3 stop precision.
 * Photography typically uses 1/3 stop increments for practical exposure adjustments.
 *
 * @param value - Stop value to round
 * @returns Rounded stop value to nearest 1/3, or original value if within tolerance
 * @example
 * ```typescript
 * const rounded = roundStopsToThirds(1.15); // 1.33 (nearest 1/3)
 * const exact = roundStopsToThirds(1.0); // 1.0 (already precise)
 * const tolerance = roundStopsToThirds(1.005); // 1.0 (within tolerance)
 * ```
 */
export const roundStopsToThirds = (value: number): number => {
  // Round to nearest 1/3
  const rounded = Math.round(value * 3) / 3;
  const tolerance = 0.01;
  return Math.abs(rounded - value) <= tolerance ? rounded : value;
};

/**
 * Formats exposure time in seconds into a human-readable string.
 * Displays minutes and seconds for times over 60 seconds, seconds only for shorter times.
 *
 * @param seconds - Exposure time in seconds
 * @returns Formatted time string with appropriate units
 * @example
 * ```typescript
 * const short = formatExposureTime(15.5); // '15.5s'
 * const long = formatExposureTime(125); // '2m 5s'
 * const exact = formatExposureTime(120); // '2m'
 * ```
 */
export const formatExposureTime = (seconds: number): string => {
  // Decide which unit branch to display in using the *rounded* total: a raw
  // value like 59.999 belongs in the seconds branch, but its rounded display
  // value (60) does not, so branching on the raw value would print "60s".
  const roundedTotal = roundToStandardPrecision(seconds);

  if (roundedTotal >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      const roundedRemainder = roundToStandardPrecision(remainingSeconds);
      // Rounding the remainder can itself carry into the next unit (e.g.
      // 119.999 decomposes to 1m 59.999s, which rounds to the impossible
      // "1m 60s"); detect that and roll it into the minutes instead.
      if (roundedRemainder >= 60) {
        return `${minutes + 1}m`;
      }
      return `${minutes}m ${roundedRemainder}s`;
    }
    return `${minutes}m`;
  }
  return `${roundedTotal}s`;
};

/**
 * Validates and parses exposure time input from user input string.
 * Returns null for invalid input, ensuring only positive numeric values are accepted.
 * Accepts "," as the decimal separator (see {@link parseDecimalInput}).
 *
 * @param input - User input string representing exposure time
 * @returns Parsed exposure time in seconds, or null if invalid
 * @example
 * ```typescript
 * const valid = parseExposureTime('15.5'); // 15.5
 * const comma = parseExposureTime('15,5'); // 15.5
 * const invalid = parseExposureTime('abc'); // null
 * const negative = parseExposureTime('-5'); // null
 * const empty = parseExposureTime(' '); // null
 * ```
 */
export const parseExposureTime = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const numericValue = parseDecimalInput(trimmed);
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

/**
 * Calculates the percentage increase between original and new exposure times.
 * Useful for displaying relative changes in exposure duration.
 *
 * @param originalTime - Original exposure time in seconds
 * @param newTime - New exposure time in seconds
 * @returns Percentage increase (positive) or decrease (negative)
 * @example
 * ```typescript
 * const increase = calculatePercentageIncrease(10, 20); // 100 (doubled)
 * const decrease = calculatePercentageIncrease(20, 10); // -50 (halved)
 * const same = calculatePercentageIncrease(10, 10); // 0 (no change)
 * ```
 */
export const calculatePercentageIncrease = (
  originalTime: number,
  newTime: number
): number => {
  if (originalTime <= 0) return 0;
  return ((newTime - originalTime) / originalTime) * 100;
};

/**
 * Calculates push/pull stops from shooting ISO and box speed.
 * Uses the formula: stops = log2(shootingIso / boxSpeed)
 *
 * Positive values indicate push (shooting at higher ISO than box speed).
 * Negative values indicate pull (shooting at lower ISO than box speed).
 * Zero indicates shooting at box speed.
 *
 * @param shootingIso - The ISO the film was shot at
 * @param boxSpeed - The film's native ISO (box speed)
 * @returns Number of stops pushed (positive) or pulled (negative), rounded to 2 decimal places
 * @example
 * ```typescript
 * // FP4 (ISO 125) shot at 400 = push +1.68 stops
 * const pushed = calculatePushPull(400, 125); // 1.68
 *
 * // HP5 (ISO 400) shot at box speed = 0 stops
 * const boxSpeed = calculatePushPull(400, 400); // 0
 *
 * // HP5 (ISO 400) pulled to 200 = pull -1 stop
 * const pulled = calculatePushPull(200, 400); // -1
 *
 * // Film shot at 75 when box speed is 100 = pull -0.42 stops
 * const slightPull = calculatePushPull(75, 100); // -0.42
 * ```
 */
export const calculatePushPull = (
  shootingIso: number,
  boxSpeed: number
): number => {
  if (shootingIso <= 0 || boxSpeed <= 0) return 0;
  if (shootingIso === boxSpeed) return 0;

  const stops = Math.log2(shootingIso / boxSpeed);
  // Round to nearest 2 decimal places
  return roundToPrecision(stops, 2);
};

/**
 * Assembles the exposure readout for a metered time and stop adjustment.
 *
 * The web page and the iOS screen previously each built this object from the
 * same three helpers above; sharing the assembly keeps the two readouts from
 * drifting the way the reciprocity ones did.
 *
 * @param originalTime - Metered exposure time in seconds
 * @param stops - Stop adjustment (positive = longer exposure)
 * @returns The readout, or null when the metered time is not a usable duration
 * @example
 * ```typescript
 * const result = calculateExposureAdjustment(10, 1);
 * // result.newTimeValue === 20, result.addedTime === 10
 * ```
 */
export const calculateExposureAdjustment = (
  originalTime: number,
  stops: number
): ExposureCalculation | null => {
  if (
    !Number.isFinite(originalTime) ||
    !Number.isFinite(stops) ||
    originalTime <= 0
  ) {
    return null;
  }

  const newTimeValue = calculateNewExposureTime(originalTime, stops);

  return {
    originalTimeValue: originalTime,
    stopsValue: stops,
    newTimeValue,
    addedTime: newTimeValue - originalTime,
    percentageIncrease: calculatePercentageIncrease(originalTime, newTimeValue),
    isValid: true,
  };
};

const greatestCommonDivisor = (a: number, b: number): number =>
  b === 0 ? a : greatestCommonDivisor(b, a % b);

/**
 * Writes a whole number of 1/denominator stops as a mixed fraction in
 * lowest terms.
 *
 * @example
 * ```typescript
 * formatStopFraction(4, 3); // '+1 1/3'
 * formatStopFraction(-1, 2); // '-1/2'
 * formatStopFraction(2, 12); // '+1/6'
 * ```
 */
export const formatStopFraction = (
  step: number,
  denominator: number
): string => {
  if (step === 0) return '0';
  const sign = step > 0 ? '+' : '-';
  const abs = Math.abs(step);
  const whole = Math.floor(abs / denominator);
  const remainder = abs % denominator;
  const divisor = greatestCommonDivisor(remainder, denominator);
  const fraction =
    remainder === 0 ? '' : `${remainder / divisor}/${denominator / divisor}`;
  return `${sign}${[whole || '', fraction].filter(Boolean).join(' ')}`;
};

/** Row spacings the f-stop table offers, as steps per stop. */
export const FSTOP_TABLE_ROW_STEPS = [
  { label: '1/12', denominator: 12 },
  { label: '1/6', denominator: 6 },
  { label: '1/3', denominator: 3 },
] as const;

export type FStopTableRowDenominator =
  (typeof FSTOP_TABLE_ROW_STEPS)[number]['denominator'];

/**
 * Dodge and burn columns, in sixths of a stop so every label reads as a
 * simple fraction: -1 to -1/6 dodging, +1/6 to +2 burning.
 */
const FSTOP_TABLE_COLUMN_SIXTHS = [
  -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 9, 12,
] as const;

export interface FStopTableColumn {
  stops: number;
  label: string;
}

export interface FStopTableRow {
  /** Steps from the entered time; stops = step / denominator. */
  step: number;
  stops: number;
  /** Stop offset from the entered time, e.g. "-1/3", "0", "+1 1/6". */
  label: string;
  /** Base exposure for this row in seconds. */
  time: number;
  /**
   * Seconds to dodge (negative) or burn (positive) for each column: the
   * time that column's stop change takes off or adds to this row's base.
   */
  adjustments: number[];
}

export interface FStopTable {
  columns: FStopTableColumn[];
  rows: FStopTableRow[];
}

/**
 * Builds an f-stop printing table around an exposure: one row per
 * 1/denominator stop from -range to +range stops, and for each row the
 * seconds to dodge or burn for common stop changes.
 *
 * @param baseTime - Exposure the table centres on, in seconds
 * @param denominator - Rows per stop (6 = sixth-stop rows)
 * @param range - Whole stops either side of the base time
 * @returns The table, or null when the base time is unusable
 * @example
 * ```typescript
 * const table = buildFStopTable(16, 6);
 * // row 0 is 16s; its +1 column burns 16s more, its -1 column dodges 8s
 * ```
 */
export const buildFStopTable = (
  baseTime: number,
  denominator: FStopTableRowDenominator,
  range = 1
): FStopTable | null => {
  if (!Number.isFinite(baseTime) || baseTime <= 0) return null;

  const columns = FSTOP_TABLE_COLUMN_SIXTHS.map((sixths) => ({
    stops: sixths / 6,
    label: formatStopFraction(sixths, 6),
  }));

  const rows: FStopTableRow[] = [];
  for (let step = -range * denominator; step <= range * denominator; step++) {
    const stops = step / denominator;
    const time = baseTime * 2 ** stops;
    rows.push({
      step,
      stops,
      label: formatStopFraction(step, denominator),
      time,
      adjustments: columns.map((column) => time * (2 ** column.stops - 1)),
    });
  }
  return { columns, rows };
};
