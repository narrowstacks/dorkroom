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

/**
 * Cross-environment base64 encoding function.
 * Works in both browser and Node.js environments.
 *
 * @param input - String to encode
 * @returns Base64 encoded string
 * @throws Error if base64 encoding is not available
 */
const encodeBase64 = (input: string): string => {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(input);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64');
  }

  throw new Error('Base64 encoding not supported in this environment');
};

/**
 * Cross-environment base64 decoding function.
 * Works in both browser and Node.js environments.
 *
 * @param input - Base64 string to decode
 * @returns Decoded string
 * @throws Error if base64 decoding is not available
 */
const decodeBase64 = (input: string): string => {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(input);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('utf8');
  }

  throw new Error('Base64 decoding not supported in this environment');
};

/**
 * Encodes a custom recipe into a URL-safe base64 string for sharing.
 * Converts recipe data to JSON, encodes as base64, and makes URL-safe.
 *
 * @param recipe - Custom recipe object to encode
 * @returns URL-safe encoded string, or empty string if encoding fails
 * @example
 * ```typescript
 * const recipe = {
 *   name: 'My Recipe',
 *   filmId: 'film-123',
 *   developerId: 'dev-456',
 *   temperatureF: 68,
 *   timeMinutes: 8
 * };
 * const encoded = encodeCustomRecipe(recipe);
 * console.log(encoded); // URL-safe base64 string
 * ```
 */
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

/**
 * Decodes a custom recipe from a URL-safe base64 string.
 * Validates the decoded data and ensures required fields are present.
 *
 * @param encoded - URL-safe encoded recipe string
 * @returns Decoded recipe object, or null if decoding/validation fails
 * @example
 * ```typescript
 * const encoded = 'eyJuYW1lIjoiTXkgUmVjaXBlIi4uLn0';
 * const recipe = decodeCustomRecipe(encoded);
 * if (recipe) {
 *   console.log(recipe.name); // 'My Recipe'
 * }
 * ```
 */
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

/**
 * Creates a custom recipe object from encoded recipe data.
 * Generates temporary IDs for custom films and developers, strips metadata fields.
 *
 * @param encodedRecipe - Decoded recipe data from sharing
 * @returns Recipe object ready for database insertion (without id, dateCreated, dateModified)
 * @example
 * ```typescript
 * const encodedRecipe = decodeCustomRecipe(sharedString);
 * if (encodedRecipe) {
 *   const recipe = createCustomRecipeFromEncoded(encodedRecipe);
 *   // Recipe is ready to be saved with generated IDs
 * }
 * ```
 */
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

/**
 * Validates if a string is a valid custom recipe encoding.
 * Checks format and attempts to decode to verify validity.
 *
 * @param encoded - String to validate as encoded recipe
 * @returns True if the string is a valid encoded recipe, false otherwise
 * @example
 * ```typescript
 * const valid = isValidCustomRecipeEncoding('eyJuYW1lIjoiVGVzdCJ9');
 * console.log(valid); // true or false
 *
 * const invalid = isValidCustomRecipeEncoding('not-base64!');
 * console.log(invalid); // false
 * ```
 */
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
