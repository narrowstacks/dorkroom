import type { CustomRecipeFormData } from '@dorkroom/logic';
import { debugError } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

export interface UseSharedRecipeImportProps {
  // Recipe operations
  addCustomRecipe: (data: CustomRecipeFormData) => Promise<string>;
  refreshCustomRecipes: () => Promise<unknown>;

  // Modal state
  sharedRecipeView: DevelopmentCombinationView | null;
  sharedRecipeSource: 'shared' | 'custom';

  // Modal setters
  setIsSharedRecipeModalOpen: Dispatch<SetStateAction<boolean>>;
  setSharedRecipeView: Dispatch<
    SetStateAction<DevelopmentCombinationView | null>
  >;
  setIsAddingSharedRecipe: Dispatch<SetStateAction<boolean>>;

  showToast: (message: string, type: 'success' | 'error') => void;
}

export interface UseSharedRecipeImportReturn {
  handleAcceptSharedRecipe: () => Promise<void>;
  handleDeclineSharedRecipe: () => void;
}

/**
 * Hook for managing shared recipe import from URL parameters.
 * Handles accepting/declining shared recipes (both regular and custom).
 */
export function useSharedRecipeImport({
  addCustomRecipe,
  refreshCustomRecipes,
  sharedRecipeView,
  sharedRecipeSource,
  setIsSharedRecipeModalOpen,
  setSharedRecipeView,
  setIsAddingSharedRecipe,
  showToast,
}: UseSharedRecipeImportProps): UseSharedRecipeImportReturn {
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

  return {
    handleAcceptSharedRecipe,
    handleDeclineSharedRecipe,
  };
}
