import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { CONTROL_KINDS } from '@/lib/control-kinds';
import {
  nextSafelightStamp,
  reconcileSafelight,
  type SafelightCopy,
  type SharedSafelightCopy,
} from '@/lib/safelight-reconcile';
import { type SharedDefaults, sharedDefaults } from '@/lib/shared-defaults';

// Safelight mode is one persisted boolean. MMKV reads are synchronous, so the
// first frame is already red when the mode was left on.
//
// It is mirrored to the App Group (the same keys, `safelightOn` and
// `safelightChangedAt` in ms), where the Control Center toggle reads and writes
// it from the widget extension, with the app closed if need be. Every change in
// the app writes both copies and reloads the control; `reconcile` takes the
// shared value when the control changed it more recently. It runs when the
// store is created (this module's first import, before the first render: the
// native module's calls are synchronous) and each time the app becomes active.
export const KEY = 'safelightOn';
export const CHANGED_AT_KEY = 'safelightChangedAt';

/** The subset of an MMKV instance the store uses. */
export interface SafelightStorage {
  getBoolean(key: string): boolean | undefined;
  getNumber(key: string): number | undefined;
  set(key: string, value: boolean | number): void;
}

/** Where app-state changes come from (react-native's `AppState`). */
export interface ActiveSource {
  addEventListener(
    type: 'change',
    listener: (state: string) => void
  ): { remove: () => void };
}

export interface SafelightStore {
  get: () => boolean;
  set: (on: boolean) => void;
  subscribe: (listener: () => void) => () => void;
  /** Adopt a newer App Group value, or publish the app's when that copy is missing or stale. */
  reconcile: () => void;
}

export function createSafelightStore(deps: {
  storage: SafelightStorage;
  shared: SharedDefaults;
  appState: ActiveSource;
  now?: () => number;
}): SafelightStore {
  const { storage, shared, appState, now = Date.now } = deps;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };

  const get = () => storage.getBoolean(KEY) === true;

  const localCopy = (): SafelightCopy => {
    const changedAt = storage.getNumber(CHANGED_AT_KEY);
    return {
      on: get(),
      changedAt:
        changedAt !== undefined && Number.isFinite(changedAt) ? changedAt : 0,
    };
  };

  const sharedCopy = (): SharedSafelightCopy => ({
    on: shared.getBool(KEY),
    changedAt: shared.getNumber(CHANGED_AT_KEY),
  });

  // Two write orders. An ORIGINATING change (`set`, and publishing to the App
  // Group; the extension does the same) writes the stamp first: a crash between
  // the two leaves a newer stamp over the old value, which the next reconcile
  // settles, never a new value under an old stamp that a later press could tie.
  // An ADOPT writes the value first: a crash then leaves the adopted value under
  // the old stamp, so the shared copy is still newer and is adopted again. (Stamp
  // first there would leave equal stamps over different values, and the next
  // reconcile would publish the old value over the press.)
  const writeOriginating = (on: boolean, changedAt: number) => {
    storage.set(CHANGED_AT_KEY, changedAt);
    storage.set(KEY, on);
  };

  const writeAdopted = (on: boolean, changedAt: number) => {
    storage.set(KEY, on);
    storage.set(CHANGED_AT_KEY, changedAt);
  };

  const publish = (on: boolean, changedAt: number) => {
    shared.setNumber(CHANGED_AT_KEY, changedAt);
    shared.setBool(KEY, on);
    shared.reloadControls(CONTROL_KINDS.safelight);
  };

  const set = (on: boolean) => {
    // A control press may have landed while the app stayed active: take it
    // first, so the early return and the new stamp see the current state.
    reconcile();
    if (get() === on) return;
    const changedAt = nextSafelightStamp(now(), [
      localCopy().changedAt,
      shared.getNumber(CHANGED_AT_KEY),
    ]);
    writeOriginating(on, changedAt);
    publish(on, changedAt);
    notify();
  };

  function reconcile(): void {
    const local = localCopy();
    const decision = reconcileSafelight(local, sharedCopy());
    if (decision.kind === 'publish') {
      // A publish can carry a newer stamp than the app's own (a shared stamp
      // left without its value): raise the app's stamp first, then publish.
      if (decision.changedAt > local.changedAt) {
        storage.set(CHANGED_AT_KEY, decision.changedAt);
      }
      publish(decision.on, decision.changedAt);
      return;
    }
    if (decision.kind !== 'adopt') return;
    const changed = get() !== decision.on;
    writeAdopted(decision.on, decision.changedAt);
    // The control may be showing something else (it is only reloaded by the
    // writer that changed it), so it is refreshed on every adopt.
    shared.reloadControls(CONTROL_KINDS.safelight);
    if (changed) notify();
  }

  reconcile();
  // The app stays alive in the background, so a toggle pressed meanwhile is
  // picked up when it comes back. Lives as long as the store.
  appState.addEventListener('change', (state) => {
    if (state === 'active') reconcile();
  });

  return {
    get,
    set,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reconcile,
  };
}

export const storage = createMMKV({ id: 'dorkroom-safelight' });

const store = createSafelightStore({
  storage,
  shared: sharedDefaults,
  appState: AppState,
});

export const getSafelight: () => boolean = store.get;
export const setSafelight: (on: boolean) => void = store.set;
export const subscribeSafelight: (listener: () => void) => () => void =
  store.subscribe;

export interface SafelightState {
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
}

/** Reads the mode from the store; the provider and non-React code share it. */
export function useSafelightValue(): boolean {
  return useSyncExternalStore(subscribeSafelight, getSafelight, getSafelight);
}
