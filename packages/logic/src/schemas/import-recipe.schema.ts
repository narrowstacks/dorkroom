import { z } from 'zod';
import { MAX_ENCODED_LENGTH } from '../utils/recipe-sharing';
import { isFilmDevOrgUrl } from '../utils/url-helpers';

/** Query param that carries a shared recipe code in a Dorkroom share link. */
const RECIPE_PARAM = 'recipe';

/**
 * Exists only to skip URL parsing of huge pastes (performance).
 * Headroom over MAX_ENCODED_LENGTH for the origin, path and other query
 * params of a pasted share link. Anything longer is rejected before parsing.
 */
const MAX_INPUT_LENGTH = MAX_ENCODED_LENGTH + 512;

/** The `recipe` param of a share link to the /development page, else null. */
const recipeFromShareLink = (value: string): string | null => {
  if (!/^(https?:\/\/|[\w.-]+\.[a-z]{2,}\/)/i.test(value)) return null;
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (url.pathname.replace(/\/+$/, '') !== '/development') return null;
    return url.searchParams.get(RECIPE_PARAM);
  } catch {
    return null;
  }
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A share link to a database recipe carries a UUID, not an encoded recipe. */
const isDatabaseRecipeLink = (value: string): boolean =>
  UUID.test(extractImportRecipeCode(value));

/**
 * Pulls the shared recipe code out of what a user pasted: a full Dorkroom
 * share link (`https://dorkroom.art/development?recipe=...&source=share`),
 * a `recipe=<code>` fragment, or the bare code. Returns the trimmed input
 * unchanged for anything else (filmdev URLs, numeric ids, garbage), so the
 * caller can keep routing and validating it as before. Nothing is fetched.
 */
export function extractImportRecipeCode(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length > MAX_INPUT_LENGTH) return trimmed;
  if (isFilmDevOrgUrl(trimmed)) return trimmed;

  const fromLink = recipeFromShareLink(trimmed);
  if (fromLink) return fromLink.trim();

  const withoutQuestionMark = trimmed.replace(/^\?/, '');
  if (/^recipe=/i.test(withoutQuestionMark)) {
    const fromQuery = new URLSearchParams(withoutQuestionMark).get(
      RECIPE_PARAM
    );
    if (fromQuery) return fromQuery.trim();
  }
  return trimmed;
}

/**
 * Validation schema for Import Recipe Form
 * Accepts filmdev.org URLs, recipe IDs, shared recipe codes, Dorkroom share
 * links and `recipe=<code>` fragments.
 */
export const importRecipeSchema = z.object({
  encoded: z
    .string()
    .min(1, { message: 'Please enter a recipe URL, ID, or code', abort: true })
    .refine(
      (value) => !isDatabaseRecipeLink(value),
      'This links to a recipe in the Dorkroom database. Open the link directly to view it.'
    )
    .refine((value) => {
      const trimmed = value.trim();
      // Match filmdev.org URL (host-checked, not a loose substring match)
      if (isFilmDevOrgUrl(trimmed)) return true;
      // Match filmdev recipe ID (typically numeric)
      if (/^\d+$/.test(trimmed)) return true;
      // Match shared recipe code (URL-safe base64: letters, digits, "-" and
      // "_"), bare or pulled from a share link. Length is bounded before
      // anything is decoded.
      const code = extractImportRecipeCode(trimmed);
      return code.length <= MAX_ENCODED_LENGTH && /^[A-Za-z0-9_-]+$/.test(code);
    }, 'Enter a valid filmdev.org URL, recipe ID, shared code, or Dorkroom share link'),
});

export type ImportRecipeFormData = z.infer<typeof importRecipeSchema>;
