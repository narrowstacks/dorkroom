import { deleteMMKV, existsMMKV } from 'react-native-mmkv';

// Where the removed pinned-tab setting lived. The instance held only that one
// key (`pinnedToolIds`), so deleting the whole instance removes it. Checking
// first means a fresh install never creates the file just to delete it.
export const LEGACY_PINS_INSTANCE_ID = 'dorkroom-tab-bar';

/** The two MMKV calls used, injectable so the cleanup can be tested. */
export interface LegacyPinsStorage {
  exists(id: string): boolean;
  remove(id: string): boolean;
}

/**
 * Delete the stored pins, once. Idempotent (the second launch finds no
 * instance) and it never throws: cleanup must not be able to stop the app
 * starting.
 */
export function clearLegacyPins(
  storage: LegacyPinsStorage = { exists: existsMMKV, remove: deleteMMKV }
): void {
  try {
    if (storage.exists(LEGACY_PINS_INSTANCE_ID)) {
      storage.remove(LEGACY_PINS_INSTANCE_ID);
    }
  } catch {
    // Leftover pins are harmless; try again next launch.
  }
}
