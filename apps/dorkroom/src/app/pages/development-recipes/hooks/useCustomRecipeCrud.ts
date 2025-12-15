import type { CustomRecipe, CustomRecipeFormData } from '@dorkroom/logic';
import { debugError } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import { getCombinationIdentifier } from '../utils/recipeUtils';

export interface UseCustomRecipeCrudProps {
  customRecipes: CustomRecipe[];
  addCustomRecipe: (data: CustomRecipeFormData) => Promise<string>;
  updateCustomRecipe: (id: string, data: CustomRecipeFormData) => Promise<void>;
  deleteCustomRecipe: (id: string) => Promise<void>;
  refreshCustomRecipes: () => Promise<unknown>;
  addFavorite: (id: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  // Modal state
  editingRecipe: DevelopmentCombinationView | null;
  detailView: DevelopmentCombinationView | null;
  // Modal setters
  setIsCustomModalOpen: Dispatch<SetStateAction<boolean>>;
  setEditingRecipe: Dispatch<SetStateAction<DevelopmentCombinationView | null>>;
  setIsSubmittingRecipe: Dispatch<SetStateAction<boolean>>;
  setIsDetailOpen: Dispatch<SetStateAction<boolean>>;
  setDetailView: Dispatch<SetStateAction<DevelopmentCombinationView | null>>;
}

export interface UseCustomRecipeCrudReturn {
  handleCustomRecipeSubmit: (data: CustomRecipeFormData) => Promise<void>;
  handleEditCustomRecipe: (view: DevelopmentCombinationView) => void;
  handleDeleteCustomRecipe: (view: DevelopmentCombinationView) => Promise<void>;
}

/**
 * Hook for managing custom recipe CRUD operations.
 * Extracts create/update/delete logic from the main useRecipeActions hook.
 */
export function useCustomRecipeCrud({
  customRecipes,
  addCustomRecipe,
  updateCustomRecipe,
  deleteCustomRecipe,
  refreshCustomRecipes,
  addFavorite,
  showToast,
  editingRecipe,
  detailView,
  setIsCustomModalOpen,
  setEditingRecipe,
  setIsSubmittingRecipe,
  setIsDetailOpen,
  setDetailView,
}: UseCustomRecipeCrudProps): UseCustomRecipeCrudReturn {
  const handleCustomRecipeSubmit = useCallback(
    async (data: CustomRecipeFormData) => {
      setIsSubmittingRecipe(true);
      try {
        if (editingRecipe) {
          // Update existing recipe
          const editingId = getCombinationIdentifier(editingRecipe.combination);
          const customRecipe = customRecipes.find((r) => r.id === editingId);
          if (!customRecipe) {
            // Fail fast: recipe was deleted or doesn't exist
            showToast(
              'Unable to find the recipe you are editing. It may have been deleted.',
              'error'
            );
            return;
          }
          await updateCustomRecipe(customRecipe.id, data);
        } else {
          // Add new recipe
          const newId = await addCustomRecipe(data);
          if (data.isFavorite) {
            addFavorite(newId);
          }
        }
        await refreshCustomRecipes();
        setIsCustomModalOpen(false);
        setEditingRecipe(null);
      } catch (error) {
        debugError('Failed to save custom recipe:', error);
        showToast('Failed to save the recipe. Please try again.', 'error');
        return; // Don't close modal or clear state on error
      } finally {
        setIsSubmittingRecipe(false);
      }
    },
    [
      addCustomRecipe,
      updateCustomRecipe,
      refreshCustomRecipes,
      editingRecipe,
      customRecipes,
      addFavorite,
      showToast,
      setIsSubmittingRecipe,
      setIsCustomModalOpen,
      setEditingRecipe,
    ]
  );

  const handleEditCustomRecipe = useCallback(
    (view: DevelopmentCombinationView) => {
      const recipeId = getCombinationIdentifier(view.combination);
      const customRecipe = customRecipes.find((r) => r.id === recipeId);
      if (customRecipe) {
        setEditingRecipe(view);
        setIsCustomModalOpen(true);
      }
    },
    [customRecipes, setEditingRecipe, setIsCustomModalOpen]
  );

  const handleDeleteCustomRecipe = useCallback(
    async (view: DevelopmentCombinationView) => {
      if (
        !window.confirm(
          'Are you sure you want to delete this custom recipe? This action cannot be undone.'
        )
      ) {
        return;
      }
      try {
        const recipeId = getCombinationIdentifier(view.combination);
        await deleteCustomRecipe(recipeId);
        await refreshCustomRecipes();

        // Close detail modal if it's showing the deleted recipe
        if (getCombinationIdentifier(detailView?.combination) === recipeId) {
          setIsDetailOpen(false);
          setDetailView(null);
        }
      } catch (error) {
        debugError('Failed to delete custom recipe:', error);
        window.alert('Failed to delete the recipe. Please try again.');
      }
    },
    [
      deleteCustomRecipe,
      refreshCustomRecipes,
      detailView,
      setIsDetailOpen,
      setDetailView,
    ]
  );

  return {
    handleCustomRecipeSubmit,
    handleEditCustomRecipe,
    handleDeleteCustomRecipe,
  };
}
