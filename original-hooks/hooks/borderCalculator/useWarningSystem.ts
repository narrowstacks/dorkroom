/* ------------------------------------------------------------------ *\
   useWarningSystem.ts
   -------------------------------------------------------------
   Hook for debounced warning management to prevent flashing
   -------------------------------------------------------------
   Exports:
     - useWarningSystem: Debounced warning state management
\* ------------------------------------------------------------------ */

import { useEffect, useRef, useCallback } from "react";
import { CALCULATION_CONSTANTS } from "@/constants/calculations";
import type { BorderCalculatorState, WarningTimeouts } from "./types";

export const useWarningSystem = (
  state: BorderCalculatorState,
  dispatch: (action: any) => void,
  warnings: {
    offsetWarning: string | null;
    bladeWarning: string | null;
    minBorderWarning: string | null;
    paperSizeWarning: string | null;
    lastValidMinBorder: number;
  },
) => {
  const warningTimeouts = useRef<WarningTimeouts>({
    offset: null,
    blade: null,
    minBorder: null,
    paperSize: null,
  });

  const debouncedWarningUpdate = useCallback(
    (
      warningType: keyof WarningTimeouts,
      newValue: string | null,
      currentValue: string | null,
      stateKey: keyof BorderCalculatorState,
    ) => {
      // Clear existing timeout
      if (warningTimeouts.current[warningType]) {
        clearTimeout(warningTimeouts.current[warningType]!);
      }

      // If warning is being cleared (newValue is null), update immediately
      if (newValue === null && currentValue !== null) {
        dispatch({ type: "SET_FIELD", key: stateKey, value: null });
        return;
      }

      // If warning is appearing or changing, debounce it
      if (newValue !== currentValue) {
        warningTimeouts.current[warningType] = setTimeout(() => {
          dispatch({ type: "SET_FIELD", key: stateKey, value: newValue });
        }, CALCULATION_CONSTANTS.DEBOUNCE_WARNING_DELAY);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    // Handle each warning type with debouncing
    debouncedWarningUpdate(
      "offset",
      warnings.offsetWarning,
      state.offsetWarning,
      "offsetWarning",
    );
    debouncedWarningUpdate(
      "blade",
      warnings.bladeWarning,
      state.bladeWarning,
      "bladeWarning",
    );
    debouncedWarningUpdate(
      "minBorder",
      warnings.minBorderWarning,
      state.minBorderWarning,
      "minBorderWarning",
    );
    debouncedWarningUpdate(
      "paperSize",
      warnings.paperSizeWarning,
      state.paperSizeWarning,
      "paperSizeWarning",
    );

    // Update lastValidMinBorder immediately (not a UI warning)
    if (warnings.lastValidMinBorder !== state.lastValidMinBorder) {
      dispatch({
        type: "SET_FIELD",
        key: "lastValidMinBorder",
        value: warnings.lastValidMinBorder,
      });
    }

    // Cleanup timeouts on unmount
    return () => {
      const timeouts = warningTimeouts.current;
      Object.values(timeouts).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [
    warnings.offsetWarning,
    warnings.bladeWarning,
    warnings.minBorderWarning,
    warnings.paperSizeWarning,
    warnings.lastValidMinBorder,
    state.offsetWarning,
    state.bladeWarning,
    state.minBorderWarning,
    state.paperSizeWarning,
    state.lastValidMinBorder,
    debouncedWarningUpdate,
    dispatch,
  ]);

  return {
    // No return value needed, this hook manages side effects
  };
};
