/**
 * Zod schemas for runtime validation of API responses.
 * These provide defense-in-depth validation to ensure API data integrity.
 */
import { z } from 'zod';

/**
 * Schema for raw dilution data from API.
 * Note: API is inconsistent - some dilutions have id as number, others as string.
 * Some use 'dilution' field, others use 'ratio' field.
 */
export const rawDilutionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  dilution: z.string().optional(),
  ratio: z.string().optional(),
});

/**
 * Schema for raw film data from API (snake_case).
 * Note: manufacturer_notes comes as a PostgreSQL array string format, not JSON array
 */
export const rawFilmSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  slug: z.string(),
  brand: z.string(),
  name: z.string(),
  color_type: z.string(),
  iso_speed: z.number(),
  grain_structure: z.string().nullable(),
  description: z.string(),
  manufacturer_notes: z.string().nullable(), // PostgreSQL array format string
  reciprocity_failure: z.string().nullable(),
  discontinued: z.boolean(),
  static_image_url: z.string().nullable(),
  date_added: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Schema for raw developer data from API (snake_case).
 */
export const rawDeveloperSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  slug: z.string(),
  name: z.string(),
  manufacturer: z.string(),
  type: z.string(),
  description: z.string(),
  film_or_paper: z.boolean(),
  dilutions: z.array(rawDilutionSchema),
  mixing_instructions: z.string().nullable(),
  storage_requirements: z.string().nullable(),
  safety_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Schema for raw combination data from API (snake_case).
 * Note: Many fields can be null, dilution_id is a string, tags is an array
 */
export const rawCombinationSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  name: z.string().nullable(),
  film_stock: z.string(),
  developer: z.string(),
  shooting_iso: z.number(),
  dilution_id: z.string().nullable(), // String in API, not number
  custom_dilution: z.string().nullable(),
  temperature_celsius: z.number(),
  time_minutes: z.number(),
  agitation_method: z.string().nullable(),
  push_pull: z.number(),
  tags: z.array(z.string()).nullable(), // Array, not string
  notes: z.string().nullable(),
  info_source: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Schema for films API response.
 */
export const filmsResponseSchema = z.object({
  data: z.array(rawFilmSchema),
  count: z.number().optional(),
});

/**
 * Schema for developers API response.
 */
export const developersResponseSchema = z.object({
  data: z.array(rawDeveloperSchema),
  count: z.number().optional(),
});

/**
 * Schema for combinations API response.
 */
export const combinationsResponseSchema = z.object({
  data: z.array(rawCombinationSchema),
  count: z.number().optional(),
});

// Export inferred types for use in client
export type RawFilmFromSchema = z.infer<typeof rawFilmSchema>;
export type RawDeveloperFromSchema = z.infer<typeof rawDeveloperSchema>;
export type RawCombinationFromSchema = z.infer<typeof rawCombinationSchema>;
export type FilmsResponseFromSchema = z.infer<typeof filmsResponseSchema>;
export type DevelopersResponseFromSchema = z.infer<
  typeof developersResponseSchema
>;
export type CombinationsResponseFromSchema = z.infer<
  typeof combinationsResponseSchema
>;
