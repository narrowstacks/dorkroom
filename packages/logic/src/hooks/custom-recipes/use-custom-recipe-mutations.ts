import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../queries/query-keys';
import type {
  CustomDeveloperData,
  CustomFilmData,
  CustomRecipe,
  CustomRecipeFormData,
} from '../../types/custom-recipes';
import { debugError } from '../../utils/debug-logger';
import {
  sanitizeRecipeName,
  sanitizeText,
} from '../../utils/text-sanitization';

const STORAGE_KEY = 'dorkroom_custom_recipes';
const CUSTOM_RECIPES_QUERY_KEY = queryKeys.customRecipes.list();

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
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
    debugError(
      '[useCustomRecipeMutations] Failed to parse stored recipes:',
      error
    );
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
 * Sanitize custom film data to prevent XSS attacks.
 */
const sanitizeCustomFilm = (
  film: CustomFilmData | undefined
): CustomFilmData | undefined => {
  if (!film) return undefined;

  return {
    ...film,
    brand: sanitizeText(film.brand, 100) || 'Unknown',
    name: sanitizeText(film.name, 100) || 'Unknown',
    grainStructure: sanitizeText(film.grainStructure, 100),
    description: sanitizeText(film.description, 500),
  };
};

/**
 * Sanitize custom developer data to prevent XSS attacks.
 */
const sanitizeCustomDeveloper = (
  developer: CustomDeveloperData | undefined
): CustomDeveloperData | undefined => {
  if (!developer) return undefined;

  return {
    ...developer,
    manufacturer: sanitizeText(developer.manufacturer, 100) || 'Unknown',
    name: sanitizeText(developer.name, 100) || 'Unknown',
    type: sanitizeText(developer.type, 100) || 'Unknown',
    notes: sanitizeText(developer.notes, 1000),
    mixingInstructions: sanitizeText(developer.mixingInstructions, 2000),
    safetyNotes: sanitizeText(developer.safetyNotes, 1000),
    dilutions: developer.dilutions.map((d) => ({
      name: sanitizeText(d.name, 50) || 'Unknown',
      dilution: sanitizeText(d.dilution, 50) || '1:1',
    })),
  };
};

/**
 * Sanitize tags array.
 */
const sanitizeTags = (tags: string[] | undefined): string[] | undefined => {
  if (!tags) return undefined;
  return tags
    .map((tag) => sanitizeText(tag, 50))
    .filter((tag): tag is string => Boolean(tag));
};

const createRecipeFromFormData = (
  formData: CustomRecipeFormData,
  base?: CustomRecipe
): CustomRecipe => {
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
    customDilution: sanitizeText(formData.customDilution, 100),
    isCustomFilm: !formData.useExistingFilm,
    isCustomDeveloper: !formData.useExistingDeveloper,
    customFilm: sanitizeCustomFilm(formData.customFilm),
    customDeveloper: sanitizeCustomDeveloper(formData.customDeveloper),
    dilutionId: base?.dilutionId ?? undefined,
    dateCreated: base?.dateCreated ?? nowIso,
    dateModified: nowIso,
    isPublic: formData.isPublic,
    tags: sanitizeTags(formData.tags),
  } satisfies CustomRecipe;
};

/**
 * Hook for adding a custom recipe
 * Optimistically updates cache, writes to localStorage
 */
export function useAddCustomRecipe() {
  const queryClient = useQueryClient();
  const queryKey = CUSTOM_RECIPES_QUERY_KEY;

  return useMutation<
    CustomRecipe,
    Error,
    CustomRecipeFormData,
    { previousRecipes: CustomRecipe[] }
  >({
    mutationFn: async (
      formData: CustomRecipeFormData
    ): Promise<CustomRecipe> => {
      const newRecipe = createRecipeFromFormData(formData);
      const currentRecipes = readRecipesFromStorage();
      writeRecipesToStorage([...currentRecipes, newRecipe]);
      return newRecipe;
    },
    onMutate: async (formData: CustomRecipeFormData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRecipes =
        queryClient.getQueryData<CustomRecipe[]>(queryKey) ?? [];
      const optimisticRecipe = createRecipeFromFormData(formData);
      queryClient.setQueryData<CustomRecipe[]>(queryKey, [
        ...previousRecipes,
        optimisticRecipe,
      ]);

      return { previousRecipes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRecipes) {
        queryClient.setQueryData(queryKey, context.previousRecipes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook for updating a custom recipe
 * Optimistically updates cache, writes to localStorage
 */
export function useUpdateCustomRecipe() {
  const queryClient = useQueryClient();
  const queryKey = CUSTOM_RECIPES_QUERY_KEY;

  return useMutation<
    CustomRecipe,
    Error,
    { id: string; formData: CustomRecipeFormData },
    { previousRecipes: CustomRecipe[] }
  >({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: string;
      formData: CustomRecipeFormData;
    }): Promise<CustomRecipe> => {
      const currentRecipes = readRecipesFromStorage();
      const recipeIndex = currentRecipes.findIndex(
        (recipe) => recipe.id === id
      );

      if (recipeIndex === -1) {
        throw new Error(`Recipe with id ${id} not found`);
      }

      const existingRecipe = currentRecipes[recipeIndex];
      const updatedRecipe = createRecipeFromFormData(formData, existingRecipe);

      const updatedRecipes = [...currentRecipes];
      updatedRecipes[recipeIndex] = updatedRecipe;

      writeRecipesToStorage(updatedRecipes);
      return updatedRecipe;
    },
    onMutate: async ({ id, formData }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRecipes =
        queryClient.getQueryData<CustomRecipe[]>(queryKey) ?? [];
      const targetIndex = previousRecipes.findIndex(
        (recipe) => recipe.id === id
      );

      if (targetIndex === -1) {
        return { previousRecipes };
      }

      const nextRecipes = [...previousRecipes];
      nextRecipes[targetIndex] = createRecipeFromFormData(
        formData,
        previousRecipes[targetIndex]
      );
      queryClient.setQueryData(queryKey, nextRecipes);

      return { previousRecipes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRecipes) {
        queryClient.setQueryData(queryKey, context.previousRecipes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook for deleting a custom recipe
 * Optimistically updates cache, writes to localStorage
 */
export function useDeleteCustomRecipe() {
  const queryClient = useQueryClient();
  const queryKey = CUSTOM_RECIPES_QUERY_KEY;

  return useMutation<void, Error, string, { previousRecipes: CustomRecipe[] }>({
    mutationFn: async (id: string): Promise<void> => {
      const currentRecipes = readRecipesFromStorage();
      const updatedRecipes = currentRecipes.filter(
        (recipe) => recipe.id !== id
      );
      writeRecipesToStorage(updatedRecipes);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRecipes =
        queryClient.getQueryData<CustomRecipe[]>(queryKey) ?? [];
      queryClient.setQueryData(
        queryKey,
        previousRecipes.filter((recipe) => recipe.id !== id)
      );

      return { previousRecipes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRecipes) {
        queryClient.setQueryData(queryKey, context.previousRecipes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook for clearing all custom recipes
 */
export function useClearCustomRecipes() {
  const queryClient = useQueryClient();
  const queryKey = CUSTOM_RECIPES_QUERY_KEY;

  return useMutation<void, Error, void, { previousRecipes: CustomRecipe[] }>({
    mutationFn: async (): Promise<void> => {
      writeRecipesToStorage([]);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousRecipes =
        queryClient.getQueryData<CustomRecipe[]>(queryKey) ?? [];
      queryClient.setQueryData(queryKey, []);
      return { previousRecipes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRecipes) {
        queryClient.setQueryData(queryKey, context.previousRecipes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
