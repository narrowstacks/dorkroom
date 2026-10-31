import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipeFormData,
  FilmdevMappingResult,
} from '@dorkroom/logic';
import {
  type DevelopmentCombinationView,
  FilmdevPreviewModal,
  SharedRecipeModal,
} from '@dorkroom/ui/development-recipes';
import type { FC } from 'react';
import { CustomRecipeModal } from './custom-recipe-modal';
import { ImportRecipeModal } from './import-recipe-modal';

export interface RecipeModalsProps {
  isMobile: boolean;
  // Custom recipe modal
  isCustomModalOpen: boolean;
  editingRecipe: DevelopmentCombinationView | null;
  isSubmittingRecipe: boolean;
  onCloseCustomModal: () => void;
  onCustomRecipeSubmit: (data: CustomRecipeFormData) => Promise<void>;
  filmOptions: Array<{ label: string; value: string }>;
  developerOptions: Array<{ label: string; value: string }>;
  allFilms: Film[];
  allDevelopers: Developer[];
  // Import modal
  isImportModalOpen: boolean;
  onCloseImportModal: () => void;
  isImporting: boolean;
  importError?: string;
  onImportRecipe: (url: string) => Promise<void>;
  // Shared recipe modal
  isSharedRecipeModalOpen: boolean;
  sharedRecipeView: DevelopmentCombinationView | null;
  sharedRecipeSource: 'shared' | 'custom';
  isAddingSharedRecipe: boolean;
  onAcceptSharedRecipe: () => Promise<void>;
  onDeclineSharedRecipe: () => void;
  // Filmdev preview modal
  isFilmdevPreviewOpen: boolean;
  filmdevPreviewData: FilmdevMappingResult | null;
  filmdevPreviewRecipe: DevelopmentCombinationView | null;
  onCloseFilmdevPreview: () => void;
  onConfirmFilmdevImport: () => Promise<void>;
  // Favorites, for the shared recipe preview
  isFavorite: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite: (view: DevelopmentCombinationView) => void;
}

export const RecipeModals: FC<RecipeModalsProps> = (props) => {
  const {
    isMobile,
    isCustomModalOpen,
    editingRecipe,
    isSubmittingRecipe,
    onCloseCustomModal,
    onCustomRecipeSubmit,
    filmOptions,
    developerOptions,
    allFilms,
    allDevelopers,
    isImportModalOpen,
    onCloseImportModal,
    isImporting,
    importError,
    onImportRecipe,
    isSharedRecipeModalOpen,
    sharedRecipeView,
    sharedRecipeSource,
    isAddingSharedRecipe,
    onAcceptSharedRecipe,
    onDeclineSharedRecipe,
    isFilmdevPreviewOpen,
    filmdevPreviewData,
    filmdevPreviewRecipe,
    onCloseFilmdevPreview,
    onConfirmFilmdevImport,
    isFavorite,
    onToggleFavorite,
  } = props;

  return (
    <>
      <CustomRecipeModal
        isOpen={isCustomModalOpen}
        onClose={onCloseCustomModal}
        isMobile={isMobile}
        editingRecipe={editingRecipe}
        isSubmitting={isSubmittingRecipe}
        onSubmit={onCustomRecipeSubmit}
        filmOptions={filmOptions}
        developerOptions={developerOptions}
        allFilms={allFilms}
        allDevelopers={allDevelopers}
      />

      <ImportRecipeModal
        isOpen={isImportModalOpen}
        onClose={onCloseImportModal}
        isMobile={isMobile}
        isProcessing={isImporting}
        error={importError}
        onImport={onImportRecipe}
      />

      <SharedRecipeModal
        isOpen={isSharedRecipeModalOpen}
        onClose={onDeclineSharedRecipe}
        recipe={sharedRecipeView}
        onAddToCollection={onAcceptSharedRecipe}
        isProcessing={isAddingSharedRecipe}
        recipeSource={sharedRecipeSource}
        isMobile={isMobile}
        hideAddToCollection={false}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />

      <FilmdevPreviewModal
        isOpen={isFilmdevPreviewOpen}
        onClose={onCloseFilmdevPreview}
        onConfirm={onConfirmFilmdevImport}
        mappingResult={filmdevPreviewData}
        previewRecipe={filmdevPreviewRecipe}
        isProcessing={isImporting}
        isMobile={isMobile}
      />
    </>
  );
};
