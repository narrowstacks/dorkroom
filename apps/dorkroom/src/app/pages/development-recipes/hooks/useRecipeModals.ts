import type { FilmdevMappingResult } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { useState } from 'react';

/**
 * Custom hook to manage all modal states for development recipes page
 * Extracts modal state management from the main component
 */
export function useRecipeModals() {
  // Detail drawer state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailView, setDetailView] =
    useState<DevelopmentCombinationView | null>(null);

  // Custom recipe modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] =
    useState<DevelopmentCombinationView | null>(null);
  const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Filmdev preview modal state
  const [isFilmdevPreviewOpen, setIsFilmdevPreviewOpen] = useState(false);
  const [filmdevPreviewData, setFilmdevPreviewData] =
    useState<FilmdevMappingResult | null>(null);
  const [filmdevPreviewRecipe, setFilmdevPreviewRecipe] =
    useState<DevelopmentCombinationView | null>(null);

  // Shared recipe modal state
  const [isSharedRecipeModalOpen, setIsSharedRecipeModalOpen] = useState(false);
  const [sharedRecipeView, setSharedRecipeView] =
    useState<DevelopmentCombinationView | null>(null);
  const [sharedRecipeSource, setSharedRecipeSource] = useState<
    'shared' | 'custom'
  >('shared');
  const [isAddingSharedRecipe, setIsAddingSharedRecipe] = useState(false);

  // Delete confirmation modal state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmRecipe, setDeleteConfirmRecipe] =
    useState<DevelopmentCombinationView | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper functions to open modals with data
  const openDetailDrawer = (view: DevelopmentCombinationView) => {
    setDetailView(view);
    setIsDetailOpen(true);
  };

  const closeDetailDrawer = () => {
    setIsDetailOpen(false);
    setDetailView(null);
  };

  const openCustomRecipeModal = (recipe?: DevelopmentCombinationView) => {
    setEditingRecipe(recipe || null);
    setIsCustomModalOpen(true);
  };

  const closeCustomRecipeModal = () => {
    setIsCustomModalOpen(false);
    setEditingRecipe(null);
    setIsSubmittingRecipe(false);
  };

  const openImportModal = () => {
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportError(null);
    setIsImporting(false);
  };

  const openFilmdevPreview = (
    data: FilmdevMappingResult,
    recipe: DevelopmentCombinationView
  ) => {
    setFilmdevPreviewData(data);
    setFilmdevPreviewRecipe(recipe);
    setIsFilmdevPreviewOpen(true);
  };

  const closeFilmdevPreview = () => {
    setIsFilmdevPreviewOpen(false);
    setFilmdevPreviewData(null);
    setFilmdevPreviewRecipe(null);
  };

  const openSharedRecipeModal = (
    view: DevelopmentCombinationView,
    source: 'shared' | 'custom'
  ) => {
    setSharedRecipeView(view);
    setSharedRecipeSource(source);
    setIsSharedRecipeModalOpen(true);
  };

  const closeSharedRecipeModal = () => {
    setIsSharedRecipeModalOpen(false);
    setSharedRecipeView(null);
    setIsAddingSharedRecipe(false);
  };

  const openDeleteConfirm = (view: DevelopmentCombinationView) => {
    setDeleteConfirmRecipe(view);
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteConfirmRecipe(null);
    setIsDeleting(false);
  };

  return {
    // Detail drawer
    isDetailOpen,
    setIsDetailOpen,
    detailView,
    setDetailView,
    openDetailDrawer,
    closeDetailDrawer,

    // Custom recipe modal
    isCustomModalOpen,
    setIsCustomModalOpen,
    editingRecipe,
    setEditingRecipe,
    isSubmittingRecipe,
    setIsSubmittingRecipe,
    openCustomRecipeModal,
    closeCustomRecipeModal,

    // Import modal
    isImportModalOpen,
    setIsImportModalOpen,
    importError,
    setImportError,
    isImporting,
    setIsImporting,
    openImportModal,
    closeImportModal,

    // Filmdev preview
    isFilmdevPreviewOpen,
    setIsFilmdevPreviewOpen,
    filmdevPreviewData,
    setFilmdevPreviewData,
    filmdevPreviewRecipe,
    setFilmdevPreviewRecipe,
    openFilmdevPreview,
    closeFilmdevPreview,

    // Shared recipe modal
    isSharedRecipeModalOpen,
    setIsSharedRecipeModalOpen,
    sharedRecipeView,
    setSharedRecipeView,
    sharedRecipeSource,
    setSharedRecipeSource,
    isAddingSharedRecipe,
    setIsAddingSharedRecipe,
    openSharedRecipeModal,
    closeSharedRecipeModal,

    // Delete confirmation modal
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    deleteConfirmRecipe,
    setDeleteConfirmRecipe,
    isDeleting,
    setIsDeleting,
    openDeleteConfirm,
    closeDeleteConfirm,
  };
}
