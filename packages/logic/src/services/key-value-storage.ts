/**
 * The storage seam for persisted calculator state.
 *
 * A synchronous string key-value store: the subset of the DOM `Storage` API
 * the persistence code actually uses. `window.localStorage` satisfies it as
 * is, the iOS app wraps an MMKV instance in it (apps/mobile), and tests use
 * `createMemoryStorage`. Methods may throw (a full or blocked store); callers
 * catch and log, so a storage failure never breaks a calculator.
 */
import { debugWarn } from '../utils/debug-logger';
import { isBrowser } from '../utils/environment';

export interface KeyValueStorage {
  /** The stored string, or `null` when the key is absent. */
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/**
 * `window.localStorage`, or `null` where there is none (SSR) or reading the
 * property itself throws (storage blocked by browser privacy settings).
 */
export function getLocalStorage(): Storage | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Adapter over `window.localStorage`, looked up on every call so a test (or
 * the iOS MMKV shim) that replaces the global is picked up. Where there is no
 * localStorage, reads return `null` and writes do nothing, and a development
 * build says so once: silently persisting nothing is the failure this seam
 * exists to make visible.
 */
export function createLocalStorageAdapter(): KeyValueStorage {
  let warned = false;
  const storage = (): Storage | null => {
    const found = getLocalStorage();
    if (!found && !warned) {
      warned = true;
      debugWarn(
        '[persistence] No localStorage on this host, so calculator state will not persist. Provide a KeyValueStorage with PersistenceStorageProvider.'
      );
    }
    return found;
  };

  return {
    getItem: (key) => storage()?.getItem(key) ?? null,
    setItem: (key, value) => storage()?.setItem(key, value),
    removeItem: (key) => storage()?.removeItem(key),
  };
}

/** Adapter that keeps strings in a `Map`. For tests and storage-less hosts. */
export function createMemoryStorage(
  initial: Record<string, string> = {}
): KeyValueStorage {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}
