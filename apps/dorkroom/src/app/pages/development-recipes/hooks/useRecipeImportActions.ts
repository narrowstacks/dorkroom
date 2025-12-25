import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipeFormData,
  FilmdevMappingResult,
  ImportedCustomRecipe,
} from '@dorkroom/logic';
import { isFilmdevInput } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import { useFilmdevImport } from './useFilmdevImport';
import { useRecipeCodeImport } from './useRecipeCodeImport';
import { useSharedRecipeImport } from './useSharedRecipeImport';

export interface UseRecipeImportActionsProps {
  // Recipe operations
  addCustomRecipe: (data: CustomRecipeFormData) => Promise<string>;
  refreshCustomRecipes: () => Promise<unknown>;
  decodeSharedCustomRecipe: (input: string) => ImportedCustomRecipe | null;

  // Film/Developer data
  allFilms: Film[];
  allDevelopers: Developer[];
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;

  // Modal state
  sharedRecipeView: DevelopmentCombinationView | null;
  sharedRecipeSource: 'shared' | 'custom';
  filmdevPreviewData: FilmdevMappingResult | null;

  // Modal setters
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

  showToast: (message: string, type: 'success' | 'error') => void;
}

export interface UseRecipeImportActionsReturn {
  handleAcceptSharedRecipe: () => Promise<void>;
  handleDeclineSharedRecipe: () => void;
  handleImportRecipe: (input: string) => Promise<void>;
  handleCloseFilmdevPreview: () => void;
  handleConfirmFilmdevImport: () => Promise<void>;
}

/**
 * Hook for managing recipe import actions.
 * Composition layer that routes imports to specialized handlers:
 * - useSharedRecipeImport: Handles accepting/declining shared recipes from URL parameters
 * - useFilmdevImport: Handles filmdev.org URL/ID import flow
 * - useRecipeCodeImport: Handles shared recipe code decoding and import
 */
export function useRecipeImportActions({
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
}: UseRecipeImportActionsProps): UseRecipeImportActionsReturn {
  // Shared recipe import from URL parameters
  const { handleAcceptSharedRecipe, handleDeclineSharedRecipe } =
    useSharedRecipeImport({
      addCustomRecipe,
      refreshCustomRecipes,
      sharedRecipeView,
      sharedRecipeSource,
      setIsSharedRecipeModalOpen,
      setSharedRecipeView,
      setIsAddingSharedRecipe,
      showToast,
    });

  // Filmdev.org import
  const {
    handleFilmdevImport,
    handleCloseFilmdevPreview,
    handleConfirmFilmdevImport,
  } = useFilmdevImport({
    addCustomRecipe,
    refreshCustomRecipes,
    allFilms,
    allDevelopers,
    filmdevPreviewData,
    setIsFilmdevPreviewOpen,
    setFilmdevPreviewData,
    setFilmdevPreviewRecipe,
    setIsImportModalOpen,
    setIsImporting,
    setImportError,
  });

  // Recipe code import
  const { handleCodeImport } = useRecipeCodeImport({
    addCustomRecipe,
    refreshCustomRecipes,
    decodeSharedCustomRecipe,
    getFilmById,
    getDeveloperById,
    setIsImportModalOpen,
    setIsImporting,
    setImportError,
  });

  // Unified import handler that routes to appropriate sub-handler
  const handleImportRecipe = useCallback(
    async (input: string) => {
      try {
        if (isFilmdevInput(input)) {
          await handleFilmdevImport(input);
        } else {
          await handleCodeImport(input);
        }
      } catch (err) {
        // Errors are handled by sub-hooks
        // This catch prevents unhandled promise rejections
      }
    },
    [handleFilmdevImport, handleCodeImport]
  );

  return {
    handleAcceptSharedRecipe,
    handleDeclineSharedRecipe,
    handleImportRecipe,
    handleCloseFilmdevPreview,
    handleConfirmFilmdevImport,
  };
}
