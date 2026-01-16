import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipe } from '../types/custom-recipes';

/**
 * Retrieves the film associated with a custom recipe, handling both custom films
 * and references to existing films in the database.
 *
 * @public
 * @param recipeId - The unique identifier of the custom recipe
 * @param customRecipes - Array of all available custom recipes
 * @param getFilmById - Function to retrieve film data by ID from the main database
 * @returns Film object if found, undefined if recipe doesn't exist or has no film
 *
 * @example
 * ```typescript
 * const film = getCustomRecipeFilm(
 *   'recipe-123',
 *   customRecipes,
 *   (id) => filmDatabase.find(f => f.id === id)
 * );
 * if (film) {
 *   console.log(`Using film: ${film.brand} ${film.name}`);
 * }
 * ```
 */
export const getCustomRecipeFilm = (
  recipeId: string,
  customRecipes: CustomRecipe[],
  getFilmById: (filmId: string) => Film | undefined
): Film | undefined => {
  const recipe = customRecipes.find((r) => r.id === recipeId);
  if (!recipe) return undefined;

  if (recipe.isCustomFilm && recipe.customFilm) {
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- parseInt result with valid input is safe to cast
    return {
      id: parseInt(`${Date.now()}`, 10), // Generate a numeric ID
      uuid: `custom_film_${recipe.id}`,
      slug: `custom_film_${recipe.id}`,
      brand: recipe.customFilm.brand,
      name: recipe.customFilm.name,
      colorType: recipe.customFilm.colorType,
      isoSpeed: recipe.customFilm.isoSpeed,
      grainStructure: recipe.customFilm.grainStructure,
      description: recipe.customFilm.description || '',
      manufacturerNotes: [],
      reciprocityFailure: null,
      discontinued: false,
      staticImageUrl: null,
      dateAdded: recipe.dateCreated,
      createdAt: now,
      updatedAt: now,
    } as Film;
  }

  return getFilmById(recipe.filmId);
};

/**
 * Retrieves the developer associated with a custom recipe, handling both custom developers
 * and references to existing developers in the database.
 *
 * @public
 * @param recipeId - The unique identifier of the custom recipe
 * @param customRecipes - Array of all available custom recipes
 * @param getDeveloperById - Function to retrieve developer data by ID from the main database
 * @returns Developer object if found, undefined if recipe doesn't exist or has no developer
 *
 * @example
 * ```typescript
 * const developer = getCustomRecipeDeveloper(
 *   'recipe-456',
 *   customRecipes,
 *   (id) => developerDatabase.find(d => d.id === id)
 * );
 * if (developer) {
 *   console.log(`Using developer: ${developer.manufacturer} ${developer.name}`);
 * }
 * ```
 */
export const getCustomRecipeDeveloper = (
  recipeId: string,
  customRecipes: CustomRecipe[],
  getDeveloperById: (developerId: string) => Developer | undefined
): Developer | undefined => {
  const recipe = customRecipes.find((r) => r.id === recipeId);
  if (!recipe) return undefined;

  if (recipe.isCustomDeveloper && recipe.customDeveloper) {
    const now = new Date().toISOString();
    return {
      id: parseInt(`${Date.now()}`, 10), // Generate a numeric ID
      uuid: `custom_dev_${recipe.id}`,
      slug: `custom_dev_${recipe.id}`,
      name: recipe.customDeveloper.name,
      manufacturer: recipe.customDeveloper.manufacturer,
      type: recipe.customDeveloper.type,
      description: recipe.customDeveloper.notes || '',
      filmOrPaper: recipe.customDeveloper.filmOrPaper === 'film', // Convert string to boolean
      dilutions: recipe.customDeveloper.dilutions.map((dilution, index) => ({
        id: index.toString(),
        name: dilution.name || dilution.dilution,
        dilution: dilution.dilution,
      })),
      mixingInstructions: recipe.customDeveloper.mixingInstructions || null,
      storageRequirements: null,
      safetyNotes: recipe.customDeveloper.safetyNotes || null,
      notes: recipe.customDeveloper.notes || null,
      createdAt: now,
      updatedAt: now,
    } as Developer;
  }

  return getDeveloperById(recipe.developerId);
};
