import { HttpTransport } from './transport';
import {
  Film,
  Developer,
  Combination,
  RawFilm,
  RawDeveloper,
  RawCombination,
  DorkroomApiError,
  FilmsApiResponse,
  DevelopersApiResponse,
  CombinationsApiResponse,
  FetchFilmsOptions,
  FetchDevelopersOptions,
  FetchCombinationsOptions,
} from './types';

export interface DorkroomClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  cacheExpiryMs?: number;
}

const DEFAULT_OPTIONS: Required<DorkroomClientOptions> = {
  baseUrl: 'https://dorkroom.art/api',
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
   * Load all data from the API endpoints.
   *
   * @returns Promise that resolves after films, developers, and combinations are cached
   * @throws DorkroomApiError when any dataset fails to load
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
   * Force reload all data, ignoring cache.
   *
   * @returns Promise that resolves after cached data has been refreshed
   */
  async forceReload(): Promise<void> {
    this.clearCache();
    await this.loadAll();
  }

  /**
   * Check if cached data has expired.
   *
   * @returns True when the cached data is unavailable or past the configured expiry
   */
  isDataExpired(): boolean {
    if (!this.lastLoadTime) return true;
    return Date.now() - this.lastLoadTime > this.options.cacheExpiryMs;
  }

  /**
   * Get all films (returns cached data if available).
   *
   * @returns Cached film list
   * @throws DorkroomApiError when films have not been loaded via {@link loadAll}
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
   * Get all developers (returns cached data if available).
   *
   * @returns Cached developer list
   * @throws DorkroomApiError when developers have not been loaded via {@link loadAll}
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
   * Get all combinations (returns cached data if available).
   *
   * @returns Cached combination list
   * @throws DorkroomApiError when combinations have not been loaded via {@link loadAll}
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
   * Clear all cached data.
   *
   * @returns void
   */
  private clearCache(): void {
    this.filmsCache = null;
    this.developersCache = null;
    this.combinationsCache = null;
    this.lastLoadTime = null;
  }

  /**
   * Fetch films with optional filtering and pagination.
   * This method does not require calling loadAll() first.
   *
   * @param options - Optional filtering and pagination parameters
   * @returns Promise resolving to films API response with data and count
   * @throws DorkroomApiError when the request fails
   */
  async fetchFilmsOnDemand(
    options?: FetchFilmsOptions
  ): Promise<FilmsApiResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.query) params.append('query', options.query);
      if (options?.fuzzy) params.append('fuzzy', 'true');
      if (options?.colorType) params.append('color_type', options.colorType);
      if (options?.brand) params.append('brand', options.brand);

      const queryString = params.toString();
      const endpoint = `/films${queryString ? `?${queryString}` : ''}`;

      const response = await this.transport.get<{
        data: RawFilm[];
        count: number;
      }>(endpoint);

      return {
        data: response.data.map(this.transformFilm.bind(this)),
        count: response.count,
      };
    } catch (error) {
      throw new DorkroomApiError(
        `Failed to fetch films: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Fetch a single film by slug.
   * This method does not require calling loadAll() first.
   *
   * @param slug - Film slug (e.g., "kodak-tri-x-400")
   * @returns Promise resolving to Film or null if not found
   * @throws DorkroomApiError when the request fails
   */
  async fetchFilmBySlug(slug: string): Promise<Film | null> {
    const response = await this.fetchFilmsOnDemand({ query: slug, limit: 1 });
    const film = response.data.find((f) => f.slug === slug);
    return film || null;
  }

  /**
   * Fetch developers with optional filtering and pagination.
   * This method does not require calling loadAll() first.
   *
   * @param options - Optional filtering and pagination parameters
   * @returns Promise resolving to developers API response with data and count
   * @throws DorkroomApiError when the request fails
   */
  async fetchDevelopersOnDemand(
    options?: FetchDevelopersOptions
  ): Promise<DevelopersApiResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.query) params.append('query', options.query);
      if (options?.fuzzy) params.append('fuzzy', 'true');
      if (options?.type) params.append('type', options.type);
      if (options?.manufacturer)
        params.append('manufacturer_name', options.manufacturer);

      const queryString = params.toString();
      const endpoint = `/developers${queryString ? `?${queryString}` : ''}`;

      const response = await this.transport.get<{
        data: RawDeveloper[];
        count: number;
      }>(endpoint);

      return {
        data: response.data.map(this.transformDeveloper.bind(this)),
        count: response.count,
      };
    } catch (error) {
      throw new DorkroomApiError(
        `Failed to fetch developers: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Fetch a single developer by slug.
   * This method does not require calling loadAll() first.
   *
   * @param slug - Developer slug (e.g., "kodak-d76")
   * @returns Promise resolving to Developer or null if not found
   * @throws DorkroomApiError when the request fails
   */
  async fetchDeveloperBySlug(slug: string): Promise<Developer | null> {
    const response = await this.fetchDevelopersOnDemand({
      query: slug,
      limit: 1,
    });
    const developer = response.data.find((d) => d.slug === slug);
    return developer || null;
  }

  /**
   * Fetch combinations with optional filtering and pagination.
   * This method does not require calling loadAll() first.
   *
   * @param options - Optional filtering and pagination parameters
   * @returns Promise resolving to combinations API response with data and count
   * @throws DorkroomApiError when the request fails
   */
  async fetchCombinationsOnDemand(
    options?: FetchCombinationsOptions
  ): Promise<CombinationsApiResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.query) params.append('query', options.query);
      if (options?.fuzzy) params.append('fuzzy', 'true');
      if (options?.film) params.append('film_stock', options.film);
      if (options?.developer) params.append('developer', options.developer);
      if (options?.count) params.append('count', String(options.count));
      if (options?.page) params.append('page', String(options.page));
      if (options?.id) params.append('id', String(options.id));

      const queryString = params.toString();
      const endpoint = `/combinations${queryString ? `?${queryString}` : ''}`;

      const response = await this.transport.get<{
        data: RawCombination[];
        count: number;
      }>(endpoint);

      return {
        data: response.data.map(this.transformCombination.bind(this)),
        count: response.count,
      };
    } catch (error) {
      throw new DorkroomApiError(
        `Failed to fetch combinations: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Fetch films from the API.
   *
   * @returns Promise resolving to normalized film entities
   */
  private async fetchFilms(): Promise<Film[]> {
    const response = await this.transport.get<{
      data: RawFilm[];
      count: number;
    }>('/films');
    return response.data.map(this.transformFilm.bind(this));
  }

  /**
   * Fetch developers from the API.
   *
   * @returns Promise resolving to normalized developer entities
   */
  private async fetchDevelopers(): Promise<Developer[]> {
    const response = await this.transport.get<{
      data: RawDeveloper[];
      count: number;
    }>('/developers');

    return response.data.map(this.transformDeveloper.bind(this));
  }

  /**
   * Fetch combinations from the API.
   *
   * @returns Promise resolving to normalized combination entities
   */
  private async fetchCombinations(): Promise<Combination[]> {
    const response = await this.transport.get<{
      data: RawCombination[];
      count: number;
    }>('/combinations');
    return response.data.map(this.transformCombination.bind(this));
  }

  /**
   * Transform raw film data to camelCase format.
   *
   * @param raw - Film payload returned by the API
   * @returns Film entity with camelCase properties
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
   * Transform raw developer data to camelCase format.
   *
   * @param raw - Developer payload returned by the API
   * @returns Developer entity with camelCase properties
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
   * Transform raw combination data to camelCase format.
   *
   * @param raw - Combination payload returned by the API
   * @returns Combination entity with camelCase properties
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
