import { HttpTransport } from './transport';
import {
  Film,
  Developer,
  Combination,
  RawFilm,
  RawDeveloper,
  RawCombination,
  DorkroomApiError,
} from './types';

export interface DorkroomClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  cacheExpiryMs?: number;
}

const DEFAULT_OPTIONS: Required<DorkroomClientOptions> = {
  baseUrl: 'https://beta.dorkroom.art/api',
  timeout: 10000,
  retries: 3,
  cacheExpiryMs: 5 * 60 * 1000, // 5 minutes
};

export class DorkroomClient {
  private transport: HttpTransport;
  private options: Required<DorkroomClientOptions>;

  // Data cache
  private filmsCache: Film[] | null = null;
  private developersCache: Developer[] | null = null;
  private combinationsCache: Combination[] | null = null;
  private lastLoadTime: number | null = null;

  constructor(options?: DorkroomClientOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.transport = new HttpTransport(this.options.baseUrl, {
      timeout: this.options.timeout,
      retries: this.options.retries,
    });
  }

  /**
   * Load all data from the API endpoints
   */
  async loadAll(): Promise<void> {
    try {
      // Load all data in parallel
      const [filmsData, developersData, combinationsData] = await Promise.all([
        this.fetchFilms(),
        this.fetchDevelopers(),
        this.fetchCombinations(),
      ]);

      this.filmsCache = filmsData;
      this.developersCache = developersData;
      this.combinationsCache = combinationsData;
      this.lastLoadTime = Date.now();
    } catch (error) {
      throw new DorkroomApiError(
        `Failed to load data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Force reload all data, ignoring cache
   */
  async forceReload(): Promise<void> {
    this.clearCache();
    await this.loadAll();
  }

  /**
   * Check if cached data has expired
   */
  isDataExpired(): boolean {
    if (!this.lastLoadTime) return true;
    return Date.now() - this.lastLoadTime > this.options.cacheExpiryMs;
  }

  /**
   * Get all films (returns cached data if available)
   */
  getAllFilms(): Film[] {
    if (!this.filmsCache) {
      throw new DorkroomApiError(
        'Films data not loaded. Call loadAll() first.'
      );
    }
    return [...this.filmsCache];
  }

  /**
   * Get all developers (returns cached data if available)
   */
  getAllDevelopers(): Developer[] {
    if (!this.developersCache) {
      throw new DorkroomApiError(
        'Developers data not loaded. Call loadAll() first.'
      );
    }
    return [...this.developersCache];
  }

  /**
   * Get all combinations (returns cached data if available)
   */
  getAllCombinations(): Combination[] {
    if (!this.combinationsCache) {
      throw new DorkroomApiError(
        'Combinations data not loaded. Call loadAll() first.'
      );
    }
    return [...this.combinationsCache];
  }

  /**
   * Clear all cached data
   */
  private clearCache(): void {
    this.filmsCache = null;
    this.developersCache = null;
    this.combinationsCache = null;
    this.lastLoadTime = null;
  }

  /**
   * Fetch films from the API
   */
  private async fetchFilms(): Promise<Film[]> {
    const response = await this.transport.get<{
      data: RawFilm[];
      count: number;
    }>('/films');
    return response.data.map(this.transformFilm.bind(this));
  }

  /**
   * Fetch developers from the API
   */
  private async fetchDevelopers(): Promise<Developer[]> {
    const response = await this.transport.get<{
      data: RawDeveloper[];
      count: number;
    }>('/developers');
    return response.data.map(this.transformDeveloper.bind(this));
  }

  /**
   * Fetch combinations from the API
   */
  private async fetchCombinations(): Promise<Combination[]> {
    const response = await this.transport.get<{
      data: RawCombination[];
      count: number;
    }>('/combinations');
    return response.data.map(this.transformCombination.bind(this));
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
      dilutions: raw.dilutions.map((d) => ({
        id: d.id,
        name: d.dilution, // Use dilution as name if no separate name field
        dilution: d.dilution,
      })),
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
      dilutionId: raw.dilution_id,
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
