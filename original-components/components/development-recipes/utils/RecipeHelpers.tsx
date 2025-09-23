import type { Film, Developer } from '@/api/dorkroom/types';
import type { CustomRecipe } from '@/types/customRecipeTypes';

export const getCustomRecipeFilm = (
  recipeId: string,
  customRecipes: CustomRecipe[],
  getFilmById: (filmId: string) => Film | undefined
): Film | undefined => {
  const recipe = customRecipes.find((r) => r.id === recipeId);
  if (!recipe) return undefined;

  if (recipe.isCustomFilm && recipe.customFilm) {
    // Convert custom film data to Film interface
    return {
      uuid: `custom_film_${recipe.id}`,
      id: `custom_film_${recipe.id}`,
      slug: `custom_film_${recipe.id}`,
      brand: recipe.customFilm.brand,
      name: recipe.customFilm.name,
      isoSpeed: recipe.customFilm.isoSpeed,
      colorType: recipe.customFilm.colorType,
      grainStructure: recipe.customFilm.grainStructure,
      description: recipe.customFilm.description,
      discontinued: 0,
      manufacturerNotes: [],
      staticImageURL: undefined,
      dateAdded: recipe.dateCreated,
    } as Film;
  } else {
    return getFilmById(recipe.filmId);
  }
};

export const getCustomRecipeDeveloper = (
  recipeId: string,
  customRecipes: CustomRecipe[],
  getDeveloperById: (developerId: string) => Developer | undefined
): Developer | undefined => {
  const recipe = customRecipes.find((r) => r.id === recipeId);
  if (!recipe) return undefined;

  if (recipe.isCustomDeveloper && recipe.customDeveloper) {
    // Convert custom developer data to Developer interface
    return {
      uuid: `custom_dev_${recipe.id}`,
      id: `custom_dev_${recipe.id}`,
      slug: `custom_dev_${recipe.id}`,
      name: recipe.customDeveloper.name,
      manufacturer: recipe.customDeveloper.manufacturer,
      type: recipe.customDeveloper.type,
      filmOrPaper: recipe.customDeveloper.filmOrPaper,
      workingLifeHours: recipe.customDeveloper.workingLifeHours,
      stockLifeMonths: recipe.customDeveloper.stockLifeMonths,
      notes: recipe.customDeveloper.notes,
      mixingInstructions: recipe.customDeveloper.mixingInstructions,
      safetyNotes: recipe.customDeveloper.safetyNotes,
      discontinued: 0,
      datasheetUrl: [],
      dilutions: recipe.customDeveloper.dilutions.map((d, idx) => ({
        id: idx,
        name: d.name,
        dilution: d.dilution,
      })),
      dateAdded: recipe.dateCreated,
    } as Developer;
  } else {
    return getDeveloperById(recipe.developerId);
  }
};
