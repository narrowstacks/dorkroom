/* ------------------------------------------------------------------ *
   use-input-handlers.ts
   -------------------------------------------------------------
   Hook for validated slider, select and toggle setters
   -------------------------------------------------------------
   Exports:
     - useInputHandlers: Input validation and setter functions
\* ------------------------------------------------------------------ */

import { useCallback } from 'react';
import {
  aspectRatioOptions,
  aspectRatioValueSchema,
  paperSizeOptions,
  paperSizeValueSchema,
} from '../../schemas/border-calculator.schema';
import type {
  AspectRatioValue,
  BorderCalculatorAction,
  BorderCalculatorState,
  PaperSizeValue,
} from '../../types/border-calculator';
import { debugError } from '../../utils/debug-logger';

/**
 * Validates a string against the AspectRatioValue contract.
 * @returns The valid AspectRatioValue or null if invalid
 */
function validateAspectRatio(value: string): AspectRatioValue | null {
  const parsed = aspectRatioValueSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  debugError(
    `Invalid aspect ratio value: "${value}". Expected one of: ${aspectRatioOptions.join(
      ', '
    )}`
  );
  return null;
}

/**
 * Validates a string against the PaperSizeValue contract.
 * @returns The valid PaperSizeValue or null if invalid
 */
function validatePaperSize(value: string): PaperSizeValue | null {
  const parsed = paperSizeValueSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  debugError(
    `Invalid paper size value: "${value}". Expected one of: ${paperSizeOptions.join(
      ', '
    )}`
  );
  return null;
}

/**
 * Input handling hook for the border calculator: setters for sliders,
 * dropdowns and toggles, plus preset and reset actions. Every value it
 * dispatches is already the field's type (numbers for numeric fields).
 *
 * @param state - Current border calculator state
 * @param dispatch - State update dispatch function
 * @returns Object containing all input setter functions and utility actions
 *
 * @example
 * ```typescript
 * const { state, dispatch } = useBorderCalculatorState();
 * const {
 *   setMinBorderSlider,
 *   setAspectRatio,
 *   setEnableOffset,
 *   resetToDefaults
 * } = useInputHandlers(state, dispatch);
 *
 * // For sliders (immediate updates)
 * setMinBorderSlider(0.75);
 *
 * // For dropdowns
 * setAspectRatio('4:3');
 *
 * // For toggles
 * setEnableOffset(true);
 * ```
 */
export const useInputHandlers = (
  state: BorderCalculatorState,
  dispatch: (action: BorderCalculatorAction) => void
) => {
  // Optimized slider input handler - no debouncing, direct numeric conversion
  const setSliderField = useCallback(
    (key: keyof BorderCalculatorState, v: string | number) => {
      // Convert to number directly since sliders always provide valid numeric values
      const numericValue = parseFloat(String(v));

      // Only update if the value actually changed to prevent unnecessary re-renders
      if (state[key] !== numericValue) {
        dispatch({ type: 'SET_FIELD', key, value: numericValue });
      }
    },
    [dispatch, state]
  );

  // Basic field setters
  const setAspectRatio = useCallback(
    (v: string) => {
      const validatedRatio = validateAspectRatio(v);
      if (validatedRatio !== null) {
        dispatch({ type: 'SET_ASPECT_RATIO', value: validatedRatio });
      }
    },
    [dispatch]
  );

  const setPaperSize = useCallback(
    (v: string) => {
      const validatedSize = validatePaperSize(v);
      if (validatedSize !== null) {
        dispatch({ type: 'SET_PAPER_SIZE', value: validatedSize });
      }
    },
    [dispatch]
  );

  // Slider field setters (optimized for continuous updates)
  const setMinBorderSlider = useCallback(
    (v: string | number) => setSliderField('minBorder', v),
    [setSliderField]
  );

  const setHorizontalOffsetSlider = useCallback(
    (v: string | number) => setSliderField('horizontalOffset', v),
    [setSliderField]
  );

  const setVerticalOffsetSlider = useCallback(
    (v: string | number) => setSliderField('verticalOffset', v),
    [setSliderField]
  );

  // Boolean field setters
  const setEnableOffset = useCallback(
    (v: boolean) => {
      dispatch({ type: 'SET_FIELD', key: 'enableOffset', value: v });
    },
    [dispatch]
  );

  const setIgnoreMinBorder = useCallback(
    (v: boolean) => {
      dispatch({ type: 'SET_FIELD', key: 'ignoreMinBorder', value: v });
    },
    [dispatch]
  );

  const setShowBlades = useCallback(
    (v: boolean) => {
      dispatch({ type: 'SET_FIELD', key: 'showBlades', value: v });
    },
    [dispatch]
  );

  const setShowBladeReadings = useCallback(
    (v: boolean) => {
      dispatch({ type: 'SET_FIELD', key: 'showBladeReadings', value: v });
    },
    [dispatch]
  );

  const setIsLandscape = useCallback(
    (v: boolean) => {
      dispatch({ type: 'SET_FIELD', key: 'isLandscape', value: v });
    },
    [dispatch]
  );

  const setIsRatioFlipped = useCallback(
    (v: boolean) => {
      dispatch({ type: 'SET_FIELD', key: 'isRatioFlipped', value: v });
    },
    [dispatch]
  );

  // Utility actions
  const applyPreset = useCallback(
    (preset: Partial<BorderCalculatorState>) => {
      dispatch({ type: 'BATCH_UPDATE', payload: preset });
    },
    [dispatch]
  );

  const resetToDefaults = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  return {
    // Basic setters
    setAspectRatio,
    setPaperSize,

    // Slider field setters (optimized, no debouncing)
    setMinBorderSlider,
    setHorizontalOffsetSlider,
    setVerticalOffsetSlider,

    // Boolean field setters
    setEnableOffset,
    setIgnoreMinBorder,
    setShowBlades,
    setShowBladeReadings,
    setIsLandscape,
    setIsRatioFlipped,

    // Utility actions
    applyPreset,
    resetToDefaults,
  };
};
