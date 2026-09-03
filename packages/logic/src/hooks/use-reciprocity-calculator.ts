import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RECIPROCITY_EXPOSURE_PRESETS,
  RECIPROCITY_FILM_TYPES,
} from '../constants/reciprocity';
import {
  DEFAULT_RECIPROCITY_CUSTOM_FACTOR,
  DEFAULT_RECIPROCITY_METERED_TIME,
} from '../constants/reciprocity-calculator-defaults';
import type {
  ReciprocityCalculation,
  ReciprocityCalculatorState,
} from '../types/reciprocity';
import { calculateReciprocity } from '../utils/reciprocity-calculations';

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
 * Supports formats like '30s', '2m 30s', '1h 30m', or plain numbers.
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

  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }

  let seconds = 0;
  let valid = false;

  // Digit runs are bounded (`\d{1,9}`) rather than `\d+`: exposure times never
  // need nine digits, and the bound keeps these unanchored matches linear
  // (unbounded `\d+` next to `\s*` is a polynomial-ReDoS pattern).
  const hourMatch = cleaned.match(/(\d{1,9}(\.\d{1,9})?)\s*h/);
  if (hourMatch) {
    seconds += parseFloat(hourMatch[1]) * 3600;
    valid = true;
  }

  const minuteMatch = cleaned.match(/(\d{1,9}(\.\d{1,9})?)\s*m(?!s)/);
  if (minuteMatch) {
    seconds += parseFloat(minuteMatch[1]) * 60;
    valid = true;
  }

  const secondMatch = cleaned.match(/(\d{1,9}(\.\d{1,9})?)\s*s/);
  if (secondMatch) {
    seconds += parseFloat(secondMatch[1]);
    valid = true;
  }

  return valid ? seconds : null;
};

/**
 * Reciprocity calculator hook for long exposure photography.
 * Handles reciprocity failure calculations for various film types,
 * providing corrected exposure times for long exposures.
 *
 * @returns Object containing calculator state, calculation results, and control functions
 * @example
 * ```typescript
 * const {
 *   filmType,
 *   setFilmType,
 *   meteredTime,
 *   handleTimeChange,
 *   calculation,
 *   formattedTime,
 *   timeFormatError
 * } = useReciprocityCalculator();
 *
 * // Set film type and metered time
 * setFilmType('tri-x');
 * handleTimeChange('30s');
 *
 * // Get corrected exposure time
 * if (calculation) {
 *   console.log('Corrected time:', calculation.correctedTime);
 *   console.log('Factor applied:', calculation.factor);
 * }
 * ```
 */
export function useReciprocityCalculator(): ReciprocityCalculatorState & {
  exposurePresets: number[];
  filmTypes: typeof RECIPROCITY_FILM_TYPES;
} {
  const [filmType, setFilmType] = useState(RECIPROCITY_FILM_TYPES[0].value);
  const [meteredTime, setMeteredTime] = useState(
    DEFAULT_RECIPROCITY_METERED_TIME
  );
  const [customFactor, setCustomFactor] = useState(
    DEFAULT_RECIPROCITY_CUSTOM_FACTOR
  );
  const [formattedTime, setFormattedTime] = useState<string | null>(() => {
    const initialSeconds = parseReciprocityTime(
      DEFAULT_RECIPROCITY_METERED_TIME
    );
    return initialSeconds !== null
      ? formatReciprocityTime(initialSeconds)
      : null;
  });
  const [timeFormatError, setTimeFormatError] = useState<string | null>(null);
  const [lastValidCalculation, setLastValidCalculation] =
    useState<ReciprocityCalculation | null>(null);

  const handleTimeChange = useCallback((value: string) => {
    const parsedSeconds = parseReciprocityTime(value);

    setMeteredTime(value);
    setTimeFormatError(null);

    if (parsedSeconds !== null) {
      setFormattedTime(formatReciprocityTime(parsedSeconds));
    } else if (value.trim()) {
      setTimeFormatError('Invalid time format. Try: 30s, 1m30s, 1h15m');
      setFormattedTime(null);
    } else {
      setFormattedTime(null);
    }
  }, []);

  const currentCalculation = useMemo<ReciprocityCalculation | null>(() => {
    const meteredSeconds = parseReciprocityTime(meteredTime);

    if (meteredSeconds === null) {
      return null;
    }

    return calculateReciprocity({
      meteredSeconds,
      filmType,
      // The hook holds the factor as an input string; the shared calculation
      // takes a number and treats an unparseable one as "no correction".
      customFactor: parseFloat(customFactor),
    });
  }, [customFactor, filmType, meteredTime]);

  useEffect(() => {
    if (currentCalculation) {
      setLastValidCalculation(currentCalculation);
    }
  }, [currentCalculation]);

  const calculation = currentCalculation ?? lastValidCalculation;

  const setMeteredTimeDirectly = useCallback((value: string) => {
    setMeteredTime(value);
    setTimeFormatError(null);

    const parsedSeconds = parseReciprocityTime(value);
    if (parsedSeconds !== null) {
      setFormattedTime(formatReciprocityTime(parsedSeconds));
    } else {
      setFormattedTime(null);
    }
  }, []);

  return {
    filmType,
    setFilmType,
    meteredTime,
    setMeteredTime: handleTimeChange,
    setMeteredTimeDirectly,
    customFactor,
    setCustomFactor,
    formattedTime,
    timeFormatError,
    calculation,
    formatTime: formatReciprocityTime,
    exposurePresets: RECIPROCITY_EXPOSURE_PRESETS,
    filmTypes: RECIPROCITY_FILM_TYPES,
  };
}
