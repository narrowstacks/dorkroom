import { z } from 'zod';
import {
  MAX_RECIPE_TIME_MINUTES,
  RECIPE_TEXT_LIMITS as LIMITS,
} from '../constants/custom-recipe-limits';
import { recipeNumericFieldSchemas } from '../utils/combination-factory';

/**
 * Validation schema for Custom Recipe Form
 * Comprehensive schema with nested objects and conditional field validation
 */

/**
 * The store used to cut long text to the limit and then add "...", so recipes
 * saved earlier can hold three characters more. They still have to save.
 */
const fitsLimit = (text: string, limit: number): boolean =>
  text.length <= limit || (text.length <= limit + 3 && text.endsWith('...'));

const limitedText = (limit: number, message: string) =>
  z.string().refine((text) => fitsLimit(text, limit), message);

const requiredText = (limit: number, required: string, tooLong: string) =>
  z
    .string()
    .trim()
    .min(1, required)
    .refine((text) => fitsLimit(text, limit), tooLong);

// Custom Film Schema
export const customFilmSchema = z.object({
  brand: requiredText(
    LIMITS.filmBrand,
    'Film brand is required',
    'Film brand is too long'
  ),
  name: requiredText(
    LIMITS.filmName,
    'Film name is required',
    'Film name is too long'
  ),
  isoSpeed: recipeNumericFieldSchemas.shootingIso,
  colorType: z.enum(['bw', 'color', 'slide']),
  grainStructure: limitedText(
    LIMITS.grainStructure,
    'Grain structure description is too long'
  ).optional(),
  description: limitedText(
    LIMITS.filmDescription,
    'Film description is too long'
  ).optional(),
});

// Custom Developer Schema
export const customDeveloperSchema = z.object({
  manufacturer: requiredText(
    LIMITS.developerManufacturer,
    'Manufacturer is required',
    'Manufacturer is too long'
  ),
  name: requiredText(
    LIMITS.developerName,
    'Developer name is required',
    'Developer name is too long'
  ),
  type: requiredText(
    LIMITS.developerType,
    'Developer type is required',
    'Developer type is too long'
  ),
  filmOrPaper: z.enum(['film', 'paper', 'both']),
  workingLifeHours: z
    .number()
    .min(0, 'Working life cannot be negative')
    .optional(),
  stockLifeMonths: z
    .number()
    .min(0, 'Stock life cannot be negative')
    .optional(),
  notes: limitedText(
    LIMITS.developerNotes,
    'Developer notes are too long'
  ).optional(),
  mixingInstructions: limitedText(
    LIMITS.mixingInstructions,
    'Mixing instructions are too long'
  ).optional(),
  safetyNotes: limitedText(
    LIMITS.safetyNotes,
    'Safety notes are too long'
  ).optional(),
  dilutions: z
    .array(
      z.object({
        // The form has no way to edit these, so a blank one must not block a save.
        name: z.string(),
        dilution: z.string(),
      })
    )
    .min(1, 'At least one dilution is required'),
});

// Main Custom Recipe Schema
export const customRecipeSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Recipe name is required')
      .refine(
        (text) => fitsLimit(text, LIMITS.recipeName),
        'Recipe name is too long'
      ),

    // The same ranges the store enforces, plus a ceiling on time for what gets
    // saved from here. Real recipes push past +2 and shoot past EI 10000.
    temperatureF: recipeNumericFieldSchemas.temperatureF,
    timeMinutes: recipeNumericFieldSchemas.timeMinutes.max(
      MAX_RECIPE_TIME_MINUTES,
      `Time must be at most ${MAX_RECIPE_TIME_MINUTES} minutes (24 hours)`
    ),
    shootingIso: recipeNumericFieldSchemas.shootingIso,
    pushPull: recipeNumericFieldSchemas.pushPull,

    // Optional: most published recipes have none, and the panel says so.
    agitationSchedule: limitedText(
      LIMITS.agitationSchedule,
      'Agitation schedule is too long'
    ).optional(),

    selectedDilutionId: z.string().optional(), // dilution ID or 'custom'

    customDilution: limitedText(
      LIMITS.customDilution,
      'Custom dilution is too long'
    ).optional(),

    notes: limitedText(
      LIMITS.recipeNotes,
      'Recipe notes are too long'
    ).optional(),

    isPublic: z.boolean().default(false),
    isFavorite: z.boolean().default(false),

    // Film selection (conditional)
    useExistingFilm: z.boolean().default(true),
    selectedFilmId: z.string().optional(),
    customFilm: customFilmSchema.optional(),

    // Developer selection (conditional)
    useExistingDeveloper: z.boolean().default(true),
    selectedDeveloperId: z.string().optional(),
    customDeveloper: customDeveloperSchema.optional(),
  })
  .refine(
    (data) => {
      // Either existing film or custom film must be provided
      if (data.useExistingFilm) {
        return !!data.selectedFilmId;
      }
      return !!data.customFilm;
    },
    {
      message: 'Choose a film, or enter your own.',
      path: ['selectedFilmId'],
    }
  )
  .refine(
    (data) => {
      // Either existing developer or custom developer must be provided
      if (data.useExistingDeveloper) {
        return !!data.selectedDeveloperId;
      }
      return !!data.customDeveloper;
    },
    {
      message: 'Choose a developer, or enter your own.',
      path: ['selectedDeveloperId'],
    }
  );

// Named *Schema* to avoid colliding with the hand-written interfaces of the
// same base names in types/custom-recipes.ts (also exported from the root).
export type CustomRecipeSchemaData = z.infer<typeof customRecipeSchema>;
export type CustomFilmSchemaData = z.infer<typeof customFilmSchema>;
export type CustomDeveloperSchemaData = z.infer<typeof customDeveloperSchema>;
