import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipeFormData,
  FilmdevMappingResult,
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

export interface UseFilmdevImportProps {
  // Recipe operations
  addCustomRecipe: (data: CustomRecipeFormData) => Promise<string>;
  refreshCustomRecipes: () => Promise<unknown>;

  // Film/Developer data
  allFilms: Film[];
  allDevelopers: Developer[];

  // Modal state
  filmdevPreviewData: FilmdevMappingResult | null;

  // Modal setters
  setIsFilmdevPreviewOpen: Dispatch<SetStateAction<boolean>>;
  setFilmdevPreviewData: Dispatch<SetStateAction<FilmdevMappingResult | null>>;
  setFilmdevPreviewRecipe: Dispatch<
    SetStateAction<DevelopmentCombinationView | null>
  >;
  setIsImportModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsImporting: Dispatch<SetStateAction<boolean>>;
  setImportError: Dispatch<SetStateAction<string | null>>;
}

export interface UseFilmdevImportReturn {
  handleFilmdevImport: (input: string) => Promise<void>;
  handleCloseFilmdevPreview: () => void;
  handleConfirmFilmdevImport: () => Promise<void>;
}

/**
 * Hook for managing filmdev.org recipe import.
 * Handles fetching, previewing, and confirming imports from filmdev.org URLs/IDs.
 */
export function useFilmdevImport({
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
}: UseFilmdevImportProps): UseFilmdevImportReturn {
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

  const handleFilmdevImport = useCallback(
    async (input: string) => {
      if (!isFilmdevInput(input)) {
        throw new Error('Not a filmdev.org URL');
      }

      setImportError(null);
      setIsImporting(true);

      try {
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
            infoSource: mappingResult.formData.sourceUrl || null,
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
                    mappingResult.formData.customDeveloper.safetyNotes || null,
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
      } catch (err) {
        if (err instanceof FilmdevApiError) {
          setImportError(err.message);
        } else {
          debugError('Failed to import from filmdev.org:', err);
          setImportError(
            err instanceof Error ? err.message : 'Failed to import recipe'
          );
        }
        setIsImporting(false);
      }
    },
    [
      allFilms,
      allDevelopers,
      setImportError,
      setIsImporting,
      setFilmdevPreviewData,
      setFilmdevPreviewRecipe,
      setIsFilmdevPreviewOpen,
    ]
  );

  return {
    handleFilmdevImport,
    handleCloseFilmdevPreview,
    handleConfirmFilmdevImport,
  };
}
