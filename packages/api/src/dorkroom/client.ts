import type {
  Combination,
  Developer,
  Film,
  RawCombination,
  RawDeveloper,
  RawFilm,
} from './types';

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
   * Fetch films from the API
   */
  async fetchFilms(options?: { signal?: AbortSignal }): Promise<Film[]> {
    const response = await fetch(`${this.baseUrl}/films`, {
      signal: options?.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch films: ${response.statusText}`);
    }
    const data = (await response.json()) as { data: RawFilm[] };
    return data.data.map(this.transformFilm.bind(this));
  }

  /**
   * Fetch developers from the API
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
    const data = (await response.json()) as { data: RawDeveloper[] };
    return data.data.map(this.transformDeveloper.bind(this));
  }

  /**
   * Fetch combinations from the API
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
    const data = (await response.json()) as { data: RawCombination[] };
    return data.data.map(this.transformCombination.bind(this));
  }

  /**
   * Transform raw film data to camelCase format
   */
  private transformFilm(raw: RawFilm): Film {
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
      manufacturerNotes: raw.manufacturer_notes,
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
          id: String(d.id), // Convert number ID to string
          name: d.name || d.dilution, // Use name if available, fallback to dilution
          dilution: d.dilution,
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

    // Parse tags if they're a string
    let tags: string[] | null = null;
    if (raw.tags) {
      if (typeof raw.tags === 'string') {
        tags = raw.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      } else if (Array.isArray(raw.tags)) {
        tags = raw.tags;
      }
    }

    return {
      id: raw.id,
      uuid: raw.uuid,
      name: raw.name,
      filmStockId: raw.film_stock,
      filmSlug: raw.film_stock, // API returns slug in film_stock field
      developerId: raw.developer,
      developerSlug: raw.developer, // API returns slug in developer field
      shootingIso: raw.shooting_iso,
      dilutionId: raw.dilution_id ? String(raw.dilution_id) : null,
      customDilution: null, // Not provided by current API
      temperatureC: raw.temperature_celsius,
      temperatureF,
      timeMinutes: raw.time_minutes,
      agitationMethod: raw.agitation_method,
      agitationSchedule: null, // Not provided by current API
      pushPull: raw.push_pull,
      tags,
      notes: null, // Not provided by current API
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
