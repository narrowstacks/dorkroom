import type { KeyValueStorage } from '@dorkroom/logic';
import { createMMKV } from 'react-native-mmkv';
import type { KVBackend } from '@/polyfills/local-storage-shim';

/**
 * Wrap an MMKV instance (MMKV 4: `getString` / `set` / `remove`) in the
 * `KeyValueStorage` seam that `@dorkroom/logic` persists through.
 */
export function createMMKVStorageAdapter(
  mmkv: Pick<KVBackend, 'getString' | 'set' | 'remove'>
): KeyValueStorage {
  return {
    getItem: (key) => mmkv.getString(key) ?? null,
    setItem: (key, value) => {
      mmkv.set(key, value);
    },
    removeItem: (key) => {
      mmkv.remove(key);
    },
  };
}

/**
 * The MMKV instance behind shared `@dorkroom/logic` state: the
 * `globalThis.localStorage` shim (`installLocalStorage`) and the calculator
 * persistence provider both read and write it. The id is unchanged since the
 * app's first build, so state saved through the shim before the provider
 * existed still hydrates.
 */
export const sharedStorage = createMMKV({ id: 'dorkroom-mobile' });

/**
 * Storage for persisted calculators, provided once in `app/_layout.tsx` via
 * `PersistenceStorageProvider`.
 */
export const calculatorStorage = createMMKVStorageAdapter(sharedStorage);
