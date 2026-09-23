import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_EXPOSURE_ORIGINAL_TIME,
  DEFAULT_EXPOSURE_STOPS,
} from '../constants/exposure-calculator-defaults';
import type {
  ExposureCalculation,
  ExposureCalculatorState,
} from '../types/exposure-calculator';
import { EXPOSURE_PRESETS } from '../types/exposure-calculator';
import {
  calculateExposureAdjustment,
  calculateNewExposureTime,
  formatExposureTime,
  parseExposureTime,
  roundStopsToThirds,
} from '../utils/exposure-calculations';
import { parseDecimalInput } from '../utils/input-validation';
import { roundToStandardPrecision } from '../utils/precision';

/**
 * Stops are rounded and written back into state. Keep the separator the user
 * typed so a comma-decimal entry ("0,5") is not flipped to "0.5" under them.
 */
const inSeparatorOf = (typed: string, value: string): string =>
  typed.includes(',') ? value.replace('.', ',') : value;

/**
 * Exposure calculator hook for photography stop calculations.
 * Calculates new exposure times based on stop adjustments,
 * providing tools for exposure compensation and timing calculations.
 *
 * @returns Object containing calculator state, calculation results, and control functions
 * @example
 * ```typescript
 * const {
 *   originalTime,
 *   setOriginalTime,
 *   stops,
 *   setStops,
 *   calculation,
 *   resetToDefaults,
 *   presets
 * } = useExposureCalculator();
 *
 * // Set original exposure time and stop adjustment
 * setOriginalTime('10');
 * setStops('2'); // +2 stops
 *
 * // Get calculated results
 * if (calculation) {
 *   console.log('New time:', calculation.newTime); // 40 seconds
 *   console.log('Percentage increase:', calculation.percentageIncrease); // 300%
 * }
 * ```
 */
export const useExposureCalculator = () => {
  const [state, setState] = useState<ExposureCalculatorState>({
    originalTime: DEFAULT_EXPOSURE_ORIGINAL_TIME,
    stops: DEFAULT_EXPOSURE_STOPS,
    newTime: calculateNewExposureTime(
      parseFloat(DEFAULT_EXPOSURE_ORIGINAL_TIME),
      parseFloat(DEFAULT_EXPOSURE_STOPS)
    ).toString(),
  });

  // Calculate new time whenever inputs change
  const recalculateNewTime = useCallback(
    (originalTime: string, stops: string): string => {
      const originalTimeValue = parseExposureTime(originalTime);
      const stopsValue = parseDecimalInput(stops);

      if (
        originalTimeValue === null ||
        Number.isNaN(stopsValue) ||
        originalTimeValue <= 0
      ) {
        return '';
      }

      const newTimeValue = calculateNewExposureTime(
        originalTimeValue,
        stopsValue
      );
      return roundToStandardPrecision(newTimeValue).toString();
    },
    []
  );

  // Set original time
  const setOriginalTime = useCallback(
    (time: string) => {
      setState((prev) => {
        const newTime = recalculateNewTime(time, prev.stops);
        return {
          ...prev,
          originalTime: time,
          newTime,
        };
      });
    },
    [recalculateNewTime]
  );

  // Set stops value
  const setStops = useCallback(
    (stops: string) => {
      // Allow typing incomplete numbers
      if (
        stops === '' ||
        stops === '-' ||
        stops.endsWith('.') ||
        stops.endsWith(',')
      ) {
        setState((prev) => ({
          ...prev,
          stops,
          newTime: '',
        }));
        return;
      }

      const numericStops = parseDecimalInput(stops);
      if (!Number.isNaN(numericStops)) {
        const truncatedStops = inSeparatorOf(
          stops,
          roundToStandardPrecision(numericStops).toString()
        );
        setState((prev) => ({
          ...prev,
          stops: truncatedStops,
          newTime: recalculateNewTime(prev.originalTime, truncatedStops),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          stops,
          newTime: '',
        }));
      }
    },
    [recalculateNewTime]
  );

  // Adjust stops by increment
  const adjustStops = useCallback(
    (increment: number) => {
      const currentStops = parseDecimalInput(state.stops);
      if (Number.isNaN(currentStops)) return;

      const newStopsValue = roundStopsToThirds(currentStops + increment);
      const truncatedStops = inSeparatorOf(
        state.stops,
        roundToStandardPrecision(newStopsValue).toString()
      );

      setState((prev) => ({
        ...prev,
        stops: truncatedStops,
        newTime: recalculateNewTime(prev.originalTime, truncatedStops),
      }));
    },
    [state.stops, recalculateNewTime]
  );

  // Calculate derived values
  const calculation = useMemo((): ExposureCalculation | null => {
    const originalTimeValue = parseExposureTime(state.originalTime);
    // `newTime` is recalculated from originalTime + stops on every edit, so an
    // empty or unparseable one means the inputs are mid-edit, not that the
    // adjustment is invalid.
    const newTimeValue = state.newTime
      ? parseExposureTime(state.newTime)
      : null;

    if (originalTimeValue === null || newTimeValue === null) {
      return null;
    }

    return calculateExposureAdjustment(
      originalTimeValue,
      parseDecimalInput(state.stops)
    );
  }, [state.originalTime, state.stops, state.newTime]);

  return {
    // State
    originalTime: state.originalTime,
    stops: state.stops,
    newTime: state.newTime,

    // Actions
    setOriginalTime,
    setStops,
    adjustStops,

    // Calculated values
    calculation,

    // Utilities
    formatTime: formatExposureTime,
    presets: EXPOSURE_PRESETS,
  };
};

export type UseExposureCalculatorReturn = ReturnType<
  typeof useExposureCalculator
>;
