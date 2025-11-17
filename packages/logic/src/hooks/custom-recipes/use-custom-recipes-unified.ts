/**
 * Unified Custom Recipes Hook
 *
 * This hook provides a unified interface for managing custom recipes,
 * combining the TanStack Query hooks with a familiar API.
 *
 * It's designed to be a drop-in replacement for the old useState-based
 * useCustomRecipes hook while using TanStack Query under the hood.
 */

import { useCallback } from 'react';
import { useCustomRecipes } from './use-custom-recipes';
import {
  useAddCustomRecipe,
  useUpdateCustomRecipe,
  useDeleteCustomRecipe,
  useClearCustomRecipes,
} from './use-custom-recipe-mutations';
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from '../../types/custom-recipes';

/**
 * Unified hook for managing custom recipes
 *
 * Combines query and mutation hooks into a single interface that matches
 * the legacy API while using TanStack Query for state management.
 *
 * @returns Object containing recipe data, loading state, and CRUD operations
 *
 * @example
 * ```typescript
 * const {
 *   customRecipes,
 *   isLoading,
 *   addCustomRecipe,
 *   updateCustomRecipe,
 *   deleteCustomRecipe,
 *   clearAllCustomRecipes,
 * } = useCustomRecipes();
 *
 * // Add a new recipe
 * const recipeId = await addCustomRecipe({
 *   name: 'My Custom Recipe',
 *   useExistingFilm: false,
 *   customFilm: { brand: 'Custom', name: 'Test Film' },
 *   temperatureF: 68,
 *   timeMinutes: 12
 * });
 * ```
 */
export function useCustomRecipesUnified() {
  // Query hook for reading data
  const recipesQuery = useCustomRecipes();

  // Mutation hooks for CRUD operations
  const addMutation = useAddCustomRecipe();
  const updateMutation = useUpdateCustomRecipe();
  const deleteMutation = useDeleteCustomRecipe();
  const clearMutation = useClearCustomRecipes();

  // Determine if any operation is in progress
  const isMutating =
    addMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    clearMutation.isPending;

  const isLoading = recipesQuery.isPending || isMutating;

  // Wrapper for add with proper error handling
  const addCustomRecipe = useCallback(
    async (formData: CustomRecipeFormData): Promise<string> => {
      const result = await addMutation.mutateAsync(formData);
      return result.id;
    },
    [addMutation]
  );

  // Wrapper for update with proper error handling
  const updateCustomRecipe = useCallback(
    async (id: string, formData: CustomRecipeFormData): Promise<void> => {
      await updateMutation.mutateAsync({ id, formData });
    },
    [updateMutation]
  );

  // Wrapper for delete with proper error handling
  const deleteCustomRecipe = useCallback(
    async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  // Wrapper for clear all with proper error handling
  const clearAllCustomRecipes = useCallback(async (): Promise<void> => {
    await clearMutation.mutateAsync();
  }, [clearMutation]);

  // Manual refresh function
  const forceRefresh = useCallback(async (): Promise<CustomRecipe[]> => {
    await recipesQuery.refetch();
    return recipesQuery.data ?? [];
  }, [recipesQuery]);

  return {
    // Data
    customRecipes: recipesQuery.data ?? [],

    // State
    isLoading,
    isPending: recipesQuery.isPending,
    isMutating,
    error:
      recipesQuery.error ??
      addMutation.error ??
      updateMutation.error ??
      deleteMutation.error ??
      clearMutation.error,

    // Operations
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
    clearAllCustomRecipes,
    forceRefresh,

    // Raw mutations for advanced usage
    _addMutation: addMutation,
    _updateMutation: updateMutation,
    _deleteMutation: deleteMutation,
    _clearMutation: clearMutation,
    _recipesQuery: recipesQuery,
  };
}

/**
 * Legacy export for backwards compatibility
 * Re-exports the unified hook as 'useCustomRecipes'
 */
export { useCustomRecipesUnified as useCustomRecipes };
