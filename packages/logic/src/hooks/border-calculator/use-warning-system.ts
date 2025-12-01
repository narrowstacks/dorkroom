/* ------------------------------------------------------------------ *
   use-warning-system.ts
   -------------------------------------------------------------
   Hook for debounced warning management
   -------------------------------------------------------------
   Exports:
     - useWarningSystem: Manages warning state with debouncing
\* ------------------------------------------------------------------ */

import { useEffect, useRef } from 'react';
import { CALCULATION_CONSTANTS } from '../../constants/calculations';
import type {
  BorderCalculatorAction,
  BorderCalculatorState,
  WarningTimeouts,
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
 * useWarningSystem(state, dispatch, {
 *   offsetWarning: calculation.offsetWarning,
 *   bladeWarning: calculation.bladeWarning,
 *   minBorderWarning: calculation.minBorderWarning,
 *   paperSizeWarning: calculation.paperSizeWarning,
 *   lastValidMinBorder: calculation.lastValidMinBorder,
 * });
 * ```
 */
export const useWarningSystem = (
  state: BorderCalculatorState,
  dispatch: (action: BorderCalculatorAction) => void,
  warningData: WarningUpdateData
) => {
  const timeouts = useRef<WarningTimeouts>({
    offset: null,
    blade: null,
    minBorder: null,
    paperSize: null,
  });

  // Debounced warning updates to prevent flashing
  useEffect(() => {
    const currentTimeouts = timeouts.current;
    // Clear existing timeouts
    Object.values(currentTimeouts).forEach((timeout) => {
      if (timeout) clearTimeout(timeout);
    });

    // Set new debounced updates
    timeouts.current.offset = setTimeout(() => {
      if (state.offsetWarning !== warningData.offsetWarning) {
        dispatch({
          type: 'INTERNAL_UPDATE',
          payload: { offsetWarning: warningData.offsetWarning },
        });
      }
    }, WARNING_DELAY);

    timeouts.current.blade = setTimeout(() => {
      if (state.bladeWarning !== warningData.bladeWarning) {
        dispatch({
          type: 'INTERNAL_UPDATE',
          payload: { bladeWarning: warningData.bladeWarning },
        });
      }
    }, WARNING_DELAY);

    timeouts.current.minBorder = setTimeout(() => {
      if (state.minBorderWarning !== warningData.minBorderWarning) {
        dispatch({
          type: 'INTERNAL_UPDATE',
          payload: { minBorderWarning: warningData.minBorderWarning },
        });
      }
    }, WARNING_DELAY);

    timeouts.current.paperSize = setTimeout(() => {
      if (state.paperSizeWarning !== warningData.paperSizeWarning) {
        dispatch({
          type: 'INTERNAL_UPDATE',
          payload: { paperSizeWarning: warningData.paperSizeWarning },
        });
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
      Object.values(currentTimeouts).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
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
    const currentTimeouts = timeouts.current;
    return () => {
      Object.values(currentTimeouts).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);
};
