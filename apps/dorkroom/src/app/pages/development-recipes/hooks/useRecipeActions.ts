import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipe,
  CustomRecipeFormData,
  FilmdevMappingResult,
} from '@dorkroom/logic';
import { debugError, debugLog } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import { useCustomRecipeCrud } from './useCustomRecipeCrud';
import { useFavoriteActions } from './useFavoriteActions';
import { useRecipeDetailActions } from './useRecipeDetailActions';
import { useRecipeImportActions } from './useRecipeImportActions';
import { useRecipeSharingActions } from './useRecipeSharingActions';

interface UseRecipeActionsProps {
  // Custom recipe mutations
  customRecipes: CustomRecipe[];
  addCustomRecipe: (data: CustomRecipeFormData) => Promise<string>;
  updateCustomRecipe: (id: string, data: CustomRecipeFormData) => Promise<void>;
  deleteCustomRecipe: (id: string) => Promise<void>;
  refreshCustomRecipes: () => Promise<unknown>;

  // Sharing functions - using any to accept actual hook return types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shareCustomRecipe: (params: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  copyCustomRecipeToClipboard: (params: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shareRegularRecipe: (params: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  copyRegularRecipeToClipboard: (params: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodeSharedCustomRecipe: (input: string) => any;

  // Favorites
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  addFavorite: (id: string) => void;

  // UI state
  showToast: (message: string, type: 'success' | 'error') => void;
  animationsEnabled: boolean;
  pageIndex: number;

  // Modal state setters
  setIsDetailOpen: Dispatch<SetStateAction<boolean>>;
  setDetailView: Dispatch<SetStateAction<DevelopmentCombinationView | null>>;
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

  // Current state values
  editingRecipe: DevelopmentCombinationView | null;
  detailView: DevelopmentCombinationView | null;
  sharedRecipeView: DevelopmentCombinationView | null;
  sharedRecipeSource: 'shared' | 'custom';
  filmdevPreviewData: FilmdevMappingResult | null;
  favoriteTransitions: Map<string, 'adding' | 'removing'>;
  setFavoriteTransitions: Dispatch<
    SetStateAction<Map<string, 'adding' | 'removing'>>
  >;

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
    refreshCustomRecipes,
    shareCustomRecipe,
    copyCustomRecipeToClipboard,
    shareRegularRecipe,
    copyRegularRecipeToClipboard,
    decodeSharedCustomRecipe,
    isFavorite,
    toggleFavorite,
    addFavorite,
    showToast,
    animationsEnabled,
    pageIndex,
    setIsDetailOpen,
    setDetailView,
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
    editingRecipe,
    detailView,
    sharedRecipeView,
    sharedRecipeSource,
    filmdevPreviewData,
    setFavoriteTransitions,
    forceRefresh,
    setIsRefreshingData,
    getFilmById,
    getDeveloperById,
    allFilms,
    allDevelopers,
  } = props;

  // Detail drawer actions
  const { handleOpenDetail } = useRecipeDetailActions({
    setDetailView,
    setIsDetailOpen,
  });

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
  } = useCustomRecipeCrud({
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
  });

  // Favorite actions
  const { handleCheckFavorite, handleToggleFavorite } = useFavoriteActions({
    isFavorite,
    toggleFavorite,
    animationsEnabled,
    pageIndex,
    setFavoriteTransitions,
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
    refreshCustomRecipes,
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
      debugLog('Calling forceRefresh() and refreshCustomRecipes()...');
      await Promise.all([forceRefresh(), refreshCustomRecipes()]);
      debugLog('All refreshes completed');
    } catch (error) {
      debugError('handleRefreshAll error:', error);
    } finally {
      setIsRefreshingData(false);
    }
  }, [forceRefresh, refreshCustomRecipes, setIsRefreshingData]);

  return {
    handleOpenDetail,
    handleShareCombination,
    handleCopyCombination,
    handleCustomRecipeSubmit,
    handleEditCustomRecipe,
    handleDeleteCustomRecipe,
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
