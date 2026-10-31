import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipe, CustomRecipeFormData } from '@dorkroom/logic';
import {
  createCombinationFromCustomRecipe,
  debugError,
  getCustomRecipeDeveloper,
  getCustomRecipeFilm,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import { trackEvent } from '../../../lib/analytics/tracked-events';
import { getCombinationIdentifier } from '../utils/recipeUtils';

export interface UseCustomRecipeCrudProps {
  customRecipes: CustomRecipe[];
  addCustomRecipe: (data: CustomRecipeFormData) => string;
  updateCustomRecipe: (id: string, data: CustomRecipeFormData) => CustomRecipe;
  deleteCustomRecipe: (id: string) => void;
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
  // Delete confirmation modal
  deleteConfirmRecipe: DevelopmentCombinationView | null;
  openDeleteConfirm: (view: DevelopmentCombinationView) => void;
  closeDeleteConfirm: () => void;
  setIsDeleting: Dispatch<SetStateAction<boolean>>;
  // Data helpers for building updated views
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
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
  detailView,
  setIsCustomModalOpen,
  setEditingRecipe,
  setIsSubmittingRecipe,
  setIsDetailOpen,
  setDetailView,
  deleteConfirmRecipe,
  openDeleteConfirm,
  closeDeleteConfirm,
  setIsDeleting,
  getFilmById,
  getDeveloperById,
}: UseCustomRecipeCrudProps): UseCustomRecipeCrudReturn {
  const handleCustomRecipeSubmit = useCallback(
    async (data: CustomRecipeFormData) => {
      setIsSubmittingRecipe(true);
      try {
        let recipeId: string;
        let savedRecipe: CustomRecipe | undefined;

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
          savedRecipe = updateCustomRecipe(customRecipe.id, data);
          recipeId = customRecipe.id;
        } else {
          // Add new recipe
          recipeId = addCustomRecipe(data);
          if (data.isFavorite) {
            addFavorite(recipeId);
          }
        }

        // If detail view is showing the edited recipe, update it with fresh data
        const detailViewId = getCombinationIdentifier(detailView?.combination);
        if (savedRecipe && detailViewId === recipeId) {
          const saved = [savedRecipe];
          const updatedView: DevelopmentCombinationView = {
            combination: createCombinationFromCustomRecipe(savedRecipe),
            film: getCustomRecipeFilm(recipeId, saved, getFilmById),
            developer: getCustomRecipeDeveloper(
              recipeId,
              saved,
              getDeveloperById
            ),
            source: 'custom',
            canShare: true,
          };
          setDetailView(updatedView);
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
      detailView,
      addFavorite,
      showToast,
      setIsSubmittingRecipe,
      setIsCustomModalOpen,
      setEditingRecipe,
      setDetailView,
      getFilmById,
      getDeveloperById,
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
      const recipeId = getCombinationIdentifier(
        deleteConfirmRecipe.combination
      );
      deleteCustomRecipe(recipeId);

      // Close detail modal if it's showing the deleted recipe
      if (getCombinationIdentifier(detailView?.combination) === recipeId) {
        setIsDetailOpen(false);
        setDetailView(null);
      }

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
    detailView,
    setIsDetailOpen,
    setDetailView,
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
