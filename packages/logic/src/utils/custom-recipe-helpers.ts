import type { Film, Developer } from '@dorkroom/api';
import type { CustomRecipe } from '../types/custom-recipes';

export const getCustomRecipeFilm = (
  recipeId: string,
  customRecipes: CustomRecipe[],
  getFilmById: (filmId: string) => Film | undefined,
): Film | undefined => {
  const recipe = customRecipes.find((r) => r.id === recipeId);
  if (!recipe) return undefined;

  if (recipe.isCustomFilm && recipe.customFilm) {
    return {
      uuid: `custom_film_${recipe.id}`,
      id: `custom_film_${recipe.id}`,
      slug: `custom_film_${recipe.id}`,
      brand: recipe.customFilm.brand,
      name: recipe.customFilm.name,
      isoSpeed: recipe.customFilm.isoSpeed,
      colorType: recipe.customFilm.colorType,
      manufacturerNotes: [],
      discontinued: 0,
      dateAdded: recipe.dateCreated,
      description: recipe.customFilm.description,
      grainStructure: recipe.customFilm.grainStructure,
      staticImageURL: undefined,
      reciprocityFailure: undefined,
    } as Film;
  }

  return getFilmById(recipe.filmId);
};

export const getCustomRecipeDeveloper = (
  recipeId: string,
  customRecipes: CustomRecipe[],
  getDeveloperById: (developerId: string) => Developer | undefined,
): Developer | undefined => {
  const recipe = customRecipes.find((r) => r.id === recipeId);
  if (!recipe) return undefined;

  if (recipe.isCustomDeveloper && recipe.customDeveloper) {
    return {
      uuid: `custom_dev_${recipe.id}`,
      id: `custom_dev_${recipe.id}`,
      slug: `custom_dev_${recipe.id}`,
      name: recipe.customDeveloper.name,
      manufacturer: recipe.customDeveloper.manufacturer,
      type: recipe.customDeveloper.type,
      filmOrPaper: recipe.customDeveloper.filmOrPaper,
      discontinued: 0,
      dilutions: recipe.customDeveloper.dilutions.map((dilution, index) => ({
        id: index,
        name: dilution.name,
        dilution: dilution.dilution,
      })),
      workingLifeHours: recipe.customDeveloper.workingLifeHours,
      stockLifeMonths: recipe.customDeveloper.stockLifeMonths,
      notes: recipe.customDeveloper.notes,
      mixingInstructions: recipe.customDeveloper.mixingInstructions,
      safetyNotes: recipe.customDeveloper.safetyNotes,
      datasheetUrl: [],
      dateAdded: recipe.dateCreated,
    } as Developer;
  }

  return getDeveloperById(recipe.developerId);
};
