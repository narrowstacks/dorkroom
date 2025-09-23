/* ------------------------------------------------------------------ *\
   useBorderCalculatorState.ts
   -------------------------------------------------------------
   Core state management hook for border calculator
   -------------------------------------------------------------
   Exports:
     - useBorderCalculatorState: Main state hook with reducer and persistence
\* ------------------------------------------------------------------ */

import { useReducer, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASPECT_RATIOS, PAPER_SIZES } from '@/constants/border';
import type { BorderCalculatorState as PersistableState } from '@/types/borderPresetTypes';
import {
  BorderCalculatorState,
  BorderCalculatorAction,
  DEFAULT_MIN_BORDER,
  DEFAULT_CUSTOM_PAPER_WIDTH,
  DEFAULT_CUSTOM_PAPER_HEIGHT,
  DEFAULT_CUSTOM_ASPECT_WIDTH,
  DEFAULT_CUSTOM_ASPECT_HEIGHT,
  CALC_STORAGE_KEY,
} from './types';

/* ---------- initial state --------------------------------------- */

export const initialState: BorderCalculatorState = {
  aspectRatio: ASPECT_RATIOS[0].value,
  paperSize: PAPER_SIZES[3].value,

  customAspectWidth: DEFAULT_CUSTOM_ASPECT_WIDTH,
  customAspectHeight: DEFAULT_CUSTOM_ASPECT_HEIGHT,
  customPaperWidth: DEFAULT_CUSTOM_PAPER_WIDTH,
  customPaperHeight: DEFAULT_CUSTOM_PAPER_HEIGHT,

  lastValidCustomAspectWidth: DEFAULT_CUSTOM_ASPECT_WIDTH,
  lastValidCustomAspectHeight: DEFAULT_CUSTOM_ASPECT_HEIGHT,
  lastValidCustomPaperWidth: DEFAULT_CUSTOM_PAPER_WIDTH,
  lastValidCustomPaperHeight: DEFAULT_CUSTOM_PAPER_HEIGHT,

  minBorder: DEFAULT_MIN_BORDER,
  enableOffset: false,
  ignoreMinBorder: false,
  horizontalOffset: 0,
  verticalOffset: 0,
  showBlades: false,
  isLandscape: true,
  isRatioFlipped: false,

  offsetWarning: null,
  bladeWarning: null,
  minBorderWarning: null,
  paperSizeWarning: null,
  lastValidMinBorder: DEFAULT_MIN_BORDER,

  selectedImageUri: null,
  imageDimensions: { width: 0, height: 0 },
  isCropping: false,
  cropOffset: { x: 0, y: 0 },
  cropScale: 1,
};

/* ---------- reducer --------------------------------------------- */

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

    case 'RESET':
      return { ...initialState };

    case 'INTERNAL_UPDATE':
      return { ...state, ...action.payload };

    case 'SET_IMAGE_CROP_DATA':
      return { ...state, ...action.payload };

    case 'BATCH_UPDATE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

/* ---------- hook ------------------------------------------------ */

export const useBorderCalculatorState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Persistable state (subset of full state that should be saved)
  const persistableState: PersistableState = useMemo(
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
      isLandscape: state.isLandscape,
      isRatioFlipped: state.isRatioFlipped,
      lastValidCustomAspectWidth: state.lastValidCustomAspectWidth,
      lastValidCustomAspectHeight: state.lastValidCustomAspectHeight,
      lastValidCustomPaperWidth: state.lastValidCustomPaperWidth,
      lastValidCustomPaperHeight: state.lastValidCustomPaperHeight,
      lastValidMinBorder: state.lastValidMinBorder,
    }),
    [state]
  );

  // Load cached state on mount
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(CALC_STORAGE_KEY);
        if (json) {
          const cached: PersistableState = JSON.parse(json);
          if (cached && typeof cached === 'object') {
            dispatch({ type: 'BATCH_UPDATE', payload: cached });
          }
        }
      } catch (e) {
        console.warn('Failed to load calculator state', e);
      }
    })();
  }, []);

  // Optimized state persistence with debouncing to reduce AsyncStorage writes
  const debouncedPersistState = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (stateToSave: PersistableState) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        AsyncStorage.setItem(
          CALC_STORAGE_KEY,
          JSON.stringify(stateToSave)
        ).catch((e) => console.warn('Failed to save calculator state', e));
      }, 500); // Debounce saves by 500ms to avoid excessive writes
    };
  }, []);

  // Save state changes with debouncing
  useEffect(() => {
    debouncedPersistState(persistableState);
  }, [persistableState, debouncedPersistState]);

  return {
    state,
    dispatch,
  };
};
