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
 * Extracts a numeric Filmdev recipe ID from a raw input string.
 *
 * Accepts a plain numeric ID or a filmdev.org URL that contains `/recipe/show/{id}`; the URL may be prefixed with `api/`, `www.`, and `http(s)://`.
 *
 * @param input - Raw URL or identifier provided by the user
 * @returns The numeric recipe ID as a string, or `null` if no ID could be extracted
 */
export function extractRecipeId(input: string): string | null {
  const trimmed = input.trim();

  // Direct ID (just numbers)
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // URL patterns - support both regular and API URLs
  const urlPattern =
    /^(?:https?:\/\/)?(?:www\.)?filmdev\.org\/(?:api\/)?recipe(?:\/show)?\/(\d+)(?:[/?#].*)?$/i;
  const match = trimmed.match(urlPattern);

  return match ? match[1] : null;
}

/**
 * Retrieve a filmdev.org recipe by its numeric ID.
 *
 * @param recipeId - Recipe identifier consisting of digits only
 * @returns The recipe object returned by filmdev.org
 * @throws FilmdevApiError when `recipeId` is invalid, the recipe is not found, or a network/response error occurs
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

  // Always use proxy to avoid CORS issues
  // In development: Vite proxy handles /api/filmdev -> filmdev.org
  // In production: Vercel serverless function handles /api/filmdev -> filmdev.org
  const url = `/api/filmdev?id=${recipeId}`;

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
 * Determine whether a string represents a filmdev.org recipe URL or numeric recipe ID.
 *
 * @param input - Raw URL or identifier to check
 * @returns `true` if the value can be converted to a recipe ID, `false` otherwise
 */
export function isFilmdevInput(input: string): boolean {
  const trimmed = input.trim();
  return extractRecipeId(trimmed) !== null;
}
