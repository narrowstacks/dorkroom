import type { FilmdevRecipe } from '../services/filmdev-api';
import type { Film, Developer } from '@dorkroom/api';
import type {
  CustomRecipeFormData,
  CustomFilmData,
  CustomDeveloperData,
} from '../types/custom-recipes';

/**
 * Attempt to find the best matching film from the local database using a filmdev.org string.
 *
 * @param filmdevFilmString - Film name provided by filmdev.org
 * @param availableFilms - Collection of locally known films to search
 * @returns Matching film entity or null when no reasonable match is detected
 */
export function findBestFilmMatch(
  filmdevFilmString: string,
  availableFilms: Film[]
): Film | null {
  if (!filmdevFilmString.trim() || !availableFilms.length) return null;

  const filmString = filmdevFilmString.trim().toLowerCase();

  // Try exact name match first
  let bestMatch = availableFilms.find(
    (film) =>
      film.name.toLowerCase() === filmString ||
      `${film.brand} ${film.name}`.toLowerCase() === filmString
  );

  if (bestMatch) return bestMatch;

  // Try partial matches with brand and name
  bestMatch = availableFilms.find((film) => {
    const fullName = `${film.brand} ${film.name}`.toLowerCase();
    const filmNameLower = film.name.toLowerCase();
    const brandLower = film.brand.toLowerCase();

    return (
      fullName.includes(filmString) ||
      filmString.includes(fullName) ||
      filmString.includes(filmNameLower) ||
      filmString.includes(brandLower)
    );
  });

  if (bestMatch) return bestMatch;

  // Try word-based matching (e.g., "Tri-X" matches "TRI-X 400")
  const filmWords = filmString.split(/[\s-]+/).filter((w) => w.length > 1);
  bestMatch = availableFilms.find((film) => {
    const filmText = `${film.brand} ${film.name}`.toLowerCase();
    return filmWords.some((word) => filmText.includes(word));
  });

  if (bestMatch) return bestMatch;

  // Try ISO speed matching for common films
  const isoMatch = filmString.match(/(\d+)/);
  if (isoMatch) {
    const iso = parseInt(isoMatch[1]);
    bestMatch = availableFilms.find(
      (film) =>
        film.isoSpeed === iso &&
        (filmString.includes(film.name.toLowerCase()) ||
          filmString.includes(film.brand.toLowerCase()))
    );
  }

  return bestMatch || null;
}

/**
 * Attempt to find the best matching developer from the local database using a filmdev.org string.
 *
 * @param filmdevDeveloperString - Developer name provided by filmdev.org
 * @param availableDevelopers - Collection of locally known developers to search
 * @returns Matching developer entity or null when no reasonable match is detected
 */
export function findBestDeveloperMatch(
  filmdevDeveloperString: string,
  availableDevelopers: Developer[]
): Developer | null {
  if (!filmdevDeveloperString.trim() || !availableDevelopers.length)
    return null;

  const devString = filmdevDeveloperString.trim().toLowerCase();

  // Try exact name match first
  let bestMatch = availableDevelopers.find(
    (dev) =>
      dev.name.toLowerCase() === devString ||
      `${dev.manufacturer} ${dev.name}`.toLowerCase() === devString
  );

  if (bestMatch) return bestMatch;

  // Try partial matches with manufacturer and name
  bestMatch = availableDevelopers.find((dev) => {
    const fullName = `${dev.manufacturer} ${dev.name}`.toLowerCase();
    const devNameLower = dev.name.toLowerCase();
    const manufacturerLower = dev.manufacturer.toLowerCase();

    return (
      fullName.includes(devString) ||
      devString.includes(fullName) ||
      devString.includes(devNameLower) ||
      devString.includes(manufacturerLower)
    );
  });

  if (bestMatch) return bestMatch;

  // Try word-based matching (e.g., "D-76" matches "Kodak D-76")
  const devWords = devString.split(/[\s-]+/).filter((w) => w.length > 1);
  bestMatch = availableDevelopers.find((dev) => {
    const devText = `${dev.manufacturer} ${dev.name}`.toLowerCase();
    return devWords.some((word) => devText.includes(word));
  });

  if (bestMatch) return bestMatch;

  // Try matching just the key part (remove common words)
  const cleanDevString = devString
    .replace(/\b(developer|chemistry|film|paper)\b/g, '')
    .trim();
  if (cleanDevString && cleanDevString !== devString) {
    bestMatch = availableDevelopers.find((dev) => {
      const devText = `${dev.manufacturer} ${dev.name}`.toLowerCase();
      return devText.includes(cleanDevString);
    });
  }

  return bestMatch || null;
}

/**
 * Creates a custom film entry from filmdev.org data when no match is found.
 * Attempts to parse brand and name from the input string.
 *
 * @param filmString - Film name string from filmdev.org
 * @returns Custom film data object with parsed brand, name, and defaults
 * @example
 * ```typescript
 * const film = createCustomFilmFromFilmdev('Kodak Tri-X 400');
 * console.log(film); // { brand: 'Kodak', name: 'Tri-X 400', isoSpeed: 400, ... }
 * ```
 */
export function createCustomFilmFromFilmdev(
  filmString: string
): CustomFilmData {
  // Try to parse brand and name from the string
  // Common patterns: "Brand Name", "Brand Film Name", etc.
  const parts = filmString.trim().split(/\s+/);

  let brand = '';
  let name = filmString.trim();

  // If multiple words, assume first word is brand
  if (parts.length > 1) {
    brand = parts[0];
    name = parts.slice(1).join(' ');
  }

  // If only one word, use it as both brand and name
  if (parts.length === 1) {
    brand = parts[0];
    name = parts[0];
  }

  return {
    brand,
    name,
    isoSpeed: 400, // Default ISO, user can adjust
    colorType: 'bw', // Default to B&W, user can adjust
    description: `Imported from filmdev.org: ${filmString}`,
  };
}

/**
 * Creates a custom developer entry from filmdev.org data when no match is found.
 * Attempts to parse manufacturer and name from the input string.
 *
 * @param developerString - Developer name string from filmdev.org
 * @returns Custom developer data object with parsed manufacturer, name, and defaults
 * @example
 * ```typescript
 * const dev = createCustomDeveloperFromFilmdev('Kodak D-76');
 * console.log(dev); // { manufacturer: 'Kodak', name: 'D-76', type: 'liquid', ... }
 * ```
 */
export function createCustomDeveloperFromFilmdev(
  developerString: string
): CustomDeveloperData {
  // Try to parse manufacturer and name
  const parts = developerString.trim().split(/\s+/);

  let manufacturer = '';
  let name = developerString.trim();

  // If multiple words, assume first word is manufacturer
  if (parts.length > 1) {
    manufacturer = parts[0];
    name = parts.slice(1).join(' ');
  }

  // If only one word, use it as both
  if (parts.length === 1) {
    manufacturer = parts[0];
    name = parts[0];
  }

  return {
    manufacturer,
    name,
    type: 'liquid', // Default type, user can adjust
    filmOrPaper: 'film',
    notes: `Imported from filmdev.org: ${developerString}`,
    dilutions: [{ name: 'Stock', dilution: 'Stock' }],
  };
}

/**
 * Converts temperature from Celsius to Fahrenheit with rounding to one decimal place.
 *
 * @param celsius - Temperature in Celsius
 * @returns Temperature in Fahrenheit, rounded to one decimal place
 * @example
 * ```typescript
 * const fahrenheit = celsiusToFahrenheit(20);
 * console.log(fahrenheit); // 68.0
 * ```
 */
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
}

/**
 * Parses temperature from filmdev.org string format, preferring Fahrenheit.
 * Falls back to Celsius conversion if Fahrenheit is not available.
 *
 * @param celsiusString - Temperature string in Celsius from filmdev.org
 * @param fahrenheitString - Temperature string in Fahrenheit from filmdev.org
 * @returns Parsed temperature in Fahrenheit, defaults to 68°F if parsing fails
 * @example
 * ```typescript
 * const temp = parseTemperature('20', '68');
 * console.log(temp); // 68 (prefers Fahrenheit)
 *
 * const temp2 = parseTemperature('20', '');
 * console.log(temp2); // 68.0 (converted from Celsius)
 * ```
 */
export function parseTemperature(
  celsiusString: string,
  fahrenheitString: string
): number {
  // Try to parse Fahrenheit first since that's what your system uses
  const fahrenheit = parseFloat(fahrenheitString);
  if (!isNaN(fahrenheit) && fahrenheit > 0) {
    return fahrenheit;
  }

  // Fall back to Celsius and convert
  const celsius = parseFloat(celsiusString);
  if (!isNaN(celsius) && celsius > 0) {
    return celsiusToFahrenheit(celsius);
  }

  // Default to room temperature
  return 68;
}

/**
 * Maps a filmdev.org recipe to CustomRecipeFormData format for form integration.
 * Handles temperature conversion, time calculation, and custom film/developer creation.
 *
 * @param recipe - Raw recipe data from filmdev.org API
 * @param matchedFilm - Matched film from local database, if any
 * @param matchedDeveloper - Matched developer from local database, if any
 * @param filmId - Optional film UUID for existing film selection
 * @param developerId - Optional developer UUID for existing developer selection
 * @returns Form data object ready for recipe creation
 * @example
 * ```typescript
 * const formData = mapFilmdevRecipeToFormData(
 *   filmdevRecipe,
 *   matchedFilm,
 *   null, // no developer match
 *   'film-uuid'
 * );
 * console.log(formData.useExistingFilm); // true
 * console.log(formData.useExistingDeveloper); // false
 * ```
 */
export function mapFilmdevRecipeToFormData(
  recipe: FilmdevRecipe,
  matchedFilm: Film | null,
  matchedDeveloper: Developer | null,
  filmId?: string,
  developerId?: string
): CustomRecipeFormData {
  const temperatureF = parseTemperature(recipe.celcius, recipe.fahrenheit);
  // Convert duration to total minutes (hours + minutes + seconds/60)
  const timeMinutes =
    (recipe.duration_hours || 0) * 60 +
    (recipe.duration_minutes || 0) +
    (recipe.duration_seconds || 0) / 60;

  // Create custom film/developer data if no matches found
  const customFilm = !matchedFilm
    ? createCustomFilmFromFilmdev(recipe.film)
    : undefined;
  const customDeveloper = !matchedDeveloper
    ? createCustomDeveloperFromFilmdev(recipe.developer)
    : undefined;

  // Build dilution info from dilution_ratio
  let customDilution = '';
  if (
    recipe.dilution_ratio &&
    recipe.dilution_ratio.toLowerCase() !== 'stock'
  ) {
    customDilution = recipe.dilution_ratio;
  }

  // Use the recipe name from filmdev.org if available, otherwise create one
  const recipeName =
    recipe.recipe_name ||
    `${recipe.film} + ${recipe.developer}${
      recipe.dilution_ratio ? ` (${recipe.dilution_ratio})` : ''
    }`;

  return {
    name: recipeName,
    useExistingFilm: !!matchedFilm,
    selectedFilmId: filmId || '',
    customFilm,
    useExistingDeveloper: !!matchedDeveloper,
    selectedDeveloperId: developerId || '',
    customDeveloper,
    temperatureF,
    timeMinutes,
    shootingIso: 400, // Default, user can adjust
    pushPull: 0, // Default to normal development
    agitationSchedule: '30s initial, 10s every minute', // Default schedule
    notes:
      recipe.notes || `Imported from filmdev.org (Recipe ID: ${recipe.id})`,
    customDilution,
    isPublic: false, // Default to private
    tags: ['filmdev.org'], // Automatically tag filmdev.org imports
  };
}

/**
 * Result type for the mapping process
 */
export interface FilmdevMappingResult {
  formData: CustomRecipeFormData;
  matchedFilm: Film | null;
  matchedDeveloper: Developer | null;
  isFilmCustom: boolean;
  isDeveloperCustom: boolean;
  originalRecipe: FilmdevRecipe;
}

/**
 * Complete mapping function that handles film/developer matching and form data creation.
 * Orchestrates the entire process of converting a filmdev.org recipe to local format.
 *
 * @param recipe - Raw recipe data from filmdev.org API
 * @param availableFilms - Array of available films in local database
 * @param availableDevelopers - Array of available developers in local database
 * @returns Complete mapping result with form data, matches, and metadata
 * @example
 * ```typescript
 * const result = mapFilmdevRecipe(filmdevRecipe, films, developers);
 * console.log(result.formData); // Ready-to-use form data
 * console.log(result.isFilmCustom); // true if no film match found
 * console.log(result.matchedDeveloper); // Matched developer or null
 * ```
 */
export function mapFilmdevRecipe(
  recipe: FilmdevRecipe,
  availableFilms: Film[],
  availableDevelopers: Developer[]
): FilmdevMappingResult {
  const matchedFilm = findBestFilmMatch(recipe.film, availableFilms);
  const matchedDeveloper = findBestDeveloperMatch(
    recipe.developer,
    availableDevelopers
  );

  const formData = mapFilmdevRecipeToFormData(
    recipe,
    matchedFilm,
    matchedDeveloper,
    matchedFilm?.uuid,
    matchedDeveloper?.uuid
  );

  return {
    formData,
    matchedFilm,
    matchedDeveloper,
    isFilmCustom: !matchedFilm,
    isDeveloperCustom: !matchedDeveloper,
    originalRecipe: recipe,
  };
}
