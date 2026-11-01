import { RECIPROCITY_FILM_TYPES } from '../constants/reciprocity';
import { RECIPROCITY_MAX_BAR_WIDTH } from '../constants/reciprocity-calculator-defaults';
import type {
  ReciprocityCalculation,
  ReciprocityFormState,
} from '../types/reciprocity';
import { parseDecimalInput } from './input-validation';

/**
 * Reciprocity failure is negligible below ~1s, and the power law `t ** factor`
 * is only valid for exposures at or above 1 second: for factor > 1 (every film
 * in RECIPROCITY_FILM_TYPES), raising a fraction to that power shrinks it,
 * which would tell the photographer to expose for less time than metered.
 */
export const RECIPROCITY_MIN_CORRECTION_SECONDS = 1;

/**
 * Applies the reciprocity power law to a metered time, guarding the sub-1s
 * region where the law does not hold.
 *
 * This is the only place the exponent is applied. The calculator readout, the
 * iOS screen and the reciprocity chart all route through it, so the curve and
 * the number can never disagree.
 *
 * @param meteredSeconds - Metered exposure time in seconds
 * @param factor - Film's reciprocity factor (the exponent)
 * @returns Corrected exposure time in seconds
 * @example
 * ```typescript
 * const long = applyReciprocity(30, 1.54); // ~200.6 seconds
 * const short = applyReciprocity(0.5, 1.54); // 0.5 -- unchanged, not 0.34
 * ```
 */
export const applyReciprocity = (
  meteredSeconds: number,
  factor: number
): number =>
  meteredSeconds >= RECIPROCITY_MIN_CORRECTION_SECONDS
    ? meteredSeconds ** factor
    : meteredSeconds;

/** A film's reciprocity factor and display label, resolved from its value. */
export interface ResolvedReciprocityFilm {
  factor: number;
  filmName: string;
}

/**
 * Resolves a film selection to the factor and label the calculation should use.
 *
 * An unresolvable factor falls back to 1, which applies no correction: a
 * silently-applied guess would be indistinguishable from a real film profile.
 *
 * @param filmType - Film value from RECIPROCITY_FILM_TYPES, or 'custom'
 * @param customFactor - Factor to use when `filmType` is 'custom'
 */
export const resolveReciprocityFilm = (
  filmType: string,
  customFactor: number
): ResolvedReciprocityFilm => {
  if (filmType === 'custom') {
    return {
      factor:
        Number.isFinite(customFactor) && customFactor > 0 ? customFactor : 1,
      filmName: 'Custom',
    };
  }

  const selectedFilm = RECIPROCITY_FILM_TYPES.find(
    (film) => film.value === filmType
  );

  return {
    factor: selectedFilm?.factor ?? 1,
    filmName: selectedFilm?.label ?? '',
  };
};

/** Inputs for a single reciprocity calculation. */
export interface ReciprocityInput {
  /** Metered exposure time in seconds. */
  meteredSeconds: number;
  /** Film value from RECIPROCITY_FILM_TYPES, or 'custom'. */
  filmType: string;
  /** Factor to use when `filmType` is 'custom'. */
  customFactor: number;
}

/**
 * Computes the full reciprocity result for a metered time and film selection.
 *
 * @returns The calculation, or null when the metered time is not a usable duration
 * @example
 * ```typescript
 * const result = calculateReciprocity({
 *   meteredSeconds: 30,
 *   filmType: 'tri-x',
 *   customFactor: 1.3,
 * });
 * // result.adjustedTime ~= 200.6, result.filmName === 'Kodak Tri-X 400'
 * ```
 */
export const calculateReciprocity = ({
  meteredSeconds,
  filmType,
  customFactor,
}: ReciprocityInput): ReciprocityCalculation | null => {
  if (!Number.isFinite(meteredSeconds) || meteredSeconds <= 0) {
    return null;
  }

  const { factor, filmName } = resolveReciprocityFilm(filmType, customFactor);
  const adjustedTime = applyReciprocity(meteredSeconds, factor);
  const percentageIncrease =
    ((adjustedTime - meteredSeconds) / meteredSeconds) * 100;

  const logScale = (time: number) =>
    Math.min(
      RECIPROCITY_MAX_BAR_WIDTH,
      (Math.log(time + 1) / Math.log(Math.max(adjustedTime, 10) + 1)) *
        RECIPROCITY_MAX_BAR_WIDTH
    );

  return {
    originalTime: meteredSeconds,
    adjustedTime,
    factor,
    filmName,
    percentageIncrease,
    timeBarWidth: logScale(meteredSeconds),
    adjustedTimeBarWidth: logScale(adjustedTime),
  };
};

/**
 * The reciprocity result for the calculator's form values: parses the metered
 * time text ("30s", "1m30s") and runs {@link calculateReciprocity}. The web
 * page and the shared-link preview card both go through it.
 *
 * @returns The calculation, or null while the metered time is unparseable or
 *   not a usable duration
 */
export const calculateReciprocityForForm = (
  values: ReciprocityFormState
): ReciprocityCalculation | null => {
  const meteredSeconds = parseReciprocityTime(values.meteredTime);

  if (meteredSeconds === null) {
    return null;
  }

  return calculateReciprocity({
    meteredSeconds,
    filmType: values.filmType,
    customFactor: values.customFactor,
  });
};

const roundToOneDecimal = (value: number): number =>
  Math.round(value * 10) / 10;

/**
 * Formats reciprocity time in seconds to human-readable string.
 * Automatically chooses appropriate units (seconds, minutes, hours) based on duration.
 *
 * @param seconds - Time duration in seconds
 * @returns Formatted time string with appropriate units
 * @example
 * ```typescript
 * const short = formatReciprocityTime(15.5); // '15.5s'
 * const medium = formatReciprocityTime(125); // '2m 5s'
 * const long = formatReciprocityTime(3600); // '1h'
 * ```
 */
export const formatReciprocityTime = (seconds: number): string => {
  // Decide which unit branch to display in using the *rounded* total: a raw
  // value like 59.98 belongs in the seconds branch, but its rounded display
  // value (60) does not, so branching on the raw value would print "60s".
  const roundedTotal = roundToOneDecimal(seconds);

  if (roundedTotal < 60) {
    return `${roundedTotal}s`;
  }

  if (roundedTotal < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      const roundedRemainder = roundToOneDecimal(remainingSeconds);
      // Rounding the remainder can itself carry into the next unit (e.g.
      // 119.99 decomposes to 1m 59.99s, which rounds to the impossible
      // "1m 60s"); detect that and roll it into the minutes instead.
      if (roundedRemainder >= 60) {
        return `${minutes + 1}m`;
      }
      return `${minutes}m ${roundedRemainder}s`;
    }
    return `${minutes}m`;
  }

  // Decompose from the same rounded total used for branch selection: an
  // input like 3599.99 rounds into this branch, but flooring the *raw*
  // seconds would yield the impossible "0h 59m". Flooring the rounded total
  // needs no further carry -- its minutes remainder is always below 60.
  const hours = Math.floor(roundedTotal / 3600);
  const minutes = Math.floor((roundedTotal % 3600) / 60);
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

/**
 * Parses reciprocity time input from various string formats.
 * Supports formats like '30s', '2m 30s', '1h 30m', or plain numbers, with
 * either "." or "," as the decimal separator ('1,5m').
 *
 * @param input - Time string to parse
 * @returns Parsed time in seconds, or null if parsing fails
 * @example
 * ```typescript
 * const seconds = parseReciprocityTime('30s'); // 30
 * const minutes = parseReciprocityTime('2m 30s'); // 150
 * const hours = parseReciprocityTime('1h 30m'); // 5400
 * const plain = parseReciprocityTime('45'); // 45
 * const invalid = parseReciprocityTime('abc'); // null
 * ```
 */
export const parseReciprocityTime = (input: string): number | null => {
  const cleaned = input.toLowerCase().trim();

  if (!cleaned) {
    return null;
  }

  // A bare number is seconds. "," is accepted as the decimal separator (#318).
  if (/^[\d.,]+$/.test(cleaned)) {
    const plain = parseDecimalInput(cleaned);
    return Number.isNaN(plain) ? null : plain;
  }

  let seconds = 0;
  let valid = false;

  // Digit runs are bounded (`\d{1,9}`) rather than `\d+`: exposure times never
  // need nine digits, and the bound keeps these unanchored matches linear
  // (unbounded `\d+` next to `\s*` is a polynomial-ReDoS pattern).
  const hourMatch = cleaned.match(/(\d{1,9}([.,]\d{1,9})?)\s*h/);
  if (hourMatch) {
    seconds += parseDecimalInput(hourMatch[1]) * 3600;
    valid = true;
  }

  const minuteMatch = cleaned.match(/(\d{1,9}([.,]\d{1,9})?)\s*m(?!s)/);
  if (minuteMatch) {
    seconds += parseDecimalInput(minuteMatch[1]) * 60;
    valid = true;
  }

  const secondMatch = cleaned.match(/(\d{1,9}([.,]\d{1,9})?)\s*s/);
  if (secondMatch) {
    seconds += parseDecimalInput(secondMatch[1]);
    valid = true;
  }

  return valid ? seconds : null;
};
