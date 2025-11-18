import { z } from 'zod';

/**
 * Validation schema for Custom Recipe Form
 * Comprehensive schema with nested objects and conditional field validation
 */

// Custom Film Schema
export const customFilmSchema = z.object({
  brand: z
    .string()
    .min(1, 'Film brand is required')
    .max(100, 'Film brand is too long'),
  name: z
    .string()
    .min(1, 'Film name is required')
    .max(100, 'Film name is too long'),
  isoSpeed: z
    .number()
    .min(3, 'ISO speed is too low')
    .max(10000, 'ISO speed is too high'),
  colorType: z.enum(['bw', 'color', 'slide']),
  grainStructure: z
    .string()
    .max(200, 'Grain structure description is too long')
    .optional(),
  description: z.string().max(500, 'Film description is too long').optional(),
});

// Custom Developer Schema
export const customDeveloperSchema = z.object({
  manufacturer: z
    .string()
    .min(1, 'Manufacturer is required')
    .max(100, 'Manufacturer is too long'),
  name: z
    .string()
    .min(1, 'Developer name is required')
    .max(100, 'Developer name is too long'),
  type: z
    .string()
    .min(1, 'Developer type is required')
    .max(100, 'Developer type is too long'),
  filmOrPaper: z.enum(['film', 'paper', 'both']),
  workingLifeHours: z
    .number()
    .min(0, 'Working life cannot be negative')
    .optional(),
  stockLifeMonths: z
    .number()
    .min(0, 'Stock life cannot be negative')
    .optional(),
  notes: z.string().max(500, 'Developer notes are too long').optional(),
  mixingInstructions: z
    .string()
    .max(1000, 'Mixing instructions are too long')
    .optional(),
  safetyNotes: z.string().max(500, 'Safety notes are too long').optional(),
  dilutions: z
    .array(
      z.object({
        name: z.string().min(1, 'Dilution name is required'),
        dilution: z.string().min(1, 'Dilution ratio is required'),
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
      .max(200, 'Recipe name is too long'),

    temperatureF: z
      .number()
      .min(32, 'Temperature cannot be below freezing (32°F)')
      .max(200, 'Temperature is too high'),

    timeMinutes: z
      .number()
      .min(0.1, 'Development time must be greater than 0')
      .max(120, 'Development time cannot exceed 2 hours'),

    shootingIso: z
      .number()
      .min(3, 'ISO is too low')
      .max(10000, 'ISO is too high'),

    pushPull: z
      .number()
      .min(-2, 'Push/pull cannot be less than -2')
      .max(2, 'Push/pull cannot be more than +2'),

    agitationSchedule: z
      .string()
      .min(1, 'Agitation schedule is required')
      .max(500, 'Agitation schedule is too long'),

    customDilution: z
      .string()
      .max(200, 'Custom dilution is too long')
      .optional(),

    notes: z.string().max(1000, 'Recipe notes are too long').optional(),

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
      message: 'Either select an existing film or provide custom film details',
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
      message:
        'Either select an existing developer or provide custom developer details',
      path: ['selectedDeveloperId'],
    }
  );

export type CustomRecipeFormData = z.infer<typeof customRecipeSchema>;
export type CustomFilmData = z.infer<typeof customFilmSchema>;
export type CustomDeveloperData = z.infer<typeof customDeveloperSchema>;
