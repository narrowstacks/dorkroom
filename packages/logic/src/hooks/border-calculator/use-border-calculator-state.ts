/* ------------------------------------------------------------------ *
   use-border-calculator-state.ts
   -------------------------------------------------------------
   Core state management for the border calculator (web adaptation)
\* ------------------------------------------------------------------ */

import { useEffect, useMemo, useReducer, useRef } from 'react';
import { z } from 'zod';
import { BORDER_CALCULATOR_DEFAULTS } from '../../constants/border-calculator-defaults';
import { BORDER_CALCULATOR_STORAGE_KEY } from '../../constants/storage-keys';
import { borderPresetSettingsFieldSchemas } from '../../schemas/border-calculator.schema';
import type {
  BorderCalculatorAction,
  BorderCalculatorState,
  BorderPresetSettings,
} from '../../types/border-calculator';
import { isBrowser } from '../../utils/environment';

/**
 * Field bounds for the persisted border-calculator snapshot: the preset
 * settings bounds plus the `lastValid*` fields, each bounded exactly like the
 * field it mirrors. They accept 0 because applying the built-in preset copies
 * its zeroed custom dimensions into them; the negative values issue #239
 * reported are what the bounds keep out. Exported so the web form's hydration
 * can validate the same keys one at a time.
 */
export const persistedBorderCalculatorFieldSchemas = {
  ...borderPresetSettingsFieldSchemas,
  lastValidCustomAspectWidth:
    borderPresetSettingsFieldSchemas.customAspectWidth,
  lastValidCustomAspectHeight:
    borderPresetSettingsFieldSchemas.customAspectHeight,
  lastValidCustomPaperWidth: borderPresetSettingsFieldSchemas.customPaperWidth,
  lastValidCustomPaperHeight:
    borderPresetSettingsFieldSchemas.customPaperHeight,
  lastValidMinBorder: borderPresetSettingsFieldSchemas.minBorder,
};

/**
 * The persisted border-calculator snapshot. Fields are optional so a snapshot
 * from an earlier build still hydrates; one that fails is discarded whole, not
 * partially dispatched into state. Exported because the mobile calculator
 * writes and reads the same `borderCalculatorState_v2` payload.
 */
export const persistedBorderCalculatorSchema = z
  .object(persistedBorderCalculatorFieldSchemas)
  .partial();

export type PersistedBorderCalculatorState = z.infer<
  typeof persistedBorderCalculatorSchema
>;
type PersistedState = PersistedBorderCalculatorState;

const createInitialState = (): BorderCalculatorState => {
  return {
    aspectRatio: BORDER_CALCULATOR_DEFAULTS.aspectRatio,
    paperSize: BORDER_CALCULATOR_DEFAULTS.paperSize,
    customAspectWidth: BORDER_CALCULATOR_DEFAULTS.customAspectWidth,
    customAspectHeight: BORDER_CALCULATOR_DEFAULTS.customAspectHeight,
    customPaperWidth: BORDER_CALCULATOR_DEFAULTS.customPaperWidth,
    customPaperHeight: BORDER_CALCULATOR_DEFAULTS.customPaperHeight,
    lastValidCustomAspectWidth: BORDER_CALCULATOR_DEFAULTS.customAspectWidth,
    lastValidCustomAspectHeight: BORDER_CALCULATOR_DEFAULTS.customAspectHeight,
    lastValidCustomPaperWidth: BORDER_CALCULATOR_DEFAULTS.customPaperWidth,
    lastValidCustomPaperHeight: BORDER_CALCULATOR_DEFAULTS.customPaperHeight,
    minBorder: BORDER_CALCULATOR_DEFAULTS.minBorder,
    enableOffset: BORDER_CALCULATOR_DEFAULTS.enableOffset,
    ignoreMinBorder: BORDER_CALCULATOR_DEFAULTS.ignoreMinBorder,
    horizontalOffset: BORDER_CALCULATOR_DEFAULTS.horizontalOffset,
    verticalOffset: BORDER_CALCULATOR_DEFAULTS.verticalOffset,
    showBlades: BORDER_CALCULATOR_DEFAULTS.showBlades,
    showBladeReadings: BORDER_CALCULATOR_DEFAULTS.showBladeReadings,
    isLandscape: BORDER_CALCULATOR_DEFAULTS.isLandscape,
    isRatioFlipped: BORDER_CALCULATOR_DEFAULTS.isRatioFlipped,
    hasManuallyFlippedPaper: false,
    offsetWarning: null,
    bladeWarning: null,
    minBorderWarning: null,
    paperSizeWarning: null,
    lastValidMinBorder: BORDER_CALCULATOR_DEFAULTS.minBorder,
    selectedImageUri: null,
    imageDimensions: { width: 0, height: 0 },
    isCropping: false,
    cropOffset: { x: 0, y: 0 },
    cropScale: 1,
  };
};

export const initialState = createInitialState();

function reducer(
  state: BorderCalculatorState,
  action: BorderCalculatorAction
): BorderCalculatorState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value };

    case 'SET_PAPER_SIZE': {
      const isCustom = action.value === 'custom';
      return {
        ...state,
        paperSize: action.value,
        isLandscape: !isCustom,
        isRatioFlipped: false,
        hasManuallyFlippedPaper: false,
      };
    }

    case 'SET_ASPECT_RATIO':
      return { ...state, aspectRatio: action.value, isRatioFlipped: false };

    case 'SET_IMAGE_FIELD':
      return { ...state, [action.key]: action.value };

    case 'SET_IMAGE_DIMENSIONS':
      return { ...state, imageDimensions: action.value };

    case 'SET_CROP_OFFSET':
      return { ...state, cropOffset: action.value };

    case 'SET_IMAGE_CROP_DATA':
      return { ...state, ...action.payload };

    case 'RESET':
      return createInitialState();

    case 'INTERNAL_UPDATE':
      return { ...state, ...action.payload };

    case 'BATCH_UPDATE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

/**
 * Core state management hook for the border calculator.
 * Handles state persistence, restoration, and provides the reducer dispatch function.
 * Automatically saves state to localStorage with debouncing to prevent excessive writes.
 *
 * @returns Object containing current state and dispatch function for state updates
 *
 * @example
 * ```typescript
 * const { state, dispatch } = useBorderCalculatorState();
 *
 * // Update a field directly
 * dispatch({ type: 'SET_FIELD', key: 'minBorder', value: 0.75 });
 *
 * // Reset to defaults
 * dispatch({ type: 'RESET' });
 *
 * // Batch update multiple fields
 * dispatch({
 *   type: 'BATCH_UPDATE',
 *   payload: { aspectRatio: '4:3', paperSize: '11x14' }
 * });
 * ```
 */
export const useBorderCalculatorState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistableState: BorderPresetSettings & Required<PersistedState> =
    useMemo(
      () => ({
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
        hasManuallyFlippedPaper: state.hasManuallyFlippedPaper,
        lastValidCustomAspectWidth: state.lastValidCustomAspectWidth,
        lastValidCustomAspectHeight: state.lastValidCustomAspectHeight,
        lastValidCustomPaperWidth: state.lastValidCustomPaperWidth,
        lastValidCustomPaperHeight: state.lastValidCustomPaperHeight,
        lastValidMinBorder: state.lastValidMinBorder,
      }),
      [state]
    );

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      const raw = window.localStorage.getItem(BORDER_CALCULATOR_STORAGE_KEY);
      if (!raw) return;

      const cached = persistedBorderCalculatorSchema.safeParse(JSON.parse(raw));
      if (cached.success) {
        dispatch({ type: 'BATCH_UPDATE', payload: cached.data });
      }
    } catch (error) {
      console.warn('Failed to load calculator state', error);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;

    if (persistTimeout.current) {
      clearTimeout(persistTimeout.current);
    }

    persistTimeout.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          BORDER_CALCULATOR_STORAGE_KEY,
          JSON.stringify(persistableState)
        );
      } catch (error) {
        console.warn('Failed to save calculator state', error);
      }
    }, 500);

    return () => {
      if (persistTimeout.current) {
        clearTimeout(persistTimeout.current);
        persistTimeout.current = null;
      }
    };
  }, [persistableState]);

  useEffect(
    () => () => {
      if (persistTimeout.current) {
        clearTimeout(persistTimeout.current);
      }
    },
    []
  );

  return { state, dispatch };
};
