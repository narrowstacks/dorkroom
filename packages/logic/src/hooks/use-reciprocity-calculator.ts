import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RECIPROCITY_EXPOSURE_PRESETS,
  RECIPROCITY_FILM_TYPES,
} from '../constants/reciprocity';
import type {
  ReciprocityCalculation,
  ReciprocityCalculatorState,
} from '../types/reciprocity';
import {
  DEFAULT_RECIPROCITY_METERED_TIME,
  DEFAULT_RECIPROCITY_CUSTOM_FACTOR,
  RECIPROCITY_MAX_BAR_WIDTH,
} from '../constants/reciprocity-calculator-defaults';

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
  if (seconds < 60) {
    return `${Math.round(seconds * 10) / 10}s`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round((seconds % 60) * 10) / 10;
    return remainingSeconds === 0
      ? `${minutes}m`
      : `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
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

  const hourMatch = cleaned.match(/(\d+(\.\d+)?)\s*h/);
  if (hourMatch) {
    seconds += parseFloat(hourMatch[1]) * 3600;
    valid = true;
  }

  const minuteMatch = cleaned.match(/(\d+(\.\d+)?)\s*m(?!s)/);
  if (minuteMatch) {
    seconds += parseFloat(minuteMatch[1]) * 60;
    valid = true;
  }

  const secondMatch = cleaned.match(/(\d+(\.\d+)?)\s*s/);
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
    const originalTime = parseReciprocityTime(meteredTime);

    if (!originalTime || originalTime <= 0) {
      return null;
    }

    let factor = 1;
    let filmName = '';

    if (filmType === 'custom') {
      factor = parseFloat(customFactor) || 1;
      filmName = 'Custom';
    } else {
      const selectedFilm = RECIPROCITY_FILM_TYPES.find(
        (film) => film.value === filmType
      );

      if (selectedFilm) {
        factor = selectedFilm.factor ?? 1;
        filmName = selectedFilm.label;
      }
    }

    const adjustedTime = Math.pow(originalTime, factor);
    const percentageIncrease =
      ((adjustedTime - originalTime) / originalTime) * 100;

    const logScale = (time: number) =>
      Math.min(
        RECIPROCITY_MAX_BAR_WIDTH,
        (Math.log(time + 1) / Math.log(Math.max(adjustedTime, 10) + 1)) *
          RECIPROCITY_MAX_BAR_WIDTH
      );

    const timeBarWidth = logScale(originalTime);
    const adjustedTimeBarWidth = logScale(adjustedTime);

    return {
      originalTime,
      adjustedTime,
      factor,
      filmName,
      percentageIncrease,
      timeBarWidth,
      adjustedTimeBarWidth,
    };
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
