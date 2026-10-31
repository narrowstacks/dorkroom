import { z } from 'zod';
import { MAX_ENCODED_LENGTH } from '../utils/recipe-sharing';
import { isFilmDevOrgUrl } from '../utils/url-helpers';

/**
 * Validation schema for Import Recipe Form
 * Accepts filmdev.org URLs, recipe IDs, or shared recipe codes
 */
export const importRecipeSchema = z.object({
  encoded: z
    .string()
    .min(1, 'Please enter a recipe URL, ID, or code')
    .refine((value) => {
      const trimmed = value.trim();
      // Match filmdev.org URL (host-checked, not a loose substring match)
      if (isFilmDevOrgUrl(trimmed)) return true;
      // Match filmdev recipe ID (typically numeric)
      if (/^\d+$/.test(trimmed)) return true;
      // Match shared recipe code (URL-safe base64: letters, digits, "-" and "_")
      if (
        trimmed.length <= MAX_ENCODED_LENGTH &&
        /^[A-Za-z0-9_-]+$/.test(trimmed)
      )
        return true;
      return false;
    }, 'Enter a valid filmdev.org URL, recipe ID, or shared code'),
});

export type ImportRecipeFormData = z.infer<typeof importRecipeSchema>;
