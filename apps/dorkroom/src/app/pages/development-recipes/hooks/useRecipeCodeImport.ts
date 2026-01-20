import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipeFormData,
  ImportedCustomRecipe,
} from '@dorkroom/logic';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

export interface UseRecipeCodeImportProps {
  // Recipe operations
  addCustomRecipe: (data: CustomRecipeFormData) => Promise<string>;
  refreshCustomRecipes: () => Promise<unknown>;
  decodeSharedCustomRecipe: (input: string) => ImportedCustomRecipe | null;

  // Data helpers
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;

  // Modal setters
  setIsImportModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsImporting: Dispatch<SetStateAction<boolean>>;
  setImportError: Dispatch<SetStateAction<string | null>>;
}

export interface UseRecipeCodeImportReturn {
  handleCodeImport: (input: string) => Promise<void>;
}

/**
 * Hook for managing recipe code import.
 * Handles decoding and importing shared recipe codes.
 */
export function useRecipeCodeImport({
  addCustomRecipe,
  refreshCustomRecipes,
  decodeSharedCustomRecipe,
  getFilmById,
  getDeveloperById,
  setIsImportModalOpen,
  setIsImporting,
  setImportError,
}: UseRecipeCodeImportProps): UseRecipeCodeImportReturn {
  const handleCodeImport = useCallback(
    async (input: string) => {
      setImportError(null);
      setIsImporting(true);

      try {
        // Try to decode as shared recipe
        const imported = decodeSharedCustomRecipe(input);
        if (!imported || !imported.isValid) {
          setImportError(
            'Unable to decode this recipe. Please check if you have a valid shared recipe code.'
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
          useExistingDeveloper: !!getDeveloperById(importedRecipe.developerId),
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
                dilutions: importedRecipe.customDeveloper?.dilutions || [],
              }
            : undefined,
        };

        await addCustomRecipe(formData);
        await refreshCustomRecipes();
        setIsImportModalOpen(false);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'Failed to import recipe'
        );
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
      setImportError,
      setIsImporting,
      setIsImportModalOpen,
    ]
  );

  return {
    handleCodeImport,
  };
}
