import { useSyncExternalStore } from 'react';
import { createMMKV } from 'react-native-mmkv';

// Safelight mode is one persisted boolean. MMKV reads are synchronous, so the
// first frame is already red when the mode was left on.
export const storage = createMMKV({ id: 'dorkroom-safelight' });
export const KEY = 'safelightOn';

type Listener = () => void;
const listeners = new Set<Listener>();

export function getSafelight(): boolean {
  return storage.getBoolean(KEY) === true;
}

export function setSafelight(on: boolean): void {
  if (getSafelight() === on) return;
  storage.set(KEY, on);
  for (const listener of listeners) listener();
}

export function subscribeSafelight(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface SafelightState {
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
}

/** Reads the mode from the store; the provider and non-React code share it. */
export function useSafelightValue(): boolean {
  return useSyncExternalStore(subscribeSafelight, getSafelight, getSafelight);
}
