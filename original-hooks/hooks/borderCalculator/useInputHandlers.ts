/* ------------------------------------------------------------------ *\
   useInputHandlers.ts
   -------------------------------------------------------------
   Hook for input validation and debounced field handlers
   -------------------------------------------------------------
   Exports:
     - useInputHandlers: Input validation and setter functions
\* ------------------------------------------------------------------ */

import { useCallback, useMemo } from 'react';
import { tryNumber, debounce } from '../utils/inputValidation';
import { debugLogPerformance, debugLogTiming } from '@/utils/debugLogger';
import type { BorderCalculatorState } from './types';

export const useInputHandlers = (
  state: BorderCalculatorState,
  dispatch: (action: any) => void
) => {
  // Debounced numeric field setter for text input only (not sliders)
  const debouncedNumericFieldSetter = useMemo(
    () =>
      debounce((key: keyof BorderCalculatorState, v: string) => {
        const startTime = debugLogTiming(
          `Border Calculator - ${key} Input Processing`
        );
        const num = tryNumber(v);

        if (num !== null) {
          // The user has entered a complete number – store it as a number.
          debugLogPerformance(`Border Calculator - ${key} Value Change`, {
            field: key,
            oldValue: state[key],
            newValue: num,
            type: 'numeric',
            timestamp: new Date().toISOString(),
          });
          dispatch({ type: 'SET_FIELD', key, value: num });
          if (startTime)
            debugLogTiming(
              `Border Calculator - ${key} Input Processing`,
              startTime
            );
          return;
        }

        // Allow "in-progress" numeric strings such as "", "-", ".", "0.", "-."
        // so the user can keep typing without the input being overridden.
        if (/^-?\d*\.?$/.test(v)) {
          debugLogPerformance(`Border Calculator - ${key} In-Progress Input`, {
            field: key,
            value: v,
            type: 'in-progress',
            timestamp: new Date().toISOString(),
          });
          dispatch({ type: 'SET_FIELD', key, value: v });
        }
        if (startTime)
          debugLogTiming(
            `Border Calculator - ${key} Input Processing`,
            startTime
          );
      }, 50), // Further reduced to 50ms for ultra-responsive input
    [dispatch, state]
  );

  // Optimized slider input handler - no debouncing, direct numeric conversion
  const setSliderField = useCallback(
    (key: keyof BorderCalculatorState, v: string | number) => {
      const startTime = debugLogTiming(
        `Border Calculator - ${key} Slider Input`
      );

      // Convert to number directly since sliders always provide valid numeric values
      const numericValue = typeof v === 'number' ? v : parseFloat(v);

      // Only update if the value actually changed to prevent unnecessary re-renders
      if (state[key] !== numericValue) {
        debugLogPerformance(`Border Calculator - ${key} Value Change`, {
          field: key,
          oldValue: state[key],
          newValue: numericValue,
          type: 'slider',
          timestamp: new Date().toISOString(),
        });
        dispatch({ type: 'SET_FIELD', key, value: numericValue });
      }

      if (startTime)
        debugLogTiming(`Border Calculator - ${key} Slider Input`, startTime);
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
      debugLogPerformance('Border Calculator - Aspect Ratio Change', {
        field: 'aspectRatio',
        oldValue: state.aspectRatio,
        newValue: v,
        type: 'selection',
        timestamp: new Date().toISOString(),
      });
      dispatch({ type: 'SET_ASPECT_RATIO', value: v });
    },
    [dispatch, state.aspectRatio]
  );

  const setPaperSize = useCallback(
    (v: string) => {
      debugLogPerformance('Border Calculator - Paper Size Change', {
        field: 'paperSize',
        oldValue: state.paperSize,
        newValue: v,
        type: 'selection',
        timestamp: new Date().toISOString(),
      });
      dispatch({ type: 'SET_PAPER_SIZE', value: v });
    },
    [dispatch, state.paperSize]
  );

  // Custom dimension setters
  const setCustomAspectWidth = useCallback(
    (v: string) =>
      setCustomDimensionField(
        'customAspectWidth',
        'lastValidCustomAspectWidth',
        v
      ),
    [setCustomDimensionField]
  );

  const setCustomAspectHeight = useCallback(
    (v: string) =>
      setCustomDimensionField(
        'customAspectHeight',
        'lastValidCustomAspectHeight',
        v
      ),
    [setCustomDimensionField]
  );

  const setCustomPaperWidth = useCallback(
    (v: string) =>
      setCustomDimensionField(
        'customPaperWidth',
        'lastValidCustomPaperWidth',
        v
      ),
    [setCustomDimensionField]
  );

  const setCustomPaperHeight = useCallback(
    (v: string) =>
      setCustomDimensionField(
        'customPaperHeight',
        'lastValidCustomPaperHeight',
        v
      ),
    [setCustomDimensionField]
  );

  // Numeric field setters (for text inputs)
  const setMinBorder = useCallback(
    (v: string) => setNumericField('minBorder', v),
    [setNumericField]
  );

  const setHorizontalOffset = useCallback(
    (v: string) => setNumericField('horizontalOffset', v),
    [setNumericField]
  );

  const setVerticalOffset = useCallback(
    (v: string) => setNumericField('verticalOffset', v),
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

  // Boolean field setters with performance logging
  const setEnableOffset = useCallback(
    (v: boolean) => {
      debugLogPerformance('Border Calculator - Enable Offset Toggle', {
        field: 'enableOffset',
        oldValue: state.enableOffset,
        newValue: v,
        type: 'boolean',
        timestamp: new Date().toISOString(),
      });
      dispatch({ type: 'SET_FIELD', key: 'enableOffset', value: v });
    },
    [dispatch, state.enableOffset]
  );

  const setIgnoreMinBorder = useCallback(
    (v: boolean) => {
      debugLogPerformance('Border Calculator - Ignore Min Border Toggle', {
        field: 'ignoreMinBorder',
        oldValue: state.ignoreMinBorder,
        newValue: v,
        type: 'boolean',
        timestamp: new Date().toISOString(),
      });
      dispatch({ type: 'SET_FIELD', key: 'ignoreMinBorder', value: v });
    },
    [dispatch, state.ignoreMinBorder]
  );

  const setShowBlades = useCallback(
    (v: boolean) => {
      debugLogPerformance('Border Calculator - Show Blades Toggle', {
        field: 'showBlades',
        oldValue: state.showBlades,
        newValue: v,
        type: 'boolean',
        timestamp: new Date().toISOString(),
      });
      dispatch({ type: 'SET_FIELD', key: 'showBlades', value: v });
    },
    [dispatch, state.showBlades]
  );

  const setIsLandscape = useCallback(
    (v: boolean) => {
      debugLogPerformance('Border Calculator - Landscape Toggle', {
        field: 'isLandscape',
        oldValue: state.isLandscape,
        newValue: v,
        type: 'boolean',
        timestamp: new Date().toISOString(),
      });
      dispatch({ type: 'SET_FIELD', key: 'isLandscape', value: v });
    },
    [dispatch, state.isLandscape]
  );

  const setIsRatioFlipped = useCallback(
    (v: boolean) => {
      debugLogPerformance('Border Calculator - Ratio Flipped Toggle', {
        field: 'isRatioFlipped',
        oldValue: state.isRatioFlipped,
        newValue: v,
        type: 'boolean',
        timestamp: new Date().toISOString(),
      });
      dispatch({ type: 'SET_FIELD', key: 'isRatioFlipped', value: v });
    },
    [dispatch, state.isRatioFlipped]
  );

  // Utility actions with performance logging
  const applyPreset = useCallback(
    (preset: Partial<BorderCalculatorState>) => {
      const startTime = debugLogTiming('Border Calculator - Apply Preset');
      debugLogPerformance('Border Calculator - Preset Applied', {
        action: 'applyPreset',
        presetFields: Object.keys(preset),
        fieldCount: Object.keys(preset).length,
        timestamp: new Date().toISOString(),
      });
      dispatch({ type: 'BATCH_UPDATE', payload: preset });
      if (startTime)
        debugLogTiming('Border Calculator - Apply Preset', startTime);
    },
    [dispatch]
  );

  const resetToDefaults = useCallback(() => {
    const startTime = debugLogTiming('Border Calculator - Reset to Defaults');
    debugLogPerformance('Border Calculator - Reset to Defaults', {
      action: 'resetToDefaults',
      timestamp: new Date().toISOString(),
    });
    dispatch({ type: 'RESET' });
    if (startTime)
      debugLogTiming('Border Calculator - Reset to Defaults', startTime);
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
    setIsLandscape,
    setIsRatioFlipped,

    // Utility actions
    applyPreset,
    resetToDefaults,
  };
};
