import type { DevelopmentCombinationView } from '@dorkroom/ui';
import type { CustomRecipeFormData } from '@dorkroom/logic';

/**
 * Default values for custom recipe form
 */
export const CUSTOM_RECIPE_FORM_DEFAULT: CustomRecipeFormData = {
  name: '',
  useExistingFilm: true,
  selectedFilmId: '',
  customFilm: undefined,
  useExistingDeveloper: true,
  selectedDeveloperId: '',
  customDeveloper: undefined,
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '30s initial, 10s every minute',
  notes: '',
  customDilution: '',
  isPublic: false,
  isFavorite: false,
};

/**
 * Converts a DevelopmentCombinationView to CustomRecipeFormData
 * Used when editing an existing recipe
 */
export const convertRecipeToFormData = (
  view: DevelopmentCombinationView
): CustomRecipeFormData => {
  const combination = view.combination;

  return {
    name: combination.name || '',
    useExistingFilm: !combination.filmStockId.startsWith('custom_film_'),
    selectedFilmId: combination.filmStockId.startsWith('custom_film_')
      ? ''
      : combination.filmStockId,
    customFilm: combination.filmStockId.startsWith('custom_film_')
      ? {
          brand: view.film?.brand || '',
          name: view.film?.name || '',
          isoSpeed: view.film?.isoSpeed || 400,
          colorType:
            view.film?.colorType === 'color' || view.film?.colorType === 'slide'
              ? view.film.colorType
              : 'bw',
          grainStructure: view.film?.grainStructure || '',
          description: view.film?.description || '',
        }
      : undefined,
    useExistingDeveloper: !combination.developerId.startsWith('custom_dev_'),
    selectedDeveloperId: combination.developerId.startsWith('custom_dev_')
      ? ''
      : combination.developerId,
    customDeveloper: combination.developerId.startsWith('custom_dev_')
      ? {
          manufacturer: view.developer?.manufacturer || '',
          name: view.developer?.name || '',
          type: view.developer?.type || 'powder',
          filmOrPaper: 'film', // Default to film since API only provides boolean
          workingLifeHours: undefined, // Developer type doesn't have this field
          stockLifeMonths: undefined, // Developer type doesn't have this field
          notes: view.developer?.notes || '',
          mixingInstructions: '', // Developer type doesn't have this field
          safetyNotes: '', // Developer type doesn't have this field
          dilutions: view.developer?.dilutions || [
            { name: 'Stock', dilution: 'Stock' },
          ],
        }
      : undefined,
    temperatureF: combination.temperatureF,
    timeMinutes: combination.timeMinutes,
    shootingIso: combination.shootingIso,
    pushPull: combination.pushPull || 0,
    agitationSchedule: combination.agitationSchedule || '',
    notes: combination.notes || '',
    customDilution: combination.customDilution || '',
    isPublic: false, // Default to false for editing
    isFavorite: false,
  };
};

/**
 * Gets the unique identifier for a combination
 * Prefers UUID over numeric ID
 */
export const getCombinationIdentifier = (
  combination?: DevelopmentCombinationView['combination'] | null
): string => {
  if (!combination) {
    return '';
  }

  return String(combination.uuid || combination.id);
};
