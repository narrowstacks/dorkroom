/* ------------------------------------------------------------------ *
   use-input-handlers.ts
   -------------------------------------------------------------
   Hook for input validation and debounced field handlers
   -------------------------------------------------------------
   Exports:
     - useInputHandlers: Input validation and setter functions
\* ------------------------------------------------------------------ */

import { useCallback, useMemo } from 'react';
import { tryNumber, debounce } from '../../utils/input-validation';
import { debugError } from '../../utils/debug-logger';
import type {
  BorderCalculatorState,
  BorderCalculatorAction,
  AspectRatioValue,
  PaperSizeValue,
} from '../../types/border-calculator';

// Validation sets for discriminated union types
const VALID_ASPECT_RATIOS = new Set<AspectRatioValue>([
  'custom',
  'even-borders',
  '3:2',
  '65:24',
  '4:3',
  '1:1',
  '7:6',
  '5:4',
  '7:5',
  '16:9',
  '1.37:1',
  '1.85:1',
  '2:1',
  '2.39:1',
  '2.76:1',
]);

const VALID_PAPER_SIZES = new Set<PaperSizeValue>([
  'custom',
  '5x7',
  '4x6',
  '8x10',
  '11x14',
  '16x20',
  '20x24',
]);

/**
 * Validates and safely casts a value to AspectRatioValue
 * @returns The valid AspectRatioValue or null if invalid
 */
function validateAspectRatio(value: string): AspectRatioValue | null {
  if (VALID_ASPECT_RATIOS.has(value as AspectRatioValue)) {
    return value as AspectRatioValue;
  }
  debugError(
    `Invalid aspect ratio value: "${value}". Expected one of: ${Array.from(
      VALID_ASPECT_RATIOS
    ).join(', ')}`
  );
  return null;
}

/**
 * Validates and safely casts a value to PaperSizeValue
 * @returns The valid PaperSizeValue or null if invalid
 */
function validatePaperSize(value: string): PaperSizeValue | null {
  if (VALID_PAPER_SIZES.has(value as PaperSizeValue)) {
    return value as PaperSizeValue;
  }
  debugError(
    `Invalid paper size value: "${value}". Expected one of: ${Array.from(
      VALID_PAPER_SIZES
    ).join(', ')}`
  );
  return null;
}

/**
 * Input handling hook for the border calculator that provides optimized setter functions
 * for different types of inputs (text, sliders, dropdowns, toggles).
 * Includes debouncing for text inputs and direct updates for sliders to ensure smooth UX.
 *
 * @param state - Current border calculator state
 * @param dispatch - State update dispatch function
 * @returns Object containing all input setter functions and utility actions
 *
 * @example
 * ```typescript
 * const { state, dispatch } = useBorderCalculatorState();
 * const {
 *   setMinBorder,
 *   setMinBorderSlider,
 *   setAspectRatio,
 *   setEnableOffset,
 *   resetToDefaults
 * } = useInputHandlers(state, dispatch);
 *
 * // For text inputs (debounced)
 * setMinBorder('0.75');
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
  // Debounced numeric field setter for text input only (not sliders)
  const debouncedNumericFieldSetter = useMemo(
    () =>
      debounce((key: keyof BorderCalculatorState, v: string) => {
        const num = tryNumber(v);

        if (num !== null) {
          // The user has entered a complete number – store it as a number.
          dispatch({ type: 'SET_FIELD', key, value: num });
          return;
        }

        // Allow "in-progress" numeric strings such as "", "-", ".", "0.", "-."
        // so the user can keep typing without the input being overridden.
        if (/^-?\d*\.?$/.test(v)) {
          dispatch({ type: 'SET_FIELD', key, value: v });
        }
      }, 50), // 50ms for ultra-responsive input
    [dispatch]
  );

  // Optimized slider input handler - no debouncing, direct numeric conversion
  const setSliderField = useCallback(
    (key: keyof BorderCalculatorState, v: string | number) => {
      // Convert to number directly since sliders always provide valid numeric values
      const numericValue = typeof v === 'number' ? v : parseFloat(v);

      // Only update if the value actually changed to prevent unnecessary re-renders
      if (state[key] !== numericValue) {
        dispatch({ type: 'SET_FIELD', key, value: numericValue });
      }
    },
    [dispatch, state]
  );

  // Text input handler with debouncing
  const setNumericField = useCallback(
    (key: keyof BorderCalculatorState, v: string) => {
      // For immediate UI feedback, allow the input to update immediately
      // but debounce the actual number parsing and validation
      if (/^-?\d*\.?\d*$/.test(v) || v === '') {
        dispatch({ type: 'SET_FIELD', key, value: v });
      }

      // Debounce the heavy number validation
      debouncedNumericFieldSetter(key, v);
    },
    [debouncedNumericFieldSetter, dispatch]
  );

  const setCustomDimensionField = useCallback(
    (
      key: keyof BorderCalculatorState,
      lastKey: keyof BorderCalculatorState,
      v: string
    ) => {
      dispatch({ type: 'SET_FIELD', key, value: v });
      const num = tryNumber(v);
      if (num && num > 0)
        dispatch({ type: 'SET_FIELD', key: lastKey, value: num });
    },
    [dispatch]
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

  // Custom dimension setters
  const setCustomAspectWidth = useCallback(
    (v: string | number) => {
      const stringValue = typeof v === 'string' ? v : String(v);
      setCustomDimensionField(
        'customAspectWidth',
        'lastValidCustomAspectWidth',
        stringValue
      );
    },
    [setCustomDimensionField]
  );

  const setCustomAspectHeight = useCallback(
    (v: string | number) => {
      const stringValue = typeof v === 'string' ? v : String(v);
      setCustomDimensionField(
        'customAspectHeight',
        'lastValidCustomAspectHeight',
        stringValue
      );
    },
    [setCustomDimensionField]
  );

  const setCustomPaperWidth = useCallback(
    (v: string | number) => {
      const stringValue = typeof v === 'string' ? v : String(v);
      setCustomDimensionField(
        'customPaperWidth',
        'lastValidCustomPaperWidth',
        stringValue
      );
    },
    [setCustomDimensionField]
  );

  const setCustomPaperHeight = useCallback(
    (v: string | number) => {
      const stringValue = typeof v === 'string' ? v : String(v);
      setCustomDimensionField(
        'customPaperHeight',
        'lastValidCustomPaperHeight',
        stringValue
      );
    },
    [setCustomDimensionField]
  );

  // Numeric field setters (for text inputs)
  const setMinBorder = useCallback(
    (v: string | number) => {
      const stringValue = typeof v === 'string' ? v : String(v);
      setNumericField('minBorder', stringValue);
    },
    [setNumericField]
  );

  const setHorizontalOffset = useCallback(
    (v: string | number) => {
      const stringValue = typeof v === 'string' ? v : String(v);
      setNumericField('horizontalOffset', stringValue);
    },
    [setNumericField]
  );

  const setVerticalOffset = useCallback(
    (v: string | number) => {
      const stringValue = typeof v === 'string' ? v : String(v);
      setNumericField('verticalOffset', stringValue);
    },
    [setNumericField]
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

    // Custom dimension setters
    setCustomAspectWidth,
    setCustomAspectHeight,
    setCustomPaperWidth,
    setCustomPaperHeight,

    // Numeric field setters (for text inputs)
    setMinBorder,
    setHorizontalOffset,
    setVerticalOffset,

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
