import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipe,
  CustomRecipeFormData,
  CustomRecipeShareOptions,
  CustomRecipeShareResult,
  FilmdevMappingResult,
  ImportedCustomRecipe,
  RecipeShareResult,
  RegularRecipeShareOptions,
} from '@dorkroom/logic';
import { debugError, debugLog } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import { useCustomRecipeCrud } from './useCustomRecipeCrud';
import { useFavoriteActions } from './useFavoriteActions';
import { useRecipeImportActions } from './useRecipeImportActions';
import { useRecipeSharingActions } from './useRecipeSharingActions';

interface UseRecipeActionsProps {
  // Custom recipe mutations
  customRecipes: CustomRecipe[];
  addCustomRecipe: (data: CustomRecipeFormData) => string;
  updateCustomRecipe: (id: string, data: CustomRecipeFormData) => CustomRecipe;
  deleteCustomRecipe: (id: string) => void;

  // Sharing functions
  shareCustomRecipe: (
    params: CustomRecipeShareOptions
  ) => Promise<CustomRecipeShareResult>;
  copyCustomRecipeToClipboard: (
    params: CustomRecipeShareOptions
  ) => Promise<CustomRecipeShareResult>;
  shareRegularRecipe: (
    params: RegularRecipeShareOptions
  ) => Promise<RecipeShareResult>;
  copyRegularRecipeToClipboard: (
    params: RegularRecipeShareOptions
  ) => Promise<RecipeShareResult>;
  decodeSharedCustomRecipe: (input: string) => ImportedCustomRecipe | null;

  // Favorites
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  addFavorite: (id: string) => void;

  // UI state
  showToast: (message: string, type: 'success' | 'error') => void;

  // Modal state setters
  setIsCustomModalOpen: Dispatch<SetStateAction<boolean>>;
  setEditingRecipe: Dispatch<SetStateAction<DevelopmentCombinationView | null>>;
  setIsSubmittingRecipe: Dispatch<SetStateAction<boolean>>;
  setIsSharedRecipeModalOpen: Dispatch<SetStateAction<boolean>>;
  setSharedRecipeView: Dispatch<
    SetStateAction<DevelopmentCombinationView | null>
  >;
  setIsAddingSharedRecipe: Dispatch<SetStateAction<boolean>>;
  setIsFilmdevPreviewOpen: Dispatch<SetStateAction<boolean>>;
  setFilmdevPreviewData: Dispatch<SetStateAction<FilmdevMappingResult | null>>;
  setFilmdevPreviewRecipe: Dispatch<
    SetStateAction<DevelopmentCombinationView | null>
  >;
  setIsImportModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsImporting: Dispatch<SetStateAction<boolean>>;
  setImportError: Dispatch<SetStateAction<string | null>>;

  // Delete confirmation modal
  deleteConfirmRecipe: DevelopmentCombinationView | null;
  openDeleteConfirm: (view: DevelopmentCombinationView) => void;
  closeDeleteConfirm: () => void;
  setIsDeleting: Dispatch<SetStateAction<boolean>>;

  // Current state values
  editingRecipe: DevelopmentCombinationView | null;
  sharedRecipeView: DevelopmentCombinationView | null;
  sharedRecipeSource: 'shared' | 'custom';
  filmdevPreviewData: FilmdevMappingResult | null;

  // Data refresh
  forceRefresh: () => Promise<void>;
  setIsRefreshingData: Dispatch<SetStateAction<boolean>>;

  // Film/Developer data
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
  allFilms: Film[];
  allDevelopers: Developer[];
}

/**
 * Composition hook that combines all recipe action hooks.
 * This maintains backward compatibility while delegating to focused hooks.
 */
export function useRecipeActions(props: UseRecipeActionsProps) {
  const {
    customRecipes,
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
    shareCustomRecipe,
    copyCustomRecipeToClipboard,
    shareRegularRecipe,
    copyRegularRecipeToClipboard,
    decodeSharedCustomRecipe,
    isFavorite,
    toggleFavorite,
    addFavorite,
    showToast,
    setIsCustomModalOpen,
    setEditingRecipe,
    setIsSubmittingRecipe,
    setIsSharedRecipeModalOpen,
    setSharedRecipeView,
    setIsAddingSharedRecipe,
    setIsFilmdevPreviewOpen,
    setFilmdevPreviewData,
    setFilmdevPreviewRecipe,
    setIsImportModalOpen,
    setIsImporting,
    setImportError,
    deleteConfirmRecipe,
    openDeleteConfirm,
    closeDeleteConfirm,
    setIsDeleting,
    editingRecipe,
    sharedRecipeView,
    sharedRecipeSource,
    filmdevPreviewData,
    forceRefresh,
    setIsRefreshingData,
    getFilmById,
    getDeveloperById,
    allFilms,
    allDevelopers,
  } = props;

  // Sharing actions
  const { handleShareCombination, handleCopyCombination } =
    useRecipeSharingActions({
      customRecipes,
      shareCustomRecipe,
      copyCustomRecipeToClipboard,
      shareRegularRecipe,
      copyRegularRecipeToClipboard,
      showToast,
    });

  // CRUD actions
  const {
    handleCustomRecipeSubmit,
    handleEditCustomRecipe,
    handleDeleteCustomRecipe,
    confirmDeleteCustomRecipe,
  } = useCustomRecipeCrud({
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
  });

  // Favorite actions
  const { handleCheckFavorite, handleToggleFavorite } = useFavoriteActions({
    isFavorite,
    toggleFavorite,
  });

  // Import actions
  const {
    handleAcceptSharedRecipe,
    handleDeclineSharedRecipe,
    handleImportRecipe,
    handleCloseFilmdevPreview,
    handleConfirmFilmdevImport,
  } = useRecipeImportActions({
    addCustomRecipe,
    decodeSharedCustomRecipe,
    allFilms,
    allDevelopers,
    getFilmById,
    getDeveloperById,
    sharedRecipeView,
    sharedRecipeSource,
    filmdevPreviewData,
    setIsSharedRecipeModalOpen,
    setSharedRecipeView,
    setIsAddingSharedRecipe,
    setIsFilmdevPreviewOpen,
    setFilmdevPreviewData,
    setFilmdevPreviewRecipe,
    setIsImportModalOpen,
    setIsImporting,
    setImportError,
    showToast,
  });

  // Refresh action (kept inline - too simple to extract)
  const handleRefreshAll = useCallback(async () => {
    debugLog('handleRefreshAll() triggered from Refresh button');
    setIsRefreshingData(true);
    try {
      // Custom recipes are a synchronous store that is always current, so
      // only the catalogue needs refetching.
      debugLog('Calling forceRefresh()...');
      await forceRefresh();
      debugLog('All refreshes completed');
    } catch (error) {
      debugError('handleRefreshAll error:', error);
    } finally {
      setIsRefreshingData(false);
    }
  }, [forceRefresh, setIsRefreshingData]);

  return {
    handleShareCombination,
    handleCopyCombination,
    handleCustomRecipeSubmit,
    handleEditCustomRecipe,
    handleDeleteCustomRecipe,
    confirmDeleteCustomRecipe,
    handleCheckFavorite,
    handleToggleFavorite,
    handleAcceptSharedRecipe,
    handleDeclineSharedRecipe,
    handleCloseFilmdevPreview,
    handleConfirmFilmdevImport,
    handleImportRecipe,
    handleRefreshAll,
  };
}
