import { z } from 'zod';
import type { Combination } from '@dorkroom/api';
import type { CustomRecipe } from '../types/custom-recipes';

/**
 * Sentinel value used for temporary combinations that don't have a database ID.
 * These combinations are client-side only (e.g., custom recipes, shared recipes).
 * The `id` field is not used in the UI - only `uuid` is used for identification.
 */
const TEMPORARY_ID = -1 as const;

/**
 * Zod schema for validating recipe numeric inputs.
 * Enforces physical limits and reasonable ranges for development parameters.
 */
const RecipeValidationSchema = z.object({
  temperatureF: z
    .number({
      error: (issue) =>
        issue.code === 'invalid_type' ? 'Invalid numeric values provided' : undefined,
    })
    .finite('Invalid numeric values provided')
    .min(32, 'Temperature must be at least 32°F (freezing point)')
    .max(212, 'Temperature must be at most 212°F (boiling point)'),
  timeMinutes: z
    .number({
      error: (issue) =>
        issue.code === 'invalid_type' ? 'Invalid numeric values provided' : undefined,
    })
    .finite('Invalid numeric values provided')
    .positive('Time must be positive'),
  shootingIso: z
    .number({
      error: (issue) =>
        issue.code === 'invalid_type' ? 'Invalid numeric values provided' : undefined,
    })
    .finite('Invalid numeric values provided')
    .positive('ISO must be positive'),
  pushPull: z
    .number({
      error: (issue) =>
        issue.code === 'invalid_type' ? 'Invalid numeric values provided' : undefined,
    })
    .finite('Invalid numeric values provided')
    .min(-2, 'Push/pull must be at least -2 stops')
    .max(5, 'Push/pull must be at most +5 stops')
    .optional()
    .nullable(),
});

/**
 * Validates numeric inputs for recipes to ensure they are within reasonable ranges.
 *
 * @param temperatureF - Temperature in Fahrenheit
 * @param timeMinutes - Development time in minutes
 * @param shootingIso - ISO setting
 * @param pushPull - Optional push/pull value in stops
 * @throws Error if values are invalid or out of range
 */
function validateNumericInputs(
  temperatureF: number,
  timeMinutes: number,
  shootingIso: number,
  pushPull?: number | null
): void {
  try {
    RecipeValidationSchema.parse({
      temperatureF,
      timeMinutes,
      shootingIso,
      pushPull,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return the first error message
      throw new Error(error.issues[0].message);
    }
    throw error;
  }
}

/**
 * Creates a Combination object from a CustomRecipe or a partial recipe.
 * This provides type-safe conversion without using type assertions.
 *
 * @param recipe - Custom recipe to convert (can be partial for shared recipes)
 * @param uuid - Optional UUID override (defaults to recipe.id if available)
 * @returns Combination object with all required fields
 */
export function createCombinationFromCustomRecipe(
  recipe:
    | CustomRecipe
    | Omit<CustomRecipe, 'id' | 'dateCreated' | 'dateModified'>,
  uuid?: string
): Combination {
  validateNumericInputs(
    recipe.temperatureF,
    recipe.timeMinutes,
    recipe.shootingIso,
    recipe.pushPull
  );

  const temperatureC = ((recipe.temperatureF - 32) * 5) / 9;
  const timestamp = new Date().toISOString();

  // For partial recipes (shared), use the provided uuid or a default
  const recipeId = 'id' in recipe ? recipe.id : uuid ?? 'temp';
  const createdAt = 'dateCreated' in recipe ? recipe.dateCreated : timestamp;
  const updatedAt =
    'dateModified' in recipe ? recipe.dateModified || createdAt : timestamp;

  return {
    id: TEMPORARY_ID,
    uuid: uuid ?? recipeId,
    name: recipe.name,
    filmStockId: recipe.filmId,
    filmSlug: recipe.filmId,
    developerId: recipe.developerId,
    developerSlug: recipe.developerId,
    temperatureF: recipe.temperatureF,
    temperatureC,
    timeMinutes: recipe.timeMinutes,
    shootingIso: recipe.shootingIso,
    pushPull: recipe.pushPull,
    agitationMethod: 'Standard',
    agitationSchedule: recipe.agitationSchedule ?? null,
    notes: recipe.notes ?? null,
    customDilution: recipe.customDilution ?? null,
    dilutionId: recipe.dilutionId ? String(recipe.dilutionId) : null,
    createdAt,
    updatedAt,
    tags: ['custom'],
    infoSource: null,
  };
}

/**
 * Creates a partial Combination object for temporary use (e.g., shared recipes).
 * This is useful when creating combinations that don't have all fields yet.
 *
 * @param data - Partial combination data
 * @returns Combination object with required fields and sensible defaults
 */
export function createTemporaryCombination(data: {
  id?: number;
  uuid?: string;
  name: string;
  filmStockId: string;
  developerId: string;
  temperatureF: number;
  timeMinutes: number;
  shootingIso: number;
  pushPull?: number;
  agitationMethod?: string;
  agitationSchedule?: string;
  notes?: string;
  customDilution?: string;
  dilutionId?: string | null;
  tags?: string[] | null;
  infoSource?: string | null;
}): Combination {
  validateNumericInputs(
    data.temperatureF,
    data.timeMinutes,
    data.shootingIso,
    data.pushPull
  );

  const temperatureC = ((data.temperatureF - 32) * 5) / 9;
  const uuid = data.uuid ?? 'temp';
  const timestamp = new Date().toISOString();

  return {
    id: data.id ?? TEMPORARY_ID,
    uuid,
    name: data.name,
    filmStockId: data.filmStockId,
    filmSlug: data.filmStockId,
    developerId: data.developerId,
    developerSlug: data.developerId,
    temperatureF: data.temperatureF,
    temperatureC,
    timeMinutes: data.timeMinutes,
    shootingIso: data.shootingIso,
    pushPull: data.pushPull ?? 0,
    agitationMethod: data.agitationMethod ?? 'Standard',
    agitationSchedule: data.agitationSchedule ?? null,
    notes: data.notes ?? null,
    customDilution: data.customDilution ?? null,
    dilutionId: data.dilutionId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    tags: data.tags ?? ['custom'],
    infoSource: data.infoSource ?? null,
  };
}
