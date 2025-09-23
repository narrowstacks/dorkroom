import type {
  CustomRecipe,
  CustomFilmData,
  CustomDeveloperData,
} from '../types/custom-recipes';
import { debugError } from './debug-logger';

const CURRENT_RECIPE_SHARING_VERSION = 1;

export interface EncodedCustomRecipe {
  name: string;
  filmId: string;
  developerId: string;
  temperatureF: number;
  timeMinutes: number;
  shootingIso: number;
  pushPull: number;
  agitationSchedule?: string;
  notes?: string;
  dilutionId?: number;
  customDilution?: string;
  isCustomFilm: boolean;
  isCustomDeveloper: boolean;
  customFilm?: CustomFilmData;
  customDeveloper?: CustomDeveloperData;
  isPublic: boolean;
  version: number;
}

const encodeBase64 = (input: string): string => {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(input);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64');
  }

  throw new Error('Base64 encoding not supported in this environment');
};

const decodeBase64 = (input: string): string => {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(input);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('utf8');
  }

  throw new Error('Base64 decoding not supported in this environment');
};

export const encodeCustomRecipe = (recipe: CustomRecipe): string => {
  try {
    const encodedRecipe: EncodedCustomRecipe = {
      name: recipe.name,
      filmId: recipe.filmId,
      developerId: recipe.developerId,
      temperatureF: recipe.temperatureF,
      timeMinutes: recipe.timeMinutes,
      shootingIso: recipe.shootingIso,
      pushPull: recipe.pushPull,
      agitationSchedule: recipe.agitationSchedule,
      notes: recipe.notes,
      dilutionId: recipe.dilutionId,
      customDilution: recipe.customDilution,
      isCustomFilm: recipe.isCustomFilm,
      isCustomDeveloper: recipe.isCustomDeveloper,
      customFilm: recipe.customFilm,
      customDeveloper: recipe.customDeveloper,
      isPublic: recipe.isPublic,
      version: CURRENT_RECIPE_SHARING_VERSION,
    };

    const jsonString = JSON.stringify(encodedRecipe);
    return encodeBase64(jsonString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    debugError('Failed to encode custom recipe:', error);
    return '';
  }
};

export const decodeCustomRecipe = (
  encoded: string
): EncodedCustomRecipe | null => {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonString = decodeBase64(base64);
    const recipe = JSON.parse(jsonString) as EncodedCustomRecipe;

    if (
      !recipe.name ||
      typeof recipe.temperatureF !== 'number' ||
      typeof recipe.timeMinutes !== 'number' ||
      typeof recipe.shootingIso !== 'number'
    ) {
      throw new Error('Invalid recipe data: missing required fields');
    }

    if (!recipe.version || recipe.version > CURRENT_RECIPE_SHARING_VERSION) {
      console.warn(
        'Recipe was created with a newer version and may not import correctly'
      );
    }

    if (recipe.isCustomFilm && recipe.customFilm) {
      if (!recipe.customFilm.name || !recipe.customFilm.brand) {
        throw new Error('Invalid custom film data');
      }
    }

    if (recipe.isCustomDeveloper && recipe.customDeveloper) {
      if (
        !recipe.customDeveloper.name ||
        !recipe.customDeveloper.manufacturer
      ) {
        throw new Error('Invalid custom developer data');
      }
    }

    return recipe;
  } catch (error) {
    debugError('Failed to decode custom recipe:', error);
    return null;
  }
};

export const createCustomRecipeFromEncoded = (
  encodedRecipe: EncodedCustomRecipe
): Omit<CustomRecipe, 'id' | 'dateCreated' | 'dateModified'> => {
  const timestamp = Date.now();

  return {
    name: encodedRecipe.name,
    filmId: encodedRecipe.isCustomFilm
      ? `custom_film_${timestamp}`
      : encodedRecipe.filmId,
    developerId: encodedRecipe.isCustomDeveloper
      ? `custom_dev_${timestamp}`
      : encodedRecipe.developerId,
    temperatureF: encodedRecipe.temperatureF,
    timeMinutes: encodedRecipe.timeMinutes,
    shootingIso: encodedRecipe.shootingIso,
    pushPull: encodedRecipe.pushPull,
    agitationSchedule: encodedRecipe.agitationSchedule,
    notes: encodedRecipe.notes,
    dilutionId: encodedRecipe.dilutionId,
    customDilution: encodedRecipe.customDilution,
    isCustomFilm: encodedRecipe.isCustomFilm,
    isCustomDeveloper: encodedRecipe.isCustomDeveloper,
    customFilm: encodedRecipe.customFilm,
    customDeveloper: encodedRecipe.customDeveloper,
    isPublic: encodedRecipe.isPublic || false,
  };
};

export const isValidCustomRecipeEncoding = (encoded: string): boolean => {
  if (!encoded || typeof encoded !== 'string') {
    return false;
  }

  const base64UrlSafePattern = /^[A-Za-z0-9_-]+$/;
  if (!base64UrlSafePattern.test(encoded)) {
    return false;
  }

  const decoded = decodeCustomRecipe(encoded);
  return decoded !== null;
};
