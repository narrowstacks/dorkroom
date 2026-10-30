/**
 * Custom recipe store.
 *
 * Custom recipes are a synchronous array persisted under
 * `CUSTOM_RECIPES_STORAGE_KEY`. Writes cannot be pending and cannot fail
 * later, so this is a plain external store (read, add, update, remove,
 * subscribe) behind a storage adapter, not a TanStack Query cache. React reads
 * it through `useCustomRecipes`, which is built on `useSyncExternalStore`.
 */

import { CUSTOM_RECIPES_STORAGE_KEY } from '../constants/storage-keys';
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from '../types/custom-recipes';
import { getRecipeValidationError } from '../utils/combination-factory';
import { isBrowser } from '../utils/environment';
import {
  sanitizeCustomDeveloper,
  sanitizeCustomFilm,
  sanitizeRecipeName,
  sanitizeTags,
  sanitizeText,
} from '../utils/text-sanitization';
import { createStorageManager, isArray } from './local-storage';

/**
 * Where the recipe array lives. `read` must be synchronous and return only
 * validated data (an empty array when nothing valid is stored).
 */
export interface CustomRecipeStorageAdapter {
  read: () => CustomRecipe[];
  write: (recipes: CustomRecipe[]) => void;
  /**
   * Optional hook for changes made outside this store (another browser tab).
   * Returns an unsubscribe function.
   */
  subscribe?: (onExternalChange: () => void) => () => void;
}

export interface CustomRecipeStore {
  /** Current recipes. Returns the same array until something changes. */
  read: () => CustomRecipe[];
  /** Validates, sanitizes and appends a recipe. Throws on invalid input. */
  add: (formData: CustomRecipeFormData) => CustomRecipe;
  /** Replaces the recipe with `id`. Throws if it is missing or the input is invalid. */
  update: (id: string, formData: CustomRecipeFormData) => CustomRecipe;
  /** Removes the recipe with `id`. A missing id is a no-op. */
  remove: (id: string) => void;
  /** Registers a change listener. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
}

/**
 * Adapter over `globalThis.localStorage` (the MMKV shim on iOS). Reads are
 * validated as an array; anything else reads as `[]`. Cross-tab changes arrive
 * through the `storage` event.
 */
export function createLocalStorageRecipeAdapter(
  storageKey: string = CUSTOM_RECIPES_STORAGE_KEY
): CustomRecipeStorageAdapter {
  const manager = createStorageManager<CustomRecipe[]>(storageKey, {
    defaultValue: [],
    validate: isArray(),
    logContext: 'customRecipeStore',
  });

  return {
    read: manager.read,
    write: manager.write,
    subscribe: (onExternalChange) => {
      if (!isBrowser()) {
        return () => undefined;
      }

      const handleStorage = (event: StorageEvent) => {
        // Ignore other keys, and localStorage.clear() (key === null), so that
        // clearing unrelated data does not wipe the list in view.
        if (event.key !== storageKey) {
          return;
        }
        onExternalChange();
      };

      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    },
  };
}

/** Adapter that keeps the array in memory. For tests and storage-less hosts. */
export function createMemoryRecipeAdapter(
  initial: CustomRecipe[] = []
): CustomRecipeStorageAdapter {
  let recipes = [...initial];
  return {
    read: () => recipes,
    write: (next) => {
      recipes = [...next];
    },
  };
}

/**
 * Resolves the two dilution fields from the form. A dilution picked from the
 * dropdown is an id and must clear `customDilution`, because every display
 * shows `customDilution` first. `'custom'`, an empty pick, or a custom
 * developer (which has no catalogue ids) keeps the free-text dilution.
 */
const resolveDilution = (
  formData: CustomRecipeFormData
): Pick<CustomRecipe, 'dilutionId' | 'customDilution'> => {
  const selected = sanitizeText(formData.selectedDilutionId, 100).trim();
  if (formData.useExistingDeveloper && selected && selected !== 'custom') {
    return { dilutionId: selected, customDilution: '' };
  }
  return {
    dilutionId: undefined,
    customDilution: sanitizeText(formData.customDilution, 100),
  };
};

const createRecipeFromFormData = (
  formData: CustomRecipeFormData,
  base?: CustomRecipe
): CustomRecipe => {
  // Reject out-of-range numbers before they reach storage: a stored invalid
  // recipe would break every later render of /development.
  const validationError = getRecipeValidationError(formData);
  if (validationError) {
    throw new Error(validationError);
  }

  const timestamp = Date.now();
  const nowIso = new Date(timestamp).toISOString();

  const filmId = formData.useExistingFilm
    ? formData.selectedFilmId || base?.filmId || `fallback_film_${timestamp}`
    : (base?.filmId ?? `custom_film_${timestamp}`);

  const developerId = formData.useExistingDeveloper
    ? formData.selectedDeveloperId ||
      base?.developerId ||
      `fallback_dev_${timestamp}`
    : (base?.developerId ?? `custom_dev_${timestamp}`);

  return {
    ...base,
    id:
      base?.id ??
      `custom_${timestamp}_${Math.random().toString(36).slice(2, 11)}`,
    // Sanitize all text fields to prevent XSS attacks
    name: sanitizeRecipeName(formData.name) || 'Untitled Recipe',
    filmId,
    developerId,
    temperatureF: formData.temperatureF,
    timeMinutes: formData.timeMinutes,
    shootingIso: formData.shootingIso,
    pushPull: formData.pushPull,
    agitationSchedule: sanitizeText(formData.agitationSchedule, 500),
    notes: sanitizeText(formData.notes, 2000),
    ...resolveDilution(formData),
    isCustomFilm: !formData.useExistingFilm,
    isCustomDeveloper: !formData.useExistingDeveloper,
    customFilm: sanitizeCustomFilm(formData.customFilm),
    customDeveloper: sanitizeCustomDeveloper(formData.customDeveloper),
    dateCreated: base?.dateCreated ?? nowIso,
    dateModified: nowIso,
    isPublic: formData.isPublic,
    tags: sanitizeTags(formData.tags),
    // Preserve source URL from form data (for filmdev.org imports)
    // Falls back to existing sourceUrl if not provided in form
    sourceUrl: formData.sourceUrl ?? base?.sourceUrl,
  } satisfies CustomRecipe;
};

export function createCustomRecipeStore(
  adapter: CustomRecipeStorageAdapter
): CustomRecipeStore {
  const listeners = new Set<() => void>();
  let snapshot: CustomRecipe[] | undefined;
  let detachAdapter: (() => void) | undefined;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  /** Re-read storage, so the cache shows what actually persisted. */
  const refresh = () => {
    snapshot = adapter.read();
    notify();
  };

  const read = (): CustomRecipe[] => {
    snapshot ??= adapter.read();
    return snapshot;
  };

  // Writes start from storage rather than the cache, so a change another tab
  // made since the last read is not overwritten.
  const commit = (next: CustomRecipe[]) => {
    adapter.write(next);
    refresh();
  };

  const add = (formData: CustomRecipeFormData): CustomRecipe => {
    const recipe = createRecipeFromFormData(formData);
    commit([...adapter.read(), recipe]);
    return recipe;
  };

  const update = (id: string, formData: CustomRecipeFormData): CustomRecipe => {
    const current = adapter.read();
    const index = current.findIndex((recipe) => recipe.id === id);
    if (index === -1) {
      throw new Error(`Recipe with id ${id} not found`);
    }
    const updated = createRecipeFromFormData(formData, current[index]);
    const next = [...current];
    next[index] = updated;
    commit(next);
    return updated;
  };

  const remove = (id: string): void => {
    commit(adapter.read().filter((recipe) => recipe.id !== id));
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    if (listeners.size === 1) {
      detachAdapter = adapter.subscribe?.(refresh);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        detachAdapter?.();
        detachAdapter = undefined;
        // Nothing hears external changes now, so the cache can go stale.
        // Drop it and read fresh next time.
        snapshot = undefined;
      }
    };
  };

  return { read, add, update, remove, subscribe };
}

/** The app-wide store, persisted to localStorage under the existing key. */
export const customRecipeStore: CustomRecipeStore = createCustomRecipeStore(
  createLocalStorageRecipeAdapter()
);
