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
import { parseDecimalInput } from '../utils/input-validation';
import {
  calculateReciprocity,
  formatReciprocityTime,
  parseReciprocityTime,
} from '../utils/reciprocity-calculations';

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
  const [customFactor, setCustomFactor] = useState(() =>
    String(DEFAULT_RECIPROCITY_CUSTOM_FACTOR)
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
      customFactor: parseDecimalInput(customFactor),
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
