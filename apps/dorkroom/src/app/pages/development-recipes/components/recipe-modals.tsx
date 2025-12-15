import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipeFormData,
  FilmdevMappingResult,
} from '@dorkroom/logic';
import {
  type DevelopmentCombinationView,
  FilmdevPreviewModal,
  SharedRecipeModal,
} from '@dorkroom/ui';
import type { FC } from 'react';
import { CustomRecipeModal } from './custom-recipe-modal';
import { ImportRecipeModal } from './import-recipe-modal';
import { RecipeDetailModal } from './recipe-detail-modal';

export interface RecipeModalsProps {
  isMobile: boolean;
  // Detail modal
  isDetailOpen: boolean;
  detailView: DevelopmentCombinationView | null;
  onCloseDetail: () => void;
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
  // Common handlers
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onEditCustomRecipe: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe: (view: DevelopmentCombinationView) => Promise<void>;
  onShareRecipe: (view: DevelopmentCombinationView) => Promise<void>;
  onCopyRecipe: (view: DevelopmentCombinationView) => Promise<void>;
  customRecipeSharingEnabled: boolean;
}

export const RecipeModals: FC<RecipeModalsProps> = (props) => {
  const {
    isMobile,
    isDetailOpen,
    detailView,
    onCloseDetail,
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
    toggleFavorite,
    onEditCustomRecipe,
    onDeleteCustomRecipe,
    onShareRecipe,
    onCopyRecipe,
    customRecipeSharingEnabled,
  } = props;

  return (
    <>
      <RecipeDetailModal
        isOpen={isDetailOpen && !!detailView}
        onClose={onCloseDetail}
        detailView={detailView}
        isMobile={isMobile}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        onEditCustomRecipe={onEditCustomRecipe}
        onDeleteCustomRecipe={onDeleteCustomRecipe}
        onShareRecipe={onShareRecipe}
        onCopyRecipe={onCopyRecipe}
        customRecipeSharingEnabled={customRecipeSharingEnabled}
      />

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
        variant={isMobile ? 'drawer' : 'modal'}
        hideAddToCollection={false}
        isFavorite={(view) =>
          isFavorite(String(view.combination.uuid || view.combination.id))
        }
        onToggleFavorite={(view) =>
          toggleFavorite(String(view.combination.uuid || view.combination.id))
        }
      />

      <FilmdevPreviewModal
        isOpen={isFilmdevPreviewOpen}
        onClose={onCloseFilmdevPreview}
        onConfirm={onConfirmFilmdevImport}
        mappingResult={filmdevPreviewData}
        previewRecipe={filmdevPreviewRecipe}
        isProcessing={isImporting}
        variant={isMobile ? 'drawer' : 'modal'}
      />
    </>
  );
};
