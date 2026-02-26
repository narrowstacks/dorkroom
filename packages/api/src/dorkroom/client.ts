import { z } from 'zod';
import {
  rawCombinationSchema,
  rawDeveloperSchema,
  rawFilmSchema,
} from './schemas';
import type {
  Combination,
  Developer,
  Film,
  RawCombination,
  RawDeveloper,
  RawFilm,
} from './types';

/**
 * Minimal envelope schema - validates only that the response has a data array.
 * Individual items are validated separately to allow graceful filtering.
 */
const envelopeSchema = z.object({
  data: z.array(z.unknown()),
  count: z.number().optional(),
});

/**
 * Default API base URL for production Dorkroom API
 */
export const DEFAULT_BASE_URL = 'https://dorkroom.art/api';

/**
 * API client for Dorkroom API
 */
export class DorkroomApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch films from the API with runtime validation.
   * Invalid individual items are filtered out rather than failing the entire request.
   */
  async fetchFilms(options?: { signal?: AbortSignal }): Promise<Film[]> {
    const response = await fetch(`${this.baseUrl}/films`, {
      signal: options?.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch films: ${response.statusText}`);
    }

    const json: unknown = await response.json();

    // Validate the outer envelope structure
    const envelope = envelopeSchema.safeParse(json);
    if (!envelope.success) {
      console.error(
        '[DorkroomApiClient] Films API response envelope invalid:',
        envelope.error
      );
      throw new Error('Invalid API response format for films');
    }

    // Validate each item individually, filter out invalid ones
    const validItems: RawFilm[] = [];
    let invalidCount = 0;
    for (const item of envelope.data.data) {
      const result = rawFilmSchema.safeParse(item);
      if (result.success) {
        validItems.push(result.data);
      } else {
        invalidCount++;
      }
    }
    if (invalidCount > 0) {
      console.warn(
        `[DorkroomApiClient] Filtered out ${invalidCount} invalid film(s) from API response`
      );
    }

    return validItems.map(this.transformFilm.bind(this));
  }

  /**
   * Fetch developers from the API with runtime validation.
   * Invalid individual items are filtered out rather than failing the entire request.
   */
  async fetchDevelopers(options?: {
    signal?: AbortSignal;
  }): Promise<Developer[]> {
    const response = await fetch(`${this.baseUrl}/developers`, {
      signal: options?.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch developers: ${response.statusText}`);
    }

    const json: unknown = await response.json();

    // Validate the outer envelope structure
    const envelope = envelopeSchema.safeParse(json);
    if (!envelope.success) {
      console.error(
        '[DorkroomApiClient] Developers API response envelope invalid:',
        envelope.error
      );
      throw new Error('Invalid API response format for developers');
    }

    // Validate each item individually, filter out invalid ones
    const validItems: RawDeveloper[] = [];
    let invalidCount = 0;
    for (const item of envelope.data.data) {
      const result = rawDeveloperSchema.safeParse(item);
      if (result.success) {
        validItems.push(result.data);
      } else {
        invalidCount++;
      }
    }
    if (invalidCount > 0) {
      console.warn(
        `[DorkroomApiClient] Filtered out ${invalidCount} invalid developer(s) from API response`
      );
    }

    return validItems.map(this.transformDeveloper.bind(this));
  }

  /**
   * Fetch combinations from the API with runtime validation.
   * Invalid individual items are filtered out rather than failing the entire request.
   */
  async fetchCombinations(options?: {
    signal?: AbortSignal;
  }): Promise<Combination[]> {
    const response = await fetch(`${this.baseUrl}/combinations`, {
      signal: options?.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch combinations: ${response.statusText}`);
    }

    const json: unknown = await response.json();

    // Validate the outer envelope structure
    const envelope = envelopeSchema.safeParse(json);
    if (!envelope.success) {
      console.error(
        '[DorkroomApiClient] Combinations API response envelope invalid:',
        envelope.error
      );
      throw new Error('Invalid API response format for combinations');
    }

    // Validate each item individually, filter out invalid ones
    const validItems: RawCombination[] = [];
    let invalidCount = 0;
    for (const item of envelope.data.data) {
      const result = rawCombinationSchema.safeParse(item);
      if (result.success) {
        validItems.push(result.data);
      } else {
        invalidCount++;
      }
    }
    if (invalidCount > 0) {
      console.warn(
        `[DorkroomApiClient] Filtered out ${invalidCount} invalid combination(s) from API response`
      );
    }

    return validItems.map(this.transformCombination.bind(this));
  }

  /**
   * Transform raw film data to camelCase format
   */
  private transformFilm(raw: RawFilm): Film {
    // Parse manufacturer_notes from PostgreSQL array format string
    // Format: {"note1","note2","note3"}
    let manufacturerNotes: string[] | null = null;
    if (raw.manufacturer_notes) {
      try {
        // Remove curly braces and split by comma, handling quoted strings
        const notesStr = raw.manufacturer_notes.slice(1, -1); // Remove { }
        if (notesStr) {
          manufacturerNotes = notesStr
            .split('","')
            .map((note) => note.replace(/^"|"$/g, '').trim())
            .filter(Boolean);
        }
      } catch {
        manufacturerNotes = null;
      }
    }

    return {
      id: raw.id,
      uuid: raw.uuid,
      slug: raw.slug,
      brand: raw.brand,
      name: raw.name,
      colorType: raw.color_type,
      isoSpeed: raw.iso_speed,
      grainStructure: raw.grain_structure,
      description: raw.description,
      manufacturerNotes,
      reciprocityFailure: raw.reciprocity_failure,
      discontinued: raw.discontinued,
      staticImageUrl: raw.static_image_url,
      dateAdded: raw.date_added,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  /**
   * Transform raw developer data to camelCase format
   */
  private transformDeveloper(raw: RawDeveloper): Developer {
    return {
      id: raw.id,
      uuid: raw.uuid,
      slug: raw.slug,
      name: raw.name,
      manufacturer: raw.manufacturer,
      type: raw.type,
      description: raw.description,
      filmOrPaper: raw.film_or_paper,
      dilutions:
        raw.dilutions?.map((d) => ({
          id: String(d.id), // Convert number/string ID to string
          name: d.name || d.dilution || d.ratio || '', // Use name if available, fallback to dilution/ratio
          dilution: d.dilution || d.ratio || '', // Some API entries use 'ratio' instead of 'dilution'
        })) || [],
      mixingInstructions: raw.mixing_instructions,
      storageRequirements: raw.storage_requirements,
      safetyNotes: raw.safety_notes,
      notes: null, // Not provided by API
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  /**
   * Transform raw combination data to camelCase format
   */
  private transformCombination(raw: RawCombination): Combination {
    // Convert temperature from Celsius to Fahrenheit
    const temperatureF = Math.round((raw.temperature_celsius * 9) / 5 + 32);

    // Tags come as an array from the API
    const tags = raw.tags ?? null;

    return {
      id: raw.id,
      uuid: raw.uuid,
      name: raw.name ?? '',
      filmStockId: raw.film_stock,
      filmSlug: raw.film_stock, // API returns slug in film_stock field
      developerId: raw.developer,
      developerSlug: raw.developer, // API returns slug in developer field
      shootingIso: raw.shooting_iso,
      dilutionId: raw.dilution_id ?? null,
      customDilution: raw.custom_dilution ?? null,
      temperatureC: raw.temperature_celsius,
      temperatureF,
      timeMinutes: raw.time_minutes,
      agitationMethod: raw.agitation_method ?? '',
      agitationSchedule: null, // Not provided by current API
      pushPull: raw.push_pull,
      tags,
      notes: raw.notes ?? null,
      infoSource: raw.info_source,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}

// Default API client instance
export const apiClient = new DorkroomApiClient();

// Export convenience functions for external use
export const fetchFilms = (options?: { signal?: AbortSignal }) =>
  apiClient.fetchFilms(options);

export const fetchDevelopers = (options?: { signal?: AbortSignal }) =>
  apiClient.fetchDevelopers(options);

export const fetchCombinations = (options?: { signal?: AbortSignal }) =>
  apiClient.fetchCombinations(options);

// For TanStack Query compatibility - provide a separate export
export const fetchFilmsForQuery = (context?: { signal?: AbortSignal }) =>
  apiClient.fetchFilms(context);

export const fetchDevelopersForQuery = (context?: { signal?: AbortSignal }) =>
  apiClient.fetchDevelopers(context);

export const fetchCombinationsForQuery = (context?: { signal?: AbortSignal }) =>
  apiClient.fetchCombinations(context);
