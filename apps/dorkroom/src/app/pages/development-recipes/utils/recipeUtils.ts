import type { CustomRecipeFormData } from '@dorkroom/logic';
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

const CUSTOM_FILM_PREFIX = 'custom_film_';
const CUSTOM_DEVELOPER_PREFIX = 'custom_dev_';

/**
 * Whether a view's film is the user's own. The view carries no flag, but
 * `getCustomRecipeFilm` builds a `custom_film_<recipeId>` entity exactly when
 * the stored `isCustomFilm` flag is set, so that entity is the flag. The
 * combination's `filmStockId` prefix is the fallback for old data. The stored
 * id alone cannot decide: recipes saved before #510 can hold a catalogue uuid
 * with `isCustomFilm: true`.
 */
export const isCustomFilmView = (view: DevelopmentCombinationView): boolean =>
  Boolean(view.film?.uuid.startsWith(CUSTOM_FILM_PREFIX)) ||
  view.combination.filmStockId.startsWith(CUSTOM_FILM_PREFIX);

/** Developer counterpart of {@link isCustomFilmView}. */
export const isCustomDeveloperView = (
  view: DevelopmentCombinationView
): boolean =>
  Boolean(view.developer?.uuid.startsWith(CUSTOM_DEVELOPER_PREFIX)) ||
  view.combination.developerId.startsWith(CUSTOM_DEVELOPER_PREFIX);

/**
 * Converts a DevelopmentCombinationView to CustomRecipeFormData
 * Used when editing an existing recipe
 */
export const convertRecipeToFormData = (
  view: DevelopmentCombinationView
): CustomRecipeFormData => {
  const combination = view.combination;
  const isCustomFilm = isCustomFilmView(view);
  const isCustomDeveloper = isCustomDeveloperView(view);

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
