import type { Film, Developer } from '@dorkroom/api';
import type { CustomRecipe } from '../types/custom-recipes';

export const getCustomRecipeFilm = (
  recipeId: string,
  customRecipes: CustomRecipe[],
  getFilmById: (filmId: string) => Film | undefined
): Film | undefined => {
  const recipe = customRecipes.find((r) => r.id === recipeId);
  if (!recipe) return undefined;

  if (recipe.isCustomFilm && recipe.customFilm) {
    const now = new Date().toISOString();
    return {
      id: parseInt(`${Date.now()}`), // Generate a numeric ID
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
      id: parseInt(`${Date.now()}`), // Generate a numeric ID
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
