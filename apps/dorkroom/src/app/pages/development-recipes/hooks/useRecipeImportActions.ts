import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipeFormData,
  FilmdevMappingResult,
  ImportedCustomRecipe,
} from '@dorkroom/logic';
import {
  debugError,
  extractRecipeId,
  FilmdevApiError,
  fetchFilmdevRecipe,
  isFilmdevInput,
  mapFilmdevRecipe,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

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
 * Extracts import logic (filmdev.org, shared recipes) from the main useRecipeActions hook.
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
          if (!importedRecipe) {
            setImportError('Unable to parse the imported recipe data.');
            return;
          }

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
                  filmOrPaper: (importedRecipe.customDeveloper?.filmOrPaper ||
                    'film') as 'film' | 'paper' | 'both',
                  workingLifeHours:
                    importedRecipe.customDeveloper?.workingLifeHours,
                  stockLifeMonths:
                    importedRecipe.customDeveloper?.stockLifeMonths,
                  notes: importedRecipe.customDeveloper?.notes,
                  mixingInstructions:
                    importedRecipe.customDeveloper?.mixingInstructions,
                  safetyNotes: importedRecipe.customDeveloper?.safetyNotes,
                  dilutions: importedRecipe.customDeveloper?.dilutions || [],
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

  return {
    handleAcceptSharedRecipe,
    handleDeclineSharedRecipe,
    handleImportRecipe,
    handleCloseFilmdevPreview,
    handleConfirmFilmdevImport,
  };
}
