/**
 * Client for interacting with the filmdev.org API.
 *
 * @see https://filmdev.org/about/api
 */

export interface FilmdevRecipe {
  id: number;
  film: string;
  developer: string;
  dilution_ratio: string;
  celcius: string;
  fahrenheit: string;
  duration_hours: number;
  duration_minutes: number;
  duration_seconds: number;
  notes: string;
  created: string;
  user: string;
  recipe_link: string;
  recipe_name: string;
  profile_link: string;
  photos_link: string;
  format: string | null;
}

export interface FilmdevApiResponse {
  recipe: FilmdevRecipe;
}

export class FilmdevApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public recipeId?: string
  ) {
    super(message);
    this.name = 'FilmdevApiError';
  }
}

/**
 * Extract recipe IDs from various filmdev.org URL formats.
 * Supports:
 * - https://filmdev.org/recipe/show/123 (user-facing URL)
 * - https://filmdev.org/api/recipe/123 (API URL)
 * - filmdev.org/recipe/123
 * - filmdev.org/api/recipe/123
 * - Direct ID: 123
 *
 * @param input - Raw URL or identifier provided by the user
 * @returns Resolved recipe ID string, or null when the value cannot be parsed
 */
export function extractRecipeId(input: string): string | null {
  const trimmed = input.trim();

  // Direct ID (just numbers)
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // URL patterns - support both regular and API URLs
  const urlPattern =
    /(?:https?:\/\/)?(?:www\.)?filmdev\.org\/(?:api\/)?recipe\/show\/(\d+)/i;
  const match = trimmed.match(urlPattern);

  return match ? match[1] : null;
}

/**
 * Fetch a recipe from filmdev.org by ID.
 *
 * @param recipeId - Numeric identifier extracted from a filmdev.org URL
 * @returns Promise resolving to the recipe payload from filmdev.org
 * @throws FilmdevApiError when validation fails or the network request is unsuccessful
 */
export async function fetchFilmdevRecipe(
  recipeId: string
): Promise<FilmdevRecipe> {
  if (!recipeId || !/^\d+$/.test(recipeId)) {
    throw new FilmdevApiError(
      'Invalid recipe ID. Must be a positive integer.',
      400,
      recipeId
    );
  }

  // Use proxy in development to avoid CORS issues
  const isDevelopment =
    typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const url = isDevelopment
    ? `/api/filmdev/recipe/${recipeId}`
    : `https://filmdev.org/api/recipe/${recipeId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new FilmdevApiError(
          `Recipe ${recipeId} not found on filmdev.org`,
          404,
          recipeId
        );
      }

      throw new FilmdevApiError(
        `Failed to fetch recipe: ${response.status} ${response.statusText}`,
        response.status,
        recipeId
      );
    }

    const data: FilmdevApiResponse = await response.json();

    if (!data.recipe) {
      throw new FilmdevApiError(
        'Invalid response format from filmdev.org',
        500,
        recipeId
      );
    }

    return data.recipe;
  } catch (error) {
    if (error instanceof FilmdevApiError) {
      throw error;
    }

    // Handle network errors, JSON parsing errors, etc.
    throw new FilmdevApiError(
      `Network error while fetching recipe: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      0,
      recipeId
    );
  }
}

/**
 * Validate whether input resembles a filmdev.org URL or recipe ID.
 *
 * @param input - Raw URL or identifier to check
 * @returns True when the value can be converted into a recipe ID
 */
export function isFilmdevInput(input: string): boolean {
  const trimmed = input.trim();
  return extractRecipeId(trimmed) !== null;
}
