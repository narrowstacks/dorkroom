import type { CustomRecipe, CustomRecipeFormData } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';

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
  selectedDilutionId: '',
  customDilution: '',
  isPublic: false,
  isFavorite: false,
};

/**
 * Converts a DevelopmentCombinationView to CustomRecipeFormData
 * Used when editing an existing recipe. Pass the stored record when there is
 * one so its custom flags decide custom-ness.
 */
export const convertRecipeToFormData = (
  view: DevelopmentCombinationView,
  stored?: CustomRecipe
): CustomRecipeFormData => {
  const combination = view.combination;
  // The stored flags decide, never the id: recipes saved before #510 can hold
  // a catalogue uuid with `isCustomFilm: true`. The id prefix is only the
  // fallback when there is no stored record to ask.
  const isCustomFilm = stored
    ? stored.isCustomFilm
    : combination.filmStockId.startsWith('custom_film_');
  const isCustomDeveloper = stored
    ? stored.isCustomDeveloper
    : combination.developerId.startsWith('custom_dev_');
  // The view only carries what a catalogue Developer has, so saving from it
  // alone would wipe the rest of a stored custom developer.
  const storedDeveloper = stored?.isCustomDeveloper
    ? stored.customDeveloper
    : undefined;

  return {
    name: combination.name || '',
    useExistingFilm: !isCustomFilm,
    selectedFilmId: isCustomFilm ? '' : combination.filmStockId,
    customFilm: isCustomFilm
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
    useExistingDeveloper: !isCustomDeveloper,
    selectedDeveloperId: isCustomDeveloper ? '' : combination.developerId,
    customDeveloper: isCustomDeveloper
      ? {
          manufacturer: view.developer?.manufacturer || '',
          name: view.developer?.name || '',
          type: view.developer?.type || 'powder',
          filmOrPaper: 'film', // Default to film since API only provides boolean
          notes: view.developer?.notes || '',
          mixingInstructions: '', // Developer type doesn't have this field
          safetyNotes: '', // Developer type doesn't have this field
          ...storedDeveloper,
          // Stored records can hold null here: NaN was once saved, and JSON
          // turns it to null. The form and schema take a number or nothing.
          workingLifeHours: storedDeveloper?.workingLifeHours ?? undefined,
          stockLifeMonths: storedDeveloper?.stockLifeMonths ?? undefined,
          dilutions: storedDeveloper?.dilutions?.length
            ? storedDeveloper.dilutions
            : view.developer?.dilutions?.length
              ? view.developer.dilutions
              : [{ name: 'Stock', dilution: 'Stock' }],
        }
      : undefined,
    temperatureF: combination.temperatureF,
    timeMinutes: combination.timeMinutes,
    shootingIso: combination.shootingIso,
    pushPull: combination.pushPull || 0,
    agitationSchedule: combination.agitationSchedule || '',
    notes: combination.notes || '',
    selectedDilutionId: combination.dilutionId
      ? String(combination.dilutionId)
      : combination.customDilution
        ? 'custom'
        : '',
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
