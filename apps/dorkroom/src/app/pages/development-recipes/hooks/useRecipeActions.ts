import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipe,
  CustomRecipeFormData,
  FilmdevMappingResult,
} from '@dorkroom/logic';
import {
  debugError,
  debugLog,
  extractRecipeId,
  FilmdevApiError,
  fetchFilmdevRecipe,
  isFilmdevInput,
  mapFilmdevRecipe,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { getCombinationIdentifier } from '../utils/recipeUtils';

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
 * Custom hook to manage all action handlers for development recipes page
 * Extracts complex handler logic from the main component
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

  const transitionTimeoutRefs = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  // Cleanup pending timeouts on unmount to prevent stale state updates
  useEffect(() => {
    const timeouts = transitionTimeoutRefs.current;
    return () => {
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout);
      }
      timeouts.clear();
    };
  }, []);

  const handleOpenDetail = useCallback(
    (view: DevelopmentCombinationView) => {
      setDetailView(view);
      setIsDetailOpen(true);
    },
    [setDetailView, setIsDetailOpen]
  );

  // Helper function to execute sharing action and show appropriate toast
  const executeRecipeShare = useCallback(
    async (view: DevelopmentCombinationView, shareMethod: 'share' | 'copy') => {
      try {
        const combinationId = String(
          view.combination.uuid || view.combination.id
        );

        let result;
        if (view.source === 'custom') {
          const recipe = customRecipes.find(
            (item) => item.id === combinationId
          );
          if (!recipe) {
            return;
          }

          result =
            shareMethod === 'share'
              ? await shareCustomRecipe({ recipe })
              : await copyCustomRecipeToClipboard({ recipe });
        } else {
          // Share or copy regular recipe
          const recipeOptions = {
            recipeId: combinationId,
            recipeName: view.combination.name,
            filmSlug: view.film?.slug,
            developerSlug: view.developer?.slug,
          };

          result =
            shareMethod === 'share'
              ? await shareRegularRecipe(recipeOptions)
              : await copyRegularRecipeToClipboard(recipeOptions);
        }

        // Show toast if the result indicates we should
        if (result?.showToast) {
          if (result.success && result.method === 'clipboard') {
            showToast('Link copied to clipboard!', 'success');
          } else if (!result.success && result.error) {
            showToast(result.error, 'error');
          }
        }
      } catch (error) {
        debugError('Failed to share/copy recipe:', error);
        showToast(
          'Something went wrong sharing this recipe. Please try again.',
          'error'
        );
      }
    },
    [
      customRecipes,
      shareCustomRecipe,
      copyCustomRecipeToClipboard,
      shareRegularRecipe,
      copyRegularRecipeToClipboard,
      showToast,
    ]
  );

  const handleShareCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      await executeRecipeShare(view, 'share');
      // Return undefined to indicate toast is handled internally
      return undefined;
    },
    [executeRecipeShare]
  );

  const handleCopyCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      await executeRecipeShare(view, 'copy');
    },
    [executeRecipeShare]
  );

  const handleCustomRecipeSubmit = useCallback(
    async (data: CustomRecipeFormData) => {
      setIsSubmittingRecipe(true);
      try {
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
          await updateCustomRecipe(customRecipe.id, data);
        } else {
          // Add new recipe
          const newId = await addCustomRecipe(data);
          if (data.isFavorite) {
            addFavorite(newId);
          }
        }
        await refreshCustomRecipes();
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
      refreshCustomRecipes,
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
    async (view: DevelopmentCombinationView) => {
      if (
        !window.confirm(
          'Are you sure you want to delete this custom recipe? This action cannot be undone.'
        )
      ) {
        return;
      }
      try {
        const recipeId = getCombinationIdentifier(view.combination);
        await deleteCustomRecipe(recipeId);
        await refreshCustomRecipes();

        // Close detail modal if it's showing the deleted recipe
        if (getCombinationIdentifier(detailView?.combination) === recipeId) {
          setIsDetailOpen(false);
          setDetailView(null);
        }
      } catch (error) {
        debugError('Failed to delete custom recipe:', error);
        window.alert('Failed to delete the recipe. Please try again.');
      }
    },
    [
      deleteCustomRecipe,
      refreshCustomRecipes,
      detailView,
      setIsDetailOpen,
      setDetailView,
    ]
  );

  // Memoize favorite callbacks to prevent column recreation on every render
  const handleCheckFavorite = useCallback(
    (view: DevelopmentCombinationView) =>
      isFavorite(String(view.combination.uuid || view.combination.id)),
    [isFavorite]
  );

  const handleToggleFavorite = useCallback(
    (view: DevelopmentCombinationView) => {
      const id = String(view.combination.uuid || view.combination.id);

      if (!animationsEnabled) {
        toggleFavorite(id);
        return;
      }

      // Determine if adding or removing favorite
      const isCurrentlyFavorite = isFavorite(id);
      const transitionType = isCurrentlyFavorite ? 'removing' : 'adding';

      // Add to transition state
      setFavoriteTransitions((prev) => new Map(prev).set(id, transitionType));

      // Clear any existing timeout for this ID
      const existingTimeout = transitionTimeoutRefs.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set timeout for skeleton animation duration (500ms)
      const timeout = setTimeout(() => {
        toggleFavorite(id);

        // For off-page items, show message skeleton for 2 seconds after toggle
        if (transitionType === 'adding' && pageIndex > 0) {
          const messageTimeout = setTimeout(() => {
            setFavoriteTransitions((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            transitionTimeoutRefs.current.delete(id);
          }, 2000);
          transitionTimeoutRefs.current.set(id, messageTimeout);
        } else {
          // Remove from transition state after animation completes
          setFavoriteTransitions((prev) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
          transitionTimeoutRefs.current.delete(id);
        }
      }, 500);

      transitionTimeoutRefs.current.set(id, timeout);
    },
    [
      toggleFavorite,
      isFavorite,
      animationsEnabled,
      pageIndex,
      setFavoriteTransitions,
    ]
  );

  const handleAcceptSharedRecipe = useCallback(async () => {
    if (!sharedRecipeView) return;

    setIsAddingSharedRecipe(true);
    try {
      const combination = sharedRecipeView.combination;

      if (sharedRecipeSource === 'custom') {
        // Handle custom recipe sharing from URL
        // Check if it uses custom film/developer or existing ones
        const isCustomFilm =
          combination.filmStockId === 'custom_film_temp' ||
          combination.filmStockId.startsWith('custom_film_');
        const isCustomDeveloper =
          combination.developerId === 'custom_dev_temp' ||
          combination.developerId.startsWith('custom_dev_');

        // Validate film data if it's a custom film
        if (
          isCustomFilm &&
          (!sharedRecipeView.film ||
            !sharedRecipeView.film.brand ||
            !sharedRecipeView.film.name ||
            typeof sharedRecipeView.film.isoSpeed !== 'number')
        ) {
          throw new Error(
            'Invalid film data in shared recipe. Missing required fields.'
          );
        }

        // Validate developer data if it's a custom developer
        if (
          isCustomDeveloper &&
          (!sharedRecipeView.developer ||
            !sharedRecipeView.developer.manufacturer ||
            !sharedRecipeView.developer.name ||
            !sharedRecipeView.developer.type ||
            !Array.isArray(sharedRecipeView.developer.dilutions))
        ) {
          throw new Error(
            'Invalid developer data in shared recipe. Missing required fields.'
          );
        }

        const formData: CustomRecipeFormData = {
          name: combination.name || 'Shared Custom Recipe',
          useExistingFilm: !isCustomFilm,
          selectedFilmId: isCustomFilm ? '' : combination.filmStockId,
          customFilm:
            isCustomFilm && sharedRecipeView.film
              ? {
                  brand: sharedRecipeView.film.brand,
                  name: sharedRecipeView.film.name,
                  isoSpeed: sharedRecipeView.film.isoSpeed,
                  colorType:
                    sharedRecipeView.film.colorType === 'color' ||
                    sharedRecipeView.film.colorType === 'slide'
                      ? sharedRecipeView.film.colorType
                      : 'bw',
                  grainStructure: sharedRecipeView.film.grainStructure || '',
                  description: sharedRecipeView.film.description || '',
                }
              : undefined,
          useExistingDeveloper: !isCustomDeveloper,
          selectedDeveloperId: isCustomDeveloper ? '' : combination.developerId,
          customDeveloper:
            isCustomDeveloper && sharedRecipeView.developer
              ? {
                  manufacturer: sharedRecipeView.developer.manufacturer,
                  name: sharedRecipeView.developer.name,
                  type: sharedRecipeView.developer.type,
                  filmOrPaper: sharedRecipeView.developer.filmOrPaper
                    ? 'film'
                    : 'paper',
                  dilutions: sharedRecipeView.developer.dilutions.map((d) => ({
                    name: d.name,
                    dilution: d.dilution,
                  })),
                  notes: sharedRecipeView.developer.notes || '',
                  mixingInstructions:
                    sharedRecipeView.developer.mixingInstructions || '',
                  safetyNotes: sharedRecipeView.developer.safetyNotes || '',
                }
              : undefined,
          temperatureF: combination.temperatureF,
          timeMinutes: combination.timeMinutes,
          shootingIso: combination.shootingIso,
          pushPull: combination.pushPull || 0,
          agitationSchedule: combination.agitationSchedule || '',
          notes: combination.notes || 'Imported from shared custom recipe',
          customDilution: combination.customDilution || '',
          isPublic: false,
        };

        await addCustomRecipe(formData);
        await refreshCustomRecipes();
        showToast('Custom recipe added to your collection!', 'success');
      } else {
        // Handle regular API recipe - add to custom recipes
        const formData: CustomRecipeFormData = {
          name: combination.name || `Shared Recipe - ${combination.id}`,
          useExistingFilm: true,
          selectedFilmId: combination.filmStockId,
          useExistingDeveloper: true,
          selectedDeveloperId: combination.developerId,
          temperatureF: combination.temperatureF,
          timeMinutes: combination.timeMinutes,
          shootingIso: combination.shootingIso,
          pushPull: combination.pushPull || 0,
          agitationSchedule: combination.agitationSchedule || '',
          notes: combination.notes || 'Imported from shared recipe',
          customDilution: combination.customDilution || '',
          isPublic: false,
        };

        await addCustomRecipe(formData);
        await refreshCustomRecipes();
        showToast('Recipe added to your collection!', 'success');
      }

      setIsSharedRecipeModalOpen(false);
      setSharedRecipeView(null);
    } catch (error) {
      debugError('Failed to add shared recipe:', error);

      // Provide specific error message based on error type
      let errorMessage = 'Failed to add recipe. Please try again.';
      if (error instanceof Error) {
        // Extract meaningful error messages
        if (
          error.message.includes('duplicate') ||
          error.message.includes('already exists')
        ) {
          errorMessage = 'This recipe already exists in your collection.';
        } else if (
          error.message.includes('film') ||
          error.message.includes('Film')
        ) {
          errorMessage = 'Invalid film data. Please check the recipe details.';
        } else if (
          error.message.includes('developer') ||
          error.message.includes('Developer')
        ) {
          errorMessage =
            'Invalid developer data. Please check the recipe details.';
        } else if (
          error.message.includes('storage') ||
          error.message.includes('quota')
        ) {
          errorMessage =
            'Storage limit reached. Please delete some recipes to make room.';
        } else if (error.message) {
          // Use the error message if it's descriptive enough
          errorMessage =
            error.message.length > 10 && error.message.length < 100
              ? error.message
              : 'Failed to add recipe. Please try again.';
        }
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsAddingSharedRecipe(false);
    }
  }, [
    sharedRecipeView,
    sharedRecipeSource,
    addCustomRecipe,
    refreshCustomRecipes,
    showToast,
    setIsAddingSharedRecipe,
    setIsSharedRecipeModalOpen,
    setSharedRecipeView,
  ]);

  const handleDeclineSharedRecipe = useCallback(() => {
    setIsSharedRecipeModalOpen(false);
    setSharedRecipeView(null);
  }, [setIsSharedRecipeModalOpen, setSharedRecipeView]);

  const handleCloseFilmdevPreview = useCallback(() => {
    setIsFilmdevPreviewOpen(false);
    setFilmdevPreviewData(null);
    setFilmdevPreviewRecipe(null);
    setIsImporting(false);
    setImportError(null);
  }, [
    setIsFilmdevPreviewOpen,
    setFilmdevPreviewData,
    setFilmdevPreviewRecipe,
    setIsImporting,
    setImportError,
  ]);

  const handleConfirmFilmdevImport = useCallback(async () => {
    if (!filmdevPreviewData) return;

    setIsImporting(true);
    try {
      await addCustomRecipe(filmdevPreviewData.formData);
      await refreshCustomRecipes();
      setIsImportModalOpen(false);
      handleCloseFilmdevPreview();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Failed to import recipe'
      );
    } finally {
      setIsImporting(false);
    }
  }, [
    filmdevPreviewData,
    addCustomRecipe,
    refreshCustomRecipes,
    handleCloseFilmdevPreview,
    setIsImporting,
    setImportError,
    setIsImportModalOpen,
  ]);

  const handleImportRecipe = useCallback(
    async (input: string) => {
      setImportError(null);
      setIsImporting(true);

      try {
        // Check if input is a filmdev.org URL/ID
        if (isFilmdevInput(input)) {
          const recipeId = extractRecipeId(input);
          if (!recipeId) {
            setImportError(
              'Unable to extract recipe ID from filmdev.org URL. Please check the URL format.'
            );
            return;
          }

          // Fetch recipe from filmdev.org
          const filmdevRecipe = await fetchFilmdevRecipe(recipeId);

          // Map filmdev recipe to form data with film/developer matching
          const mappingResult = mapFilmdevRecipe(
            filmdevRecipe,
            allFilms || [],
            allDevelopers || []
          );

          // Add information about matches in notes
          let matchInfo = '';
          if (mappingResult.isFilmCustom && mappingResult.isDeveloperCustom) {
            matchInfo =
              '\n\nNote: Both film and developer were added as custom entries since no matches were found in our database.';
          } else if (mappingResult.isFilmCustom) {
            matchInfo =
              '\n\nNote: Film was added as a custom entry since no match was found in our database.';
          } else if (mappingResult.isDeveloperCustom) {
            matchInfo =
              '\n\nNote: Developer was added as a custom entry since no match was found in our database.';
          } else {
            matchInfo = '\n\nImported from FilmDev.org.';
          }

          mappingResult.formData.notes =
            (mappingResult.formData.notes || '') + matchInfo;

          // Create a preview recipe view for the modal
          const previewRecipe: DevelopmentCombinationView = {
            combination: {
              id: 0, // Temporary ID for preview
              uuid: 'preview',
              name: mappingResult.formData.name,
              filmStockId:
                mappingResult.formData.selectedFilmId || 'custom_film_temp',
              filmSlug: 'preview',
              developerId:
                mappingResult.formData.selectedDeveloperId || 'custom_dev_temp',
              developerSlug: 'preview',
              shootingIso: mappingResult.formData.shootingIso,
              dilutionId: null,
              customDilution: mappingResult.formData.customDilution,
              temperatureC: Math.round(
                ((mappingResult.formData.temperatureF - 32) * 5) / 9
              ),
              temperatureF: mappingResult.formData.temperatureF,
              timeMinutes: mappingResult.formData.timeMinutes,
              agitationMethod: 'Standard',
              agitationSchedule: mappingResult.formData.agitationSchedule,
              pushPull: mappingResult.formData.pushPull,
              tags: mappingResult.formData.tags || null,
              notes: mappingResult.formData.notes,
              infoSource: 'filmdev.org',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            film:
              mappingResult.matchedFilm ??
              (mappingResult.formData.customFilm
                ? {
                    id: 0,
                    uuid: 'custom_film_temp',
                    slug: 'custom-film',
                    brand: mappingResult.formData.customFilm.brand,
                    name: mappingResult.formData.customFilm.name,
                    colorType: mappingResult.formData.customFilm.colorType,
                    isoSpeed: mappingResult.formData.customFilm.isoSpeed,
                    grainStructure:
                      mappingResult.formData.customFilm.grainStructure || null,
                    description:
                      mappingResult.formData.customFilm.description || '',
                    manufacturerNotes: null,
                    reciprocityFailure: null,
                    discontinued: false,
                    staticImageUrl: null,
                    dateAdded: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : undefined),
            developer:
              mappingResult.matchedDeveloper ??
              (mappingResult.formData.customDeveloper
                ? {
                    id: 0,
                    uuid: 'custom_dev_temp',
                    slug: 'custom-developer',
                    name: mappingResult.formData.customDeveloper.name,
                    manufacturer:
                      mappingResult.formData.customDeveloper.manufacturer,
                    type: mappingResult.formData.customDeveloper.type,
                    description: '',
                    filmOrPaper:
                      mappingResult.formData.customDeveloper.filmOrPaper ===
                        'film' ||
                      mappingResult.formData.customDeveloper.filmOrPaper ===
                        'both',
                    dilutions:
                      mappingResult.formData.customDeveloper.dilutions.map(
                        (d, index) => ({
                          id: String(index),
                          name: d.name,
                          dilution: d.dilution,
                        })
                      ),
                    mixingInstructions:
                      mappingResult.formData.customDeveloper
                        .mixingInstructions || null,
                    storageRequirements: null,
                    safetyNotes:
                      mappingResult.formData.customDeveloper.safetyNotes ||
                      null,
                    notes: mappingResult.formData.customDeveloper.notes || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : undefined),
          };

          // Set preview data and open the preview modal
          setFilmdevPreviewData(mappingResult);
          setFilmdevPreviewRecipe(previewRecipe);
          setIsFilmdevPreviewOpen(true);
          setIsImporting(false);
          return; // Don't continue with the regular import flow
        } else {
          // Try to decode as shared recipe
          const imported = decodeSharedCustomRecipe(input);
          if (!imported || !imported.isValid) {
            setImportError(
              'Unable to decode this recipe. Please check if you have a valid filmdev.org URL (e.g., filmdev.org/recipe/123) or shared recipe code.'
            );
            return;
          }

          const importedRecipe = imported.recipe;

          const formData: CustomRecipeFormData = {
            name: importedRecipe.name,
            temperatureF: importedRecipe.temperatureF,
            timeMinutes: importedRecipe.timeMinutes,
            shootingIso: importedRecipe.shootingIso,
            pushPull: importedRecipe.pushPull,
            agitationSchedule: importedRecipe.agitationSchedule || '',
            notes: importedRecipe.notes || '',
            customDilution: importedRecipe.customDilution || '',
            isPublic: importedRecipe.isPublic ?? false,
            useExistingFilm: !!getFilmById(importedRecipe.filmId),
            selectedFilmId: getFilmById(importedRecipe.filmId)?.uuid || '',
            customFilm: importedRecipe.isCustomFilm
              ? {
                  brand: importedRecipe.customFilm?.brand || '',
                  name: importedRecipe.customFilm?.name || '',
                  isoSpeed: importedRecipe.customFilm?.isoSpeed || 400,
                  colorType: importedRecipe.customFilm?.colorType || 'bw',
                  description: importedRecipe.customFilm?.description,
                  grainStructure: importedRecipe.customFilm?.grainStructure,
                }
              : undefined,
            useExistingDeveloper: !!getDeveloperById(
              importedRecipe.developerId
            ),
            selectedDeveloperId:
              getDeveloperById(importedRecipe.developerId)?.uuid || '',
            customDeveloper: importedRecipe.isCustomDeveloper
              ? {
                  manufacturer:
                    importedRecipe.customDeveloper?.manufacturer || '',
                  name: importedRecipe.customDeveloper?.name || '',
                  type: importedRecipe.customDeveloper?.type || 'powder',
                  filmOrPaper:
                    importedRecipe.customDeveloper?.filmOrPaper || 'film',
                  workingLifeHours:
                    importedRecipe.customDeveloper?.workingLifeHours,
                  stockLifeMonths:
                    importedRecipe.customDeveloper?.stockLifeMonths,
                  notes: importedRecipe.customDeveloper?.notes,
                  mixingInstructions:
                    importedRecipe.customDeveloper?.mixingInstructions,
                  safetyNotes: importedRecipe.customDeveloper?.safetyNotes,
                  dilutions: importedRecipe.customDeveloper?.dilutions,
                }
              : undefined,
          };

          await addCustomRecipe(formData);
          await refreshCustomRecipes();
          setIsImportModalOpen(false);
        }
      } catch (err) {
        if (err instanceof FilmdevApiError) {
          setImportError(err.message);
        } else {
          setImportError(
            err instanceof Error ? err.message : 'Failed to import recipe'
          );
        }
      } finally {
        setIsImporting(false);
      }
    },
    [
      addCustomRecipe,
      refreshCustomRecipes,
      decodeSharedCustomRecipe,
      getDeveloperById,
      getFilmById,
      allFilms,
      allDevelopers,
      setImportError,
      setIsImporting,
      setFilmdevPreviewData,
      setFilmdevPreviewRecipe,
      setIsFilmdevPreviewOpen,
      setIsImportModalOpen,
    ]
  );

  const handleRefreshAll = useCallback(async () => {
    debugLog('🎯 handleRefreshAll() triggered from Refresh button');
    setIsRefreshingData(true);
    try {
      debugLog('Calling forceRefresh() and refreshCustomRecipes()...');
      await Promise.all([forceRefresh(), refreshCustomRecipes()]);
      debugLog('✅ All refreshes completed');
    } catch (error) {
      debugError('❌ handleRefreshAll error:', error);
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
