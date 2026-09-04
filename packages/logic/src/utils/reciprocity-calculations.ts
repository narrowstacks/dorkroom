import { RECIPROCITY_FILM_TYPES } from '../constants/reciprocity';
import { RECIPROCITY_MAX_BAR_WIDTH } from '../constants/reciprocity-calculator-defaults';
import type { ReciprocityCalculation } from '../types/reciprocity';

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
