/**
 * Zod schemas for runtime validation of API responses.
 * These provide defense-in-depth validation to ensure API data integrity.
 */
import { z } from 'zod';

/**
 * Schema for raw dilution data from API.
 */
export const rawDilutionSchema = z.object({
  id: z.number(),
  name: z.string(),
  dilution: z.string(),
});

/**
 * Schema for raw film data from API (snake_case).
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
  manufacturer_notes: z.array(z.string()).nullable(),
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
 */
export const rawCombinationSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  name: z.string(),
  film_stock: z.string(),
  developer: z.string(),
  shooting_iso: z.number(),
  dilution_id: z.number().nullable(),
  temperature_celsius: z.number(),
  time_minutes: z.number(),
  agitation_method: z.string(),
  push_pull: z.number(),
  tags: z.string().nullable(),
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
