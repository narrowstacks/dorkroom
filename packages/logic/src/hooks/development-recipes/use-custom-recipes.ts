import { useState, useEffect, useCallback } from 'react';
import {
  type CustomRecipe,
  type CustomRecipeFormData,
} from '../../types/custom-recipes';
import { debugError, debugWarn } from '../../utils/debug-logger';

const STORAGE_KEY = 'dorkroom_custom_recipes';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    debugWarn('Local storage unavailable for custom recipes:', error);
    return null;
  }
};

const readRecipesFromStorage = (): CustomRecipe[] => {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CustomRecipe[];
    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch (error) {
    debugError('[useCustomRecipes] Failed to parse stored recipes:', error);
    return [];
  }
};

const writeRecipesToStorage = (recipes: CustomRecipe[]): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch (error) {
    debugError('[useCustomRecipes] Failed to persist recipes:', error);
    throw error;
  }
};

/**
 * Hook for managing custom film development recipes stored in localStorage.
 * Provides CRUD operations for user-created custom recipes including
 * custom films and developers.
 *
 * @returns Object containing custom recipes state and management functions
 *
 * @example
 * ```typescript
 * const {
 *   customRecipes,
 *   isLoading,
 *   addCustomRecipe,
 *   updateCustomRecipe,
 *   deleteCustomRecipe,
 *   clearAllCustomRecipes
 * } = useCustomRecipes();
 *
 * // Add a new custom recipe
 * const recipeId = await addCustomRecipe({
 *   name: 'My Custom Recipe',
 *   useExistingFilm: false,
 *   customFilm: { brand: 'Custom', name: 'Test Film' },
 *   temperatureF: 68,
 *   timeMinutes: 12
 * });
 *
 * // Delete a recipe
 * await deleteCustomRecipe(recipeId);
 * ```
 */
export const useCustomRecipes = () => {
  const [customRecipes, setCustomRecipes] = useState<CustomRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stateVersion, setStateVersion] = useState(0);

  const loadRecipes = useCallback(async () => {
    const recipes = readRecipesFromStorage();
    setCustomRecipes(recipes);
    setStateVersion((prev) => prev + 1);
    return recipes;
  }, []);

  const saveRecipes = useCallback(async (recipes: CustomRecipe[]) => {
    writeRecipesToStorage(recipes);
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const addCustomRecipe = useCallback(
    async (formData: CustomRecipeFormData): Promise<string> => {
      setIsLoading(true);

      try {
        const currentRecipes = await loadRecipes();

        const filmId = formData.useExistingFilm
          ? formData.selectedFilmId || `fallback_film_${Date.now()}`
          : `custom_film_${Date.now()}`;

        const developerId = formData.useExistingDeveloper
          ? formData.selectedDeveloperId || `fallback_dev_${Date.now()}`
          : `custom_dev_${Date.now()}`;

        const newRecipe: CustomRecipe = {
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          name: formData.name,
          filmId,
          developerId,
          temperatureF: formData.temperatureF,
          timeMinutes: formData.timeMinutes,
          shootingIso: formData.shootingIso,
          pushPull: formData.pushPull,
          agitationSchedule: formData.agitationSchedule,
          notes: formData.notes,
          customDilution: formData.customDilution,
          isCustomFilm: !formData.useExistingFilm,
          isCustomDeveloper: !formData.useExistingDeveloper,
          customFilm: formData.customFilm,
          customDeveloper: formData.customDeveloper,
          dilutionId: undefined,
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          isPublic: formData.isPublic,
        };

        const updatedRecipes = [...currentRecipes, newRecipe];
        await saveRecipes(updatedRecipes);
        await loadRecipes();

        return newRecipe.id;
      } catch (error) {
        debugError('[useCustomRecipes] Error adding recipe:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecipes, saveRecipes]
  );

  const updateCustomRecipe = useCallback(
    async (id: string, formData: CustomRecipeFormData): Promise<void> => {
      setIsLoading(true);

      try {
        const currentRecipes = await loadRecipes();
        const recipeIndex = currentRecipes.findIndex(
          (recipe) => recipe.id === id
        );

        if (recipeIndex === -1) {
          throw new Error(`Recipe with id ${id} not found`);
        }

        const existingRecipe = currentRecipes[recipeIndex];

        const filmId = formData.useExistingFilm
          ? formData.selectedFilmId || existingRecipe.filmId
          : existingRecipe.filmId;

        const developerId = formData.useExistingDeveloper
          ? formData.selectedDeveloperId || existingRecipe.developerId
          : existingRecipe.developerId;

        const updatedRecipe: CustomRecipe = {
          ...existingRecipe,
          name: formData.name,
          filmId,
          developerId,
          temperatureF: formData.temperatureF,
          timeMinutes: formData.timeMinutes,
          shootingIso: formData.shootingIso,
          pushPull: formData.pushPull,
          agitationSchedule: formData.agitationSchedule,
          notes: formData.notes,
          customDilution: formData.customDilution,
          isCustomFilm: !formData.useExistingFilm,
          isCustomDeveloper: !formData.useExistingDeveloper,
          customFilm: formData.customFilm,
          customDeveloper: formData.customDeveloper,
          dateModified: new Date().toISOString(),
        };

        const updatedRecipes = [...currentRecipes];
        updatedRecipes[recipeIndex] = updatedRecipe;

        await saveRecipes(updatedRecipes);
        await loadRecipes();
      } catch (error) {
        debugError('[useCustomRecipes] Error updating recipe:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecipes, saveRecipes]
  );

  const deleteCustomRecipe = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true);

      try {
        const currentRecipes = await loadRecipes();
        const updatedRecipes = currentRecipes.filter(
          (recipe) => recipe.id !== id
        );
        await saveRecipes(updatedRecipes);
        await loadRecipes();
      } catch (error) {
        debugError('[useCustomRecipes] Error deleting recipe:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecipes, saveRecipes]
  );

  const clearAllCustomRecipes = useCallback(async () => {
    setIsLoading(true);

    try {
      await saveRecipes([]);
      await loadRecipes();
    } catch (error) {
      debugError('[useCustomRecipes] Error clearing recipes:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadRecipes, saveRecipes]);

  const forceRefresh = useCallback(async () => {
    return loadRecipes();
  }, [loadRecipes]);

  return {
    customRecipes,
    isLoading,
    stateVersion,
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
    clearAllCustomRecipes,
    forceRefresh,
  };
};
