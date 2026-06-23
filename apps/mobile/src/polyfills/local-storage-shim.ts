/**
 * Minimal key-value backend, structurally satisfied by a react-native-mmkv
 * instance (getString / set / remove / getAllKeys). MMKV 4 renamed the
 * single-key deleter from `delete` to `remove`.
 */
export interface KVBackend {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  getAllKeys(): string[];
}

/**
 * Wrap a synchronous key-value backend in a DOM `Storage`-compatible object.
 * Shared hooks call `window.localStorage` (directly or via createStorageManager);
 * installing this as globalThis.localStorage lets them run unchanged on RN.
 */
export function createWebStorageShim(backend: KVBackend): Storage {
  const shim: Storage = {
    get length(): number {
      return backend.getAllKeys().length;
    },
    clear(): void {
      for (const key of backend.getAllKeys()) {
        backend.remove(key);
      }
    },
    getItem(key: string): string | null {
      return backend.getString(key) ?? null;
    },
    key(index: number): string | null {
      return backend.getAllKeys()[index] ?? null;
    },
    removeItem(key: string): void {
      backend.remove(key);
    },
    setItem(key: string, value: string): void {
      backend.set(key, String(value));
    },
  };
  return shim;
}
