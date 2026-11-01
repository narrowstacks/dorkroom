/* ------------------------------------------------------------------ *
   use-border-calculator-state.ts
   -------------------------------------------------------------
   Core state management for the border calculator (web adaptation)
\* ------------------------------------------------------------------ */

import { useEffect, useMemo, useReducer, useRef } from 'react';
import { PAPER_SIZE_MAP } from '../../constants/border-calculator';
import { BORDER_CALCULATOR_STORAGE_KEY } from '../../constants/storage-keys';
import {
  initialState,
  persistedBorderCalculatorSchema,
  type PersistedBorderCalculatorState,
} from '../../schemas/border-calculator-persistence';
import { removeSupersededStorageKeys } from '../../services/local-storage';
import type {
  BorderCalculatorAction,
  BorderCalculatorState,
} from '../../types/border-calculator';
import { computeMaxAllowedMinBorder } from '../../utils/border-calculations';
import { usePersistenceStorage } from '../use-persisted-calculator';

type PersistedState = PersistedBorderCalculatorState;

function reducer(
  state: BorderCalculatorState,
  action: BorderCalculatorAction
): BorderCalculatorState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value };

    case 'SET_PAPER_SIZE': {
      const isCustom = action.value === 'custom';
      // A smaller sheet allows a smaller minimum border; clamp so a value
      // chosen on a big sheet cannot leave a degenerate print on a small one.
      // Custom/unknown sheets have no fixed size here, so they are not clamped.
      const paper = PAPER_SIZE_MAP.get(action.value);
      const maxBorder =
        paper && paper.width > 0 && paper.height > 0
          ? computeMaxAllowedMinBorder(paper.width, paper.height)
          : Number.POSITIVE_INFINITY;
      return {
        ...state,
        minBorder: Math.min(state.minBorder, maxBorder),
        lastValidMinBorder: Math.min(state.lastValidMinBorder, maxBorder),
        paperSize: action.value,
        isLandscape: !isCustom,
        isRatioFlipped: false,
        hasManuallyFlippedPaper: false,
      };
    }

    case 'SET_ASPECT_RATIO':
      return { ...state, aspectRatio: action.value, isRatioFlipped: false };

    case 'RESET':
      return { ...initialState };

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
  const storage = usePersistenceStorage();
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistableState: Required<PersistedState> = useMemo(
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

  // Hydrate once on mount. This reducer path validates the snapshot whole
  // (see persistedBorderCalculatorSchema) rather than field by field, so it
  // does not go through usePersistedCalculator, but it uses the same storage.
  useEffect(() => {
    try {
      const raw = storage.getItem(BORDER_CALCULATOR_STORAGE_KEY);
      if (!raw) return;
      removeSupersededStorageKeys(BORDER_CALCULATOR_STORAGE_KEY, storage);

      const cached = persistedBorderCalculatorSchema.safeParse(JSON.parse(raw));
      if (cached.success) {
        dispatch({ type: 'BATCH_UPDATE', payload: cached.data });
      }
    } catch (error) {
      console.warn('Failed to load calculator state', error);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydration; the storage provider is fixed for the app's lifetime
  }, []);

  useEffect(() => {
    if (persistTimeout.current) {
      clearTimeout(persistTimeout.current);
    }

    persistTimeout.current = setTimeout(() => {
      try {
        storage.setItem(
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
  }, [storage, persistableState]);

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
