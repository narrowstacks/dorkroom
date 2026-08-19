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

import { z } from 'zod';
import { debugError, debugWarn } from '../utils/debug-logger';
import { isBrowser } from '../utils/environment';

/**
 * Options for configuring the storage manager
 */
export interface StorageManagerOptions<T> {
  /**
   * Default value to return when storage is unavailable or empty
   */
  defaultValue: T;
  /**
   * Validator for the parsed value. Nothing is returned from storage unless it
   * passes, so the manager never has to assume the stored shape.
   */
  validate: (value: unknown) => value is T;
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
  if (!isBrowser()) {
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

      const parsed: unknown = JSON.parse(raw);
      if (validate(parsed)) {
        return parsed;
      }

      debugWarn(`[${context}] Stored value failed validation`);
      return defaultValue;
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

const stringArraySchema = z.array(z.string());

/**
 * Type guard validator for string arrays
 */
export function isStringArray(value: unknown): value is string[] {
  return stringArraySchema.safeParse(value).success;
}
