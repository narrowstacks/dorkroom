/* ------------------------------------------------------------------ *
   use-border-calculator-state.ts
   -------------------------------------------------------------
   Core state management for the border calculator (web adaptation)
\* ------------------------------------------------------------------ */

import { useReducer, useEffect, useMemo, useRef } from 'react';
import {
  ASPECT_RATIOS,
  PAPER_SIZES,
} from '../../constants/border-calculator';
import type {
  BorderCalculatorState,
  BorderCalculatorAction,
  BorderPresetSettings,
} from '../../types/border-calculator';
import {
  DEFAULT_MIN_BORDER,
  DEFAULT_CUSTOM_PAPER_WIDTH,
  DEFAULT_CUSTOM_PAPER_HEIGHT,
  DEFAULT_CUSTOM_ASPECT_WIDTH,
  DEFAULT_CUSTOM_ASPECT_HEIGHT,
  CALC_STORAGE_KEY,
} from '../../types/border-calculator';

const isBrowser = () => typeof window !== 'undefined';

const createInitialState = (): BorderCalculatorState => ({
  aspectRatio: ASPECT_RATIOS[0].value,
  paperSize: PAPER_SIZES[2].value,

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
});

export const initialState = createInitialState();

function reducer(
  state: BorderCalculatorState,
  action: BorderCalculatorAction,
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
      return { ...state, [action.key]: action.value } as BorderCalculatorState;

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

export const useBorderCalculatorState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistableState: BorderPresetSettings & {
    lastValidCustomAspectWidth: number;
    lastValidCustomAspectHeight: number;
    lastValidCustomPaperWidth: number;
    lastValidCustomPaperHeight: number;
    lastValidMinBorder: number;
  } = useMemo(
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
    [state],
  );

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      const raw = window.localStorage.getItem(CALC_STORAGE_KEY);
      if (!raw) return;

      const cached = JSON.parse(raw);
      if (cached && typeof cached === 'object') {
        dispatch({ type: 'BATCH_UPDATE', payload: cached });
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
          CALC_STORAGE_KEY,
          JSON.stringify(persistableState),
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

  useEffect(() => () => {
    if (persistTimeout.current) {
      clearTimeout(persistTimeout.current);
    }
  }, []);

  return { state, dispatch };
};
