import { z } from 'zod';
import { RECIPROCITY_FILM_TYPES } from '../constants/reciprocity';
import { RECIPROCITY_STORAGE_KEY } from '../types/reciprocity';
import { definePersistedFormFields } from '../utils/persisted-form-fields';
import { reciprocityFactorValidator } from './validators';

/** Field schema for `meteredTime`, shared with localStorage hydration validation. */
export const reciprocityMeteredTimeSchema = z
  .string()
  .min(1, 'Please enter a metered time')
  .refine((value) => {
    const trimmed = value.trim();
    // Check if it matches time format: one or more unit groups (number + optional decimal + optional spaces + unit [s/m/h]) with optional spaces between groups
    // Examples: "30s", "1m30s", "2h", "1.5m", "1,5m", "1h 30m 45s", "1 h 30 m"
    // "," is a decimal separator too, matching parseReciprocityTime (#373).
    if (
      /^(\d+(?:[.,]\d+)?\s*[smh])(\s*\d+(?:[.,]\d+)?\s*[smh])*$/i.test(trimmed)
    )
      return true;
    // Check if it's a plain number (assume seconds)
    if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) return true;
    return false;
  }, 'Enter time in format like "30s", "1m30s", "2h", or "1h 30m 45s"');

/**
 * Validation schema for Reciprocity Calculator Form
 * Supports time format parsing: "30s", "1m30s", "2h", etc.
 */
export const reciprocityCalculatorSchema = z.object({
  filmType: z.string().min(1, 'Please select a film type'),

  customFactor: reciprocityFactorValidator().optional().default(1.3),

  meteredTime: reciprocityMeteredTimeSchema,
});

const filmTypeValues = new Set(
  RECIPROCITY_FILM_TYPES.map((film) => film.value)
);

/**
 * Per-field bounds for restoring the Reciprocity Calculator from localStorage.
 *
 * Stricter than the form schema in two places, because hydration has none of
 * the form's guarantees: `filmType` must be a member of the film list the
 * calculator looks factors up in (the form only needs a non-empty string, as
 * the select can never produce anything else), and `customFactor` is required
 * (the form's is optional-with-default, which would accept `undefined`).
 */
export const reciprocityPersistedFieldSchemas = {
  filmType: z.string().refine((value) => filmTypeValues.has(value)),
  meteredTime: reciprocityMeteredTimeSchema,
  customFactor: reciprocityFactorValidator(),
};

/** Storage key, persist keys and hydration validators for the form. */
export const reciprocityCalculatorPersistence = definePersistedFormFields(
  RECIPROCITY_STORAGE_KEY,
  reciprocityPersistedFieldSchemas
);

export type ReciprocityCalculatorFormData = z.infer<
  typeof reciprocityCalculatorSchema
>;
