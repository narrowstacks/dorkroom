import { sharedStorage } from '@/lib/mmkv-storage';
import { createWebStorageShim } from './local-storage-shim';

let installed = false;

/**
 * Install a synchronous MMKV-backed localStorage onto the global scope.
 * Idempotent. Must run before any shared hook reads/writes persisted state.
 */
export function installLocalStorage(): void {
  if (installed) {
    return;
  }
  const shim = createWebStorageShim(sharedStorage);
  Object.defineProperty(globalThis, 'localStorage', {
    value: shim,
    configurable: true,
    writable: true,
  });
  installed = true;
}
