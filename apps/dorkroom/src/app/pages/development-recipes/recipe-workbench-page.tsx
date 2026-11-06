import type { RecipeUrlBinding } from '@dorkroom/logic';
import { ConfirmModal, TemperatureProvider, useIsMobile } from '@dorkroom/ui';
import { RecipeModals } from './components/recipe-modals';
import { WorkbenchPhoneLayout } from './components/workbench-phone-layout';
import { WorkbenchWideLayout } from './components/workbench-wide-layout';
import { useRecipeWorkbench } from './hooks/useRecipeWorkbench';

/**
 * /development: asks what you are developing, then gives you one recipe to work
 * from. It reads and writes its URL state only through `url`.
 */
export default function RecipeWorkbenchPage({
  url,
}: {
  url: RecipeUrlBinding;
}) {
  const wb = useRecipeWorkbench(url);
  const isMobile = useIsMobile();
  const { actions, modals } = wb;

  return (
    <TemperatureProvider>
      {isMobile ? (
        <WorkbenchPhoneLayout wb={wb} />
      ) : (
        <WorkbenchWideLayout wb={wb} />
      )}
      <RecipeModals
        isMobile={isMobile}
        isCustomModalOpen={modals.isCustomModalOpen}
        editingRecipe={modals.editingRecipe}
        isSubmittingRecipe={modals.isSubmittingRecipe}
        onCloseCustomModal={() => {
          modals.setIsCustomModalOpen(false);
          modals.setEditingRecipe(null);
        }}
        onCustomRecipeSubmit={wb.submitCustomRecipe}
        filmOptions={wb.catalogFilmOptions}
        developerOptions={wb.catalogDeveloperOptions}
        allFilms={wb.catalogFilms}
        allDevelopers={wb.catalogDevelopers}
        isImportModalOpen={modals.isImportModalOpen}
        onCloseImportModal={() => modals.setIsImportModalOpen(false)}
        isImporting={modals.isImporting}
        importError={modals.importError ?? undefined}
        onImportRecipe={actions.handleImportRecipe}
        isSharedRecipeModalOpen={modals.isSharedRecipeModalOpen}
        sharedRecipeView={modals.sharedRecipeView}
        sharedRecipeSource={modals.sharedRecipeSource}
        isAddingSharedRecipe={modals.isAddingSharedRecipe}
        onAcceptSharedRecipe={actions.handleAcceptSharedRecipe}
        onDeclineSharedRecipe={wb.declineSharedRecipe}
        isFilmdevPreviewOpen={modals.isFilmdevPreviewOpen}
        filmdevPreviewData={modals.filmdevPreviewData}
        filmdevPreviewRecipe={modals.filmdevPreviewRecipe}
        onCloseFilmdevPreview={actions.handleCloseFilmdevPreview}
        onConfirmFilmdevImport={actions.handleConfirmFilmdevImport}
        isFavorite={actions.handleCheckFavorite}
        onToggleFavorite={actions.handleToggleFavorite}
      />
      <ConfirmModal
        isOpen={modals.isDeleteConfirmOpen}
        onClose={modals.closeDeleteConfirm}
        onConfirm={wb.confirmDelete}
        title="Delete Recipe"
        message="Are you sure you want to delete this custom recipe? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        isProcessing={modals.isDeleting}
      />
    </TemperatureProvider>
  );
}
