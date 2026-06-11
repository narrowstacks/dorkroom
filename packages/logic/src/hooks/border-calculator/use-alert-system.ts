/* ------------------------------------------------------------------ *
   use-alert-system.ts
   -------------------------------------------------------------
   Hook for debounced alert management
   -------------------------------------------------------------
   Exports:
     - useAlertSystem: Manages alert state with debouncing
\* ------------------------------------------------------------------ */

import { useEffect, useRef } from 'react';
import { CALCULATION_CONSTANTS } from '../../constants/calculations';
import type {
  BorderCalculatorAction,
  BorderCalculatorState,
} from '../../types/border-calculator';

interface WarningUpdateData {
  offsetWarning: string | null;
  bladeWarning: string | null;
  minBorderWarning: string | null;
  paperSizeWarning: string | null;
  lastValidMinBorder: number;
}

const WARNING_DELAY = CALCULATION_CONSTANTS.DEBOUNCE_WARNING_DELAY;

/**
 * Hook for managing warning state with debounced updates to prevent UI flashing.
 * Handles offset warnings, blade warnings, minimum border warnings, and paper size warnings.
 * Uses timeouts to debounce warning updates for a smoother user experience.
 *
 * @param state - Current border calculator state
 * @param dispatch - State update dispatch function
 * @param warningData - Warning data computed from calculations
 *
 * @example
 * ```typescript
 * useAlertSystem(state, dispatch, {
 *   offsetWarning: calculation.offsetWarning,
 *   bladeWarning: calculation.bladeWarning,
 *   minBorderWarning: calculation.minBorderWarning,
 *   paperSizeWarning: calculation.paperSizeWarning,
 *   lastValidMinBorder: calculation.lastValidMinBorder,
 * });
 * ```
 */
export const useAlertSystem = (
  state: BorderCalculatorState,
  dispatch: (action: BorderCalculatorAction) => void,
  warningData: WarningUpdateData
) => {
  const warningTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced warning updates to prevent flashing
  useEffect(() => {
    // Clear existing timeout
    if (warningTimeout.current) clearTimeout(warningTimeout.current);

    // Batch all debounced warning updates into a single delayed dispatch so the
    // effect performs one consolidated state update once the debounce elapses.
    warningTimeout.current = setTimeout(() => {
      const payload: Partial<
        Pick<
          BorderCalculatorState,
          | 'offsetWarning'
          | 'bladeWarning'
          | 'minBorderWarning'
          | 'paperSizeWarning'
        >
      > = {};
      if (state.offsetWarning !== warningData.offsetWarning) {
        payload.offsetWarning = warningData.offsetWarning;
      }
      if (state.bladeWarning !== warningData.bladeWarning) {
        payload.bladeWarning = warningData.bladeWarning;
      }
      if (state.minBorderWarning !== warningData.minBorderWarning) {
        payload.minBorderWarning = warningData.minBorderWarning;
      }
      if (state.paperSizeWarning !== warningData.paperSizeWarning) {
        payload.paperSizeWarning = warningData.paperSizeWarning;
      }
      if (Object.keys(payload).length > 0) {
        dispatch({ type: 'INTERNAL_UPDATE', payload });
      }
    }, WARNING_DELAY);

    // Update last valid min border immediately (no debouncing needed)
    if (state.lastValidMinBorder !== warningData.lastValidMinBorder) {
      dispatch({
        type: 'INTERNAL_UPDATE',
        payload: { lastValidMinBorder: warningData.lastValidMinBorder },
      });
    }

    // Cleanup function
    return () => {
      if (warningTimeout.current) clearTimeout(warningTimeout.current);
    };
  }, [
    warningData.offsetWarning,
    warningData.bladeWarning,
    warningData.minBorderWarning,
    warningData.paperSizeWarning,
    warningData.lastValidMinBorder,
    state.offsetWarning,
    state.bladeWarning,
    state.minBorderWarning,
    state.paperSizeWarning,
    state.lastValidMinBorder,
    dispatch,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (warningTimeout.current) clearTimeout(warningTimeout.current);
    };
  }, []);
};
