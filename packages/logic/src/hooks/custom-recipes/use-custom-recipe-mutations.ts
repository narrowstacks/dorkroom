import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CustomRecipe,
  type CustomRecipeFormData,
} from '../../types/custom-recipes';
import { queryKeys } from '../../queries/query-keys';
import { debugError } from '../../utils/debug-logger';

const STORAGE_KEY = 'dorkroom_custom_recipes';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
};

const readRecipesFromStorage = (): CustomRecipe[] => {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as CustomRecipe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    debugError('[useCustomRecipeMutations] Failed to parse stored recipes:', error);
    return [];
  }
};

const writeRecipesToStorage = (recipes: CustomRecipe[]): void => {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch (error) {
    debugError('[useCustomRecipeMutations] Failed to persist recipes:', error);
    throw error;
  }
};

/**
 * Hook for adding a custom recipe
 * Optimistically updates cache, writes to localStorage
 */
export function useAddCustomRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CustomRecipeFormData): Promise<string> => {
      const currentRecipes = readRecipesFromStorage();

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
        tags: formData.tags,
      };

      const updatedRecipes = [...currentRecipes, newRecipe];
      writeRecipesToStorage(updatedRecipes);

      return newRecipe.id;
    },
    onSuccess: () => {
      // Invalidate and refetch custom recipes
      queryClient.invalidateQueries({
        queryKey: queryKeys.customRecipes.list(),
      });
    },
  });
}

/**
 * Hook for updating a custom recipe
 * Optimistically updates cache, writes to localStorage
 */
export function useUpdateCustomRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: string;
      formData: CustomRecipeFormData;
    }): Promise<void> => {
      const currentRecipes = readRecipesFromStorage();
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
        tags: formData.tags,
      };

      const updatedRecipes = [...currentRecipes];
      updatedRecipes[recipeIndex] = updatedRecipe;

      writeRecipesToStorage(updatedRecipes);
    },
    onSuccess: () => {
      // Invalidate and refetch custom recipes
      queryClient.invalidateQueries({
        queryKey: queryKeys.customRecipes.list(),
      });
    },
  });
}

/**
 * Hook for deleting a custom recipe
 * Optimistically updates cache, writes to localStorage
 */
export function useDeleteCustomRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const currentRecipes = readRecipesFromStorage();
      const updatedRecipes = currentRecipes.filter(
        (recipe) => recipe.id !== id
      );
      writeRecipesToStorage(updatedRecipes);
    },
    onSuccess: () => {
      // Invalidate and refetch custom recipes
      queryClient.invalidateQueries({
        queryKey: queryKeys.customRecipes.list(),
      });
    },
  });
}

/**
 * Hook for clearing all custom recipes
 */
export function useClearCustomRecipes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      writeRecipesToStorage([]);
    },
    onSuccess: () => {
      // Invalidate and refetch custom recipes
      queryClient.invalidateQueries({
        queryKey: queryKeys.customRecipes.list(),
      });
    },
  });
}
