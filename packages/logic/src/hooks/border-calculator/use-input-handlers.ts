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
import type {
  BorderCalculatorState,
  BorderCalculatorAction,
} from '../../types/border-calculator';

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
      dispatch({ type: 'SET_ASPECT_RATIO', value: v });
    },
    [dispatch]
  );

  const setPaperSize = useCallback(
    (v: string) => {
      dispatch({ type: 'SET_PAPER_SIZE', value: v });
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
