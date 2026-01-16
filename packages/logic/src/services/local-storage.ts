/**
 * Local storage manager factory for type-safe localStorage operations
 *
 * This utility consolidates the repeated localStorage access patterns across
 * the codebase, providing:
 * - SSR-safe localStorage access
 * - Type-safe read/write operations
 * - Consistent error handling with debug logging
 * - Default value support
 */

import { debugError, debugWarn } from '../utils/debug-logger';

/**
 * Options for configuring the storage manager
 */
export interface StorageManagerOptions<T> {
  /**
   * Default value to return when storage is unavailable or empty
   */
  defaultValue: T;
  /**
   * Optional custom validator for parsed values
   * Return true if the value is valid, false otherwise
   */
  validate?: (value: unknown) => value is T;
  /**
   * Custom context name for debug logging (defaults to storage key)
   */
  logContext?: string;
}

/**
 * Storage manager interface returned by createStorageManager
 */
export interface StorageManager<T> {
  /**
   * Read data from localStorage
   * Returns defaultValue if storage is unavailable, empty, or contains invalid data
   */
  read: () => T;
  /**
   * Write data to localStorage
   * Silently fails if storage is unavailable (logs warning)
   */
  write: (data: T) => void;
  /**
   * Remove data from localStorage
   */
  clear: () => void;
  /**
   * Get the storage key being used
   */
  readonly storageKey: string;
}

/**
 * Safely get localStorage reference
 * Returns null in SSR environments or when localStorage is unavailable
 */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Create a type-safe storage manager for a specific localStorage key
 *
 * @param storageKey - The localStorage key to use
 * @param options - Configuration options including default value
 * @returns StorageManager interface with read/write/clear methods
 *
 * @example
 * ```typescript
 * // For array data
 * const recipesStorage = createStorageManager<CustomRecipe[]>('custom_recipes', {
 *   defaultValue: [],
 *   validate: (value): value is CustomRecipe[] => Array.isArray(value),
 * });
 *
 * const recipes = recipesStorage.read();
 * recipesStorage.write([...recipes, newRecipe]);
 *
 * // For object data
 * const settingsStorage = createStorageManager<UserSettings>('settings', {
 *   defaultValue: { theme: 'light' },
 * });
 * ```
 */
export function createStorageManager<T>(
  storageKey: string,
  options: StorageManagerOptions<T>
): StorageManager<T> {
  const { defaultValue, validate, logContext } = options;
  const context = logContext ?? storageKey;

  const read = (): T => {
    const storage = getStorage();
    if (!storage) {
      return defaultValue;
    }

    try {
      const raw = storage.getItem(storageKey);
      if (!raw) {
        return defaultValue;
      }

      const parsed = JSON.parse(raw) as unknown;

      // If validator provided, use it
      if (validate) {
        if (validate(parsed)) {
          return parsed;
        }
        debugWarn(`[${context}] Stored value failed validation`);
        return defaultValue;
      }

      // Basic type check - ensure it's not null/undefined
      if (parsed === null || parsed === undefined) {
        return defaultValue;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns unknown, caller validates via schema
      return parsed as T;
    } catch (error) {
      debugError(`[${context}] Failed to parse stored data:`, error);
      return defaultValue;
    }
  };

  const write = (data: T): void => {
    const storage = getStorage();
    if (!storage) {
      debugWarn(`[${context}] localStorage unavailable, cannot persist data`);
      return;
    }

    try {
      storage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      debugError(`[${context}] Failed to persist data:`, error);
      // Don't throw - allow UI to continue working even if persistence fails
    }
  };

  const clear = (): void => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(storageKey);
    } catch (error) {
      debugError(`[${context}] Failed to clear data:`, error);
    }
  };

  return {
    read,
    write,
    clear,
    storageKey,
  };
}

/**
 * Type guard validator for arrays
 */
export function isArray<T>(
  itemValidator?: (item: unknown) => item is T
): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] => {
    if (!Array.isArray(value)) {
      return false;
    }
    if (itemValidator) {
      return value.every(itemValidator);
    }
    return true;
  };
}

/**
 * Type guard validator for string arrays
 */
export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
