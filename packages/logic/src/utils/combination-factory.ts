import type { Combination } from '@dorkroom/api';
import type { CustomRecipe } from '../types/custom-recipes';

/**
 * Sentinel value used for temporary combinations that don't have a database ID.
 * These combinations are client-side only (e.g., custom recipes, shared recipes).
 * The `id` field is not used in the UI - only `uuid` is used for identification.
 */
const TEMPORARY_ID = -1 as const;

/**
 * Temperature constants for validation (Fahrenheit)
 * These represent the physical limits for darkroom chemistry:
 * - MIN_TEMPERATURE_F: Freezing point of water (32°F)
 * - MAX_TEMPERATURE_F: Boiling point of water (212°F)
 */
const MIN_TEMPERATURE_F = 32; // Freezing point
const MAX_TEMPERATURE_F = 212; // Boiling point

/**
 * Validates numeric inputs for recipes to ensure they are within reasonable ranges.
 *
 * @param temperatureF - Temperature in Fahrenheit
 * @param timeMinutes - Development time in minutes
 * @param shootingIso - ISO setting
 * @throws Error if values are invalid or out of range
 */
function validateNumericInputs(
  temperatureF: number,
  timeMinutes: number,
  shootingIso: number
): void {
  if (
    !Number.isFinite(temperatureF) ||
    !Number.isFinite(timeMinutes) ||
    !Number.isFinite(shootingIso)
  ) {
    throw new Error('Invalid numeric values provided');
  }

  if (temperatureF < MIN_TEMPERATURE_F || temperatureF > MAX_TEMPERATURE_F) {
    throw new Error(
      `Temperature must be between ${MIN_TEMPERATURE_F}°F and ${MAX_TEMPERATURE_F}°F`
    );
  }

  if (timeMinutes <= 0) {
    throw new Error('Time must be positive');
  }

  if (shootingIso <= 0) {
    throw new Error('ISO must be positive');
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
    recipe.shootingIso
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
  validateNumericInputs(data.temperatureF, data.timeMinutes, data.shootingIso);

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
