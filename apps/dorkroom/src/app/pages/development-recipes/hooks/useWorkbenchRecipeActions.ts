import type { Developer, Film } from '@dorkroom/api';
import {
  type CustomRecipe,
  type CustomRecipeFormData,
  useFavorites,
  useRecipeSharing,
} from '@dorkroom/logic';
import { useToast } from '@dorkroom/ui';
import { useState } from 'react';
import { useRecipeActions } from './useRecipeActions';
import { useRecipeModals } from './useRecipeModals';

interface UseWorkbenchRecipeActionsProps {
  customRecipes: CustomRecipe[];
  addCustomRecipe: (data: CustomRecipeFormData) => string;
  updateCustomRecipe: (id: string, data: CustomRecipeFormData) => CustomRecipe;
  deleteCustomRecipe: (id: string) => void;
  favorites: ReturnType<typeof useFavorites>;
  /** Called with the id of a recipe just created, imported or accepted. */
  onRecipeCreated: (id: string) => void;
  forceRefresh: () => Promise<void>;
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
  catalogFilms: Film[];
  catalogDevelopers: Developer[];
}

/**
 * `useRecipeActions` for a page with no detail drawer. The drawer setters are
 * dropped because the open recipe is derived from the index: an edit refreshes
 * it and a delete falls to the default without being told.
 */
export function useWorkbenchRecipeActions({
  customRecipes,
  addCustomRecipe,
  updateCustomRecipe,
  deleteCustomRecipe,
  favorites,
  onRecipeCreated,
  forceRefresh,
  getFilmById,
  getDeveloperById,
  catalogFilms,
  catalogDevelopers,
}: UseWorkbenchRecipeActionsProps) {
  const sharing = useRecipeSharing();
  const { showToast } = useToast();
  const modals = useRecipeModals();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const actions = useRecipeActions({
    customRecipes,
    addCustomRecipe: (data) => {
      const id = addCustomRecipe(data);
      onRecipeCreated(id);
      return id;
    },
    updateCustomRecipe,
    deleteCustomRecipe,
    shareCustomRecipe: sharing.shareCustomRecipe,
    copyCustomRecipeToClipboard: sharing.copyCustomRecipeToClipboard,
    shareRegularRecipe: sharing.shareRegularRecipe,
    copyRegularRecipeToClipboard: sharing.copyRegularRecipeToClipboard,
    decodeSharedCustomRecipe: sharing.decodeSharedCustomRecipe,
    isFavorite: favorites.isFavorite,
    toggleFavorite: favorites.toggleFavorite,
    addFavorite: favorites.addFavorite,
    showToast,
    setIsCustomModalOpen: modals.setIsCustomModalOpen,
    setEditingRecipe: modals.setEditingRecipe,
    setIsSubmittingRecipe: modals.setIsSubmittingRecipe,
    setIsSharedRecipeModalOpen: modals.setIsSharedRecipeModalOpen,
    setSharedRecipeView: modals.setSharedRecipeView,
    setIsAddingSharedRecipe: modals.setIsAddingSharedRecipe,
    setIsFilmdevPreviewOpen: modals.setIsFilmdevPreviewOpen,
    setFilmdevPreviewData: modals.setFilmdevPreviewData,
    setFilmdevPreviewRecipe: modals.setFilmdevPreviewRecipe,
    setIsImportModalOpen: modals.setIsImportModalOpen,
    setIsImporting: modals.setIsImporting,
    setImportError: modals.setImportError,
    deleteConfirmRecipe: modals.deleteConfirmRecipe,
    openDeleteConfirm: modals.openDeleteConfirm,
    closeDeleteConfirm: modals.closeDeleteConfirm,
    setIsDeleting: modals.setIsDeleting,
    editingRecipe: modals.editingRecipe,
    sharedRecipeView: modals.sharedRecipeView,
    sharedRecipeSource: modals.sharedRecipeSource,
    filmdevPreviewData: modals.filmdevPreviewData,
    forceRefresh,
    setIsRefreshingData: setIsRefreshing,
    getFilmById,
    getDeveloperById,
    // The importer matches against the whole catalogue: a film with no recipes
    // yet must still be matchable.
    allFilms: catalogFilms,
    allDevelopers: catalogDevelopers,
  });

  return { actions, modals, isRefreshing };
}
