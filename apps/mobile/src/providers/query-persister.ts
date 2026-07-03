// MMKV-backed persister for the TanStack Query cache. A darkroom is dark and
// often has no signal, so we persist successful queries (films / developers /
// combinations) to disk and rehydrate them on launch — the recipe browser and
// film picker work fully offline after the first successful fetch.
//
// MMKV is synchronous, so we use the *sync* storage persister. The cache lives
// in its own MMKV instance, separate from the localStorage shim and the film
// log, to keep namespaces clean.
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { createMMKV } from 'react-native-mmkv';

const CACHE_KEY = 'dorkroom-query-cache';

const cacheStorage = createMMKV({ id: CACHE_KEY });

/**
 * A DOM `Storage`-shaped view over the cache MMKV instance — the minimal
 * getItem/setItem/removeItem surface the sync persister needs.
 */
const persisterStorage = {
  getItem: (key: string): string | null => cacheStorage.getString(key) ?? null,
  setItem: (key: string, value: string): void => {
    cacheStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    cacheStorage.remove(key);
  },
};

/** Sync MMKV persister for `PersistQueryClientProvider`. */
export const queryPersister = createSyncStoragePersister({
  storage: persisterStorage,
  key: 'dorkroom-query-cache-v1',
});

/** How long a persisted cache stays valid before it's discarded (7 days). */
export const QUERY_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
