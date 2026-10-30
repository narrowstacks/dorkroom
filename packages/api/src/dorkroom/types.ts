// Core data types for the Dorkroom API
import type { z } from 'zod';
import type {
  filmAliasSchema,
  rawCombinationSchema,
  rawDeveloperSchema,
  rawDilutionSchema,
  rawFilmSchema,
  statsSchema,
} from './schemas';

// Wire shapes are inferred from the zod schemas in ./schemas, which the client
// validates every response against. The schema is the only declaration, so a
// field added there reaches these types, and a field the client reads that the
// schema lacks is a compile error rather than an always-undefined value.

/** See `filmAliasSchema`. */
export type FilmAlias = z.infer<typeof filmAliasSchema>;

export interface Film {
  id: number;
  uuid: string;
  slug: string;
  brand: string;
  name: string;
  colorType: string;
  isoSpeed: number;
  grainStructure: string | null;
  description: string;
  manufacturerNotes: string[] | null;
  reciprocityFailure: string | null;
  discontinued: boolean;
  staticImageUrl: string | null;
  aliases: FilmAlias[];
  baseFilmSlug: string | null;
  dateAdded: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dilution {
  id: string;
  name: string;
  dilution: string;
}

/**
 * Some stored dilutions omit `name` (transformDeveloper falls back to
 * dilution/ratio), and some use `ratio` instead of `dilution`.
 */
export type RawDilution = z.infer<typeof rawDilutionSchema>;

export interface Developer {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  manufacturer: string;
  type: string;
  description: string;
  filmOrPaper: boolean;
  dilutions: Dilution[];
  mixingInstructions: string | null;
  storageRequirements: string | null;
  safetyNotes: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Combination {
  id: number;
  uuid: string;
  name: string;
  filmStockId: string;
  filmSlug: string;
  developerId: string;
  developerSlug: string;
  shootingIso: number;
  dilutionId: string | null;
  customDilution: string | null;
  temperatureC: number;
  temperatureF: number;
  timeMinutes: number;
  agitationMethod: string;
  agitationSchedule: string | null;
  pushPull: number | null;
  tags: string[] | null;
  notes: string | null;
  infoSource: string | null;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface FilmsApiResponse {
  data: Film[];
  count: number;
}

export interface DevelopersApiResponse {
  data: Developer[];
  count: number;
}

export interface CombinationsApiResponse {
  data: Combination[];
  count: number;
}

// API raw response types (snake_case from server), inferred from the schemas.
// `manufacturer_notes` is a PostgreSQL array-format string; `dilution_id` is a
// string; `tags` is an array.
export type RawFilm = z.infer<typeof rawFilmSchema>;
export type RawDeveloper = z.infer<typeof rawDeveloperSchema>;
export type RawCombination = z.infer<typeof rawCombinationSchema>;
export type Stats = z.infer<typeof statsSchema>;

// Error types

/**
 * Thrown by the API client for every failure except an abort (an aborted
 * request rethrows the platform `AbortError` so query cancellation works).
 *
 * - `statusCode` is the HTTP status for a non-OK response, and `undefined`
 *   for failures with no HTTP status (network error, bad JSON, response that
 *   fails envelope/shape validation).
 * - `endpoint` is the full request URL.
 * - `cause` holds the underlying error when there is one.
 */
export class DorkroomApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    // Keep `instanceof` working when transpiled to ES5-style classes.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'DorkroomApiError';
  }
}
