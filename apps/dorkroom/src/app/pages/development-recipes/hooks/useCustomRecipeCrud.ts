import type { CustomRecipe, CustomRecipeFormData } from '@dorkroom/logic';
import { debugError, recipeIdOf } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import { trackEvent } from '../../../lib/analytics/tracked-events';

export interface UseCustomRecipeCrudProps {
  customRecipes: CustomRecipe[];
  addCustomRecipe: (data: CustomRecipeFormData) => string;
  updateCustomRecipe: (id: string, data: CustomRecipeFormData) => CustomRecipe;
  deleteCustomRecipe: (id: string) => void;
  addFavorite: (id: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  // Modal state
  editingRecipe: DevelopmentCombinationView | null;
  // Modal setters
  setIsCustomModalOpen: Dispatch<SetStateAction<boolean>>;
  setEditingRecipe: Dispatch<SetStateAction<DevelopmentCombinationView | null>>;
  setIsSubmittingRecipe: Dispatch<SetStateAction<boolean>>;
  // Delete confirmation modal
  deleteConfirmRecipe: DevelopmentCombinationView | null;
  openDeleteConfirm: (view: DevelopmentCombinationView) => void;
  closeDeleteConfirm: () => void;
  setIsDeleting: Dispatch<SetStateAction<boolean>>;
}

export interface UseCustomRecipeCrudReturn {
  handleCustomRecipeSubmit: (data: CustomRecipeFormData) => Promise<void>;
  handleEditCustomRecipe: (view: DevelopmentCombinationView) => void;
  /** Opens the delete confirmation modal */
  handleDeleteCustomRecipe: (view: DevelopmentCombinationView) => void;
  /** Confirms and performs the deletion (called from modal) */
  confirmDeleteCustomRecipe: () => Promise<void>;
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
  addFavorite,
  showToast,
  editingRecipe,
  setIsCustomModalOpen,
  setEditingRecipe,
  setIsSubmittingRecipe,
  deleteConfirmRecipe,
  openDeleteConfirm,
  closeDeleteConfirm,
  setIsDeleting,
}: UseCustomRecipeCrudProps): UseCustomRecipeCrudReturn {
  const handleCustomRecipeSubmit = useCallback(
    async (data: CustomRecipeFormData) => {
      setIsSubmittingRecipe(true);
      try {
        if (editingRecipe) {
          // Update existing recipe
          const editingId = recipeIdOf(editingRecipe);
          const customRecipe = customRecipes.find((r) => r.id === editingId);
          if (!customRecipe) {
            // Fail fast: recipe was deleted or doesn't exist
            showToast(
              'Unable to find the recipe you are editing. It may have been deleted.',
              'error'
            );
            return;
          }
          updateCustomRecipe(customRecipe.id, data);
        } else {
          // Add new recipe
          const recipeId = addCustomRecipe(data);
          if (data.isFavorite) {
            addFavorite(recipeId);
          }
        }

        trackEvent('recipe_saved', {
          action: editingRecipe ? 'updated' : 'created',
          source: 'manual',
        });

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
      const recipeId = recipeIdOf(view);
      const customRecipe = customRecipes.find((r) => r.id === recipeId);
      if (customRecipe) {
        setEditingRecipe(view);
        setIsCustomModalOpen(true);
      }
    },
    [customRecipes, setEditingRecipe, setIsCustomModalOpen]
  );

  const handleDeleteCustomRecipe = useCallback(
    (view: DevelopmentCombinationView) => {
      openDeleteConfirm(view);
    },
    [openDeleteConfirm]
  );

  const confirmDeleteCustomRecipe = useCallback(async () => {
    if (!deleteConfirmRecipe) {
      return;
    }

    setIsDeleting(true);
    try {
      const recipeId = recipeIdOf(deleteConfirmRecipe);
      deleteCustomRecipe(recipeId);

      trackEvent('recipe_deleted', { scope: 'single' });

      closeDeleteConfirm();
    } catch (error) {
      debugError('Failed to delete custom recipe:', error);
      showToast('Failed to delete the recipe. Please try again.', 'error');
      setIsDeleting(false);
    }
  }, [
    deleteConfirmRecipe,
    deleteCustomRecipe,
    closeDeleteConfirm,
    setIsDeleting,
    showToast,
  ]);

  return {
    handleCustomRecipeSubmit,
    handleEditCustomRecipe,
    handleDeleteCustomRecipe,
    confirmDeleteCustomRecipe,
  };
}
