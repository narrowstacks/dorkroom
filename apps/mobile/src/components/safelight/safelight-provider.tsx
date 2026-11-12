import { createContext, type ReactNode, useContext, useMemo } from 'react';
import {
  type SafelightState,
  setSafelight,
  useSafelightValue,
} from '@/lib/safelight-store';

// No default value: a consumer outside the provider is a bug, and a silent
// no-op toggle would hide it.
const SafelightContext = createContext<SafelightState | null>(null);

/**
 * Provides the safelight state. The value comes from the MMKV-backed store, so
 * it is correct on the first render, and a toggle re-renders every consumer at
 * once with no reload and no navigation reset.
 */
export function SafelightProvider({ children }: { children: ReactNode }) {
  const on = useSafelightValue();
  const value = useMemo<SafelightState>(
    () => ({ on, setOn: setSafelight, toggle: () => setSafelight(!on) }),
    [on]
  );
  return (
    <SafelightContext.Provider value={value}>
      {children}
    </SafelightContext.Provider>
  );
}

export function useSafelight(): SafelightState {
  const state = useContext(SafelightContext);
  if (state === null) {
    throw new Error('useSafelight must be used inside <SafelightProvider>');
  }
  return state;
}
