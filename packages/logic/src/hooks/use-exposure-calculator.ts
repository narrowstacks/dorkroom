import { useState, useCallback, useMemo } from 'react';
import {
  calculateNewExposureTime,
  roundStopsToThirds,
  parseExposureTime,
  formatExposureTime,
  calculatePercentageIncrease,
} from '../utils/exposure-calculations';
import { roundToStandardPrecision } from '../utils/precision';
import type {
  ExposureCalculatorState,
  ExposureCalculation,
} from '../types/exposure-calculator';
import { EXPOSURE_PRESETS } from '../types/exposure-calculator';

const DEFAULT_ORIGINAL_TIME = '10';
const DEFAULT_STOPS = '1';

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
    originalTime: DEFAULT_ORIGINAL_TIME,
    stops: DEFAULT_STOPS,
    newTime: calculateNewExposureTime(
      parseFloat(DEFAULT_ORIGINAL_TIME),
      parseFloat(DEFAULT_STOPS)
    ).toString(),
  });

  // Calculate new time whenever inputs change
  const recalculateNewTime = useCallback(
    (originalTime: string, stops: string): string => {
      const originalTimeValue = parseExposureTime(originalTime);
      const stopsValue = parseFloat(stops);

      if (
        originalTimeValue === null ||
        isNaN(stopsValue) ||
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
      if (stops === '' || stops === '-' || stops.endsWith('.')) {
        setState((prev) => ({
          ...prev,
          stops,
          newTime: '',
        }));
        return;
      }

      const numericStops = parseFloat(stops);
      if (!isNaN(numericStops)) {
        const truncatedStops =
          roundToStandardPrecision(numericStops).toString();
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
      const currentStops = parseFloat(state.stops);
      if (isNaN(currentStops)) return;

      const newStopsValue = roundStopsToThirds(currentStops + increment);
      const truncatedStops = roundToStandardPrecision(newStopsValue).toString();

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
    const stopsValue = parseFloat(state.stops);
    const newTimeValue = parseExposureTime(state.newTime);

    if (
      originalTimeValue === null ||
      isNaN(stopsValue) ||
      newTimeValue === null ||
      originalTimeValue <= 0
    ) {
      return null;
    }

    const addedTime = newTimeValue - originalTimeValue;
    const percentageIncrease = calculatePercentageIncrease(
      originalTimeValue,
      newTimeValue
    );

    return {
      originalTimeValue,
      stopsValue,
      newTimeValue,
      addedTime,
      percentageIncrease,
      isValid: true,
    };
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
