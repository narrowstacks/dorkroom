import { useMemo, useSyncExternalStore } from 'react';
import {
  type CustomRecipeStore,
  customRecipeStore,
} from '../../services/custom-recipe-store';
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from '../../types/custom-recipes';

export interface UseCustomRecipesResult {
  customRecipes: CustomRecipe[];
  /** Saves a new recipe and returns its id. Throws on invalid input. */
  addCustomRecipe: (formData: CustomRecipeFormData) => string;
  /** Replaces a recipe and returns the saved version. Throws on invalid input. */
  updateCustomRecipe: (
    id: string,
    formData: CustomRecipeFormData
  ) => CustomRecipe;
  deleteCustomRecipe: (id: string) => void;
}

/**
 * Reads and edits the user's custom recipes. Everything is synchronous: the
 * list is current on first render, and each write is visible on the next.
 * Changes from other tabs arrive through the store's `storage` listener.
 *
 * @param store - Defaults to the app-wide localStorage store. Pass another
 *   (for example one built on `createMemoryRecipeAdapter`) in tests.
 */
export function useCustomRecipes(
  store: CustomRecipeStore = customRecipeStore
): UseCustomRecipesResult {
  const customRecipes = useSyncExternalStore(
    store.subscribe,
    store.read,
    store.read
  );

  const actions = useMemo(
    () => ({
      addCustomRecipe: (formData: CustomRecipeFormData) =>
        store.add(formData).id,
      updateCustomRecipe: store.update,
      deleteCustomRecipe: store.remove,
    }),
    [store]
  );

  return { customRecipes, ...actions };
}
