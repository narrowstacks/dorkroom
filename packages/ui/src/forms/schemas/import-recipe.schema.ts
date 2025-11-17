import { z } from 'zod';

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
      // Match filmdev.org URL
      if (trimmed.includes('filmdev.org')) return true;
      // Match filmdev recipe ID (typically numeric)
      if (/^\d+$/.test(trimmed)) return true;
      // Match shared recipe code (alphanumeric)
      if (/^[a-zA-Z0-9]+$/.test(trimmed)) return true;
      return false;
    }, 'Enter a valid filmdev.org URL, recipe ID, or shared code'),
});

export type ImportRecipeFormData = z.infer<typeof importRecipeSchema>;
