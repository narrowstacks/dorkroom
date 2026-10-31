/* ------------------------------------------------------------------ *
   index.ts
   -------------------------------------------------------------
   Main border calculator hook - orchestrates all sub-hooks
   -------------------------------------------------------------
   Exports:
     - useStandaloneBorderCalculator: Main hook that composes all functionality
\* ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CALCULATION_CONSTANTS } from '../../constants/calculations';
import type { BorderCalculation } from '../../types/border-calculator';
import { computeBorderLayout } from '../../utils/border-layout';
import type { MeasurementUnit } from '../../utils/unit-conversion';
import { useWindowDimensions } from '../use-window-dimensions';
import { useBorderCalculatorState } from './use-border-calculator-state';
import { useInputHandlers } from './use-input-handlers';

type BorderWarnings = Pick<
  BorderCalculation,
  'offsetWarning' | 'bladeWarning' | 'minBorderWarning' | 'paperSizeWarning'
>;

const NO_WARNINGS: BorderWarnings = {
  offsetWarning: null,
  bladeWarning: null,
  minBorderWarning: null,
  paperSizeWarning: null,
};

const WARNING_DELAY = CALCULATION_CONSTANTS.DEBOUNCE_WARNING_DELAY;

/**
 * Self-contained border calculator: it owns its state (a reducer persisted to
 * `borderCalculatorState_v2`) and derives everything else with
 * `computeBorderLayout`. The iOS border screen uses it. The web page builds a
 * TanStack form instead and reads it through `@dorkroom/ui`'s
 * `useBorderCalculator` context hook, which is why this one is not called that.
 *
 * @param unit - Measurement unit the hook's warnings are written in. Results
 *   and state stay in inches either way. Defaults to imperial.
 * @returns Complete border calculator state and control functions
 *
 * @example
 * ```typescript
 * const {
 *   aspectRatio,
 *   paperSize,
 *   minBorder,
 *   calculation,
 *   setAspectRatio,
 *   setPaperSize,
 *   setMinBorder
 * } = useStandaloneBorderCalculator();
 *
 * // Set up calculation parameters
 * setAspectRatio('3:2');
 * setPaperSize('8x10');
 * setMinBorder(0.5);
 *
 * // Use the calculated results
 * console.log(`Print size: ${calculation.printWidth}" x ${calculation.printHeight}"`);
 * ```
 */
export const useStandaloneBorderCalculator = (
  unit: MeasurementUnit = 'imperial'
) => {
  // Core state management
  const { state, dispatch } = useBorderCalculatorState();

  // Geometry: the window size only sizes the on-screen preview
  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const { calculation } = useMemo(
    () =>
      computeBorderLayout(state, {
        unit,
        viewport: { width: viewportWidth, height: viewportHeight },
      }),
    [state, unit, viewportWidth, viewportHeight]
  );

  // lastValidMinBorder is real state (persisted, and the fallback the layout
  // uses while minBorder is out of range), so it is written back right away.
  useEffect(() => {
    if (calculation.lastValidMinBorder !== state.lastValidMinBorder) {
      dispatch({
        type: 'SET_FIELD',
        key: 'lastValidMinBorder',
        value: calculation.lastValidMinBorder,
      });
    }
  }, [calculation.lastValidMinBorder, state.lastValidMinBorder, dispatch]);

  // Warnings are derived, never stored in the reducer. The top-level ones
  // trail the calculation by DEBOUNCE_WARNING_DELAY so the warnings card does
  // not flash while a slider is dragged. Memoising on the four strings keeps
  // the object stable until one of them changes, so the delay restarts only
  // then, as it did when they were copied into reducer state.
  const liveWarnings: BorderWarnings = useMemo(
    () => ({
      offsetWarning: calculation.offsetWarning,
      bladeWarning: calculation.bladeWarning,
      minBorderWarning: calculation.minBorderWarning,
      paperSizeWarning: calculation.paperSizeWarning,
    }),
    [
      calculation.offsetWarning,
      calculation.bladeWarning,
      calculation.minBorderWarning,
      calculation.paperSizeWarning,
    ]
  );
  const [warnings, setWarnings] = useState(liveWarnings);
  useEffect(() => {
    const timeout = setTimeout(() => setWarnings(liveWarnings), WARNING_DELAY);
    return () => clearTimeout(timeout);
  }, [liveWarnings]);

  // Input handlers
  const { resetToDefaults: resetState, ...inputHandlers } = useInputHandlers(
    state,
    dispatch
  );

  // Reset clears the shown warnings at once, as the old reducer RESET did,
  // instead of letting them linger for the debounce.
  const resetToDefaults = useCallback(() => {
    setWarnings(NO_WARNINGS);
    resetState();
  }, [resetState]);

  /* =============================================================== *
     Public API
  * =============================================================== */

  return {
    /* primitive state values */
    aspectRatio: state.aspectRatio,
    paperSize: state.paperSize,
    customAspectWidth: state.customAspectWidth,
    customAspectHeight: state.customAspectHeight,
    customPaperWidth: state.customPaperWidth,
    customPaperHeight: state.customPaperHeight,
    minBorder: state.minBorder,
    enableOffset: state.enableOffset,
    ignoreMinBorder: state.ignoreMinBorder,
    horizontalOffset: state.horizontalOffset,
    verticalOffset: state.verticalOffset,
    showBlades: state.showBlades,
    showBladeReadings: state.showBladeReadings,
    isLandscape: state.isLandscape,
    isRatioFlipped: state.isRatioFlipped,

    /* warnings (debounced; `calculation` carries the live ones) */
    offsetWarning: warnings.offsetWarning,
    bladeWarning: warnings.bladeWarning,
    minBorderWarning: warnings.minBorderWarning,
    paperSizeWarning: warnings.paperSizeWarning,
    clampedHorizontalOffset: calculation.clampedHorizontalOffset,
    clampedVerticalOffset: calculation.clampedVerticalOffset,

    /* geometry results */
    calculation: {
      leftBorder: calculation.leftBorder,
      rightBorder: calculation.rightBorder,
      topBorder: calculation.topBorder,
      bottomBorder: calculation.bottomBorder,
      printWidth: calculation.printWidth,
      printHeight: calculation.printHeight,
      paperWidth: calculation.paperWidth,
      paperHeight: calculation.paperHeight,

      printWidthPercent: calculation.printWidthPercent,
      printHeightPercent: calculation.printHeightPercent,
      leftBorderPercent: calculation.leftBorderPercent,
      rightBorderPercent: calculation.rightBorderPercent,
      topBorderPercent: calculation.topBorderPercent,
      bottomBorderPercent: calculation.bottomBorderPercent,

      leftBladeReading: calculation.leftBladeReading,
      rightBladeReading: calculation.rightBladeReading,
      topBladeReading: calculation.topBladeReading,
      bottomBladeReading: calculation.bottomBladeReading,
      bladeThickness: calculation.bladeThickness,

      isNonStandardPaperSize: calculation.isNonStandardPaperSize,
      easelSize: calculation.easelSize,
      easelSizeLabel: calculation.easelSizeLabel,

      previewScale: calculation.previewScale,
      previewWidth: calculation.previewWidth,
      previewHeight: calculation.previewHeight,

      offsetWarning: calculation.offsetWarning,
      bladeWarning: calculation.bladeWarning,
      minBorderWarning: calculation.minBorderWarning,
      paperSizeWarning: calculation.paperSizeWarning,
      lastValidMinBorder: calculation.lastValidMinBorder,
      clampedHorizontalOffset: calculation.clampedHorizontalOffset,
      clampedVerticalOffset: calculation.clampedVerticalOffset,
    } satisfies BorderCalculation,

    /* setters (from input handlers) */
    ...inputHandlers,
    resetToDefaults,
  };
};

export default useStandaloneBorderCalculator;

export * from '../../types/border-calculator';
// Re-export sub-hooks for testing or advanced usage
export {
  initialState,
  useBorderCalculatorState,
} from './use-border-calculator-state';
export type { PresetShareMethod } from './use-calculator-sharing';
export { useCalculatorSharing } from './use-calculator-sharing';
export { useInputHandlers } from './use-input-handlers';
// UI-focused hooks
export { usePaperDimensionInput } from './use-paper-dimension-input';
export { usePresetManagement } from './use-preset-management';
