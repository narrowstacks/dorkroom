/**
 * Main client for interacting with the Dorkroom REST API.
 *
 * This client provides methods to fetch film stocks, developers, and
 * development combinations from the Dorkroom REST API. Features:
 * - Automatic retries and timeouts with circuit breaker
 * - Indexed lookups for O(1) performance
 * - API-driven fuzzy searching with debouncing
 * - Request caching and deduplication
 * - Comprehensive error handling
 */

import {
  Film,
  Developer,
  Combination,
  DorkroomClientConfig,
  Logger,
  FuzzySearchOptions,
  ApiResponse,
  PaginatedApiResponse,
  CombinationFetchOptions,
} from './types';
import { DataFetchError, DataParseError, DataNotLoadedError } from './errors';
import {
  HTTPTransport,
  FetchHTTPTransport,
  ConsoleLogger,
  joinURL,
} from './transport';
import { debounce } from '../../utils/throttle';
import {
  getApiEndpointConfig,
  getEnvironmentConfig,
} from '../../utils/platformDetection';
import { debugLog } from '../../utils/debugLogger';
import {
  enhanceFilmResults,
  enhanceDeveloperResults,
  DEFAULT_TOKENIZED_CONFIG,
} from '../../utils/tokenizedSearch';

/**
 * Cache entry with expiration.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Request deduplication manager.
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = operation().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  cancel(key: string): void {
    this.pendingRequests.delete(key);
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

/**
 * Simple in-memory cache with TTL support.
 */
class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, value: T, ttlMs: number = 300000): void {
    // Default 5 minutes
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Main client for interacting with the Dorkroom REST API.
 */
export class DorkroomClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly transport: HTTPTransport;
  private readonly logger: Logger;
  private readonly cacheTTL: number;

  // Data cache TTL (30 minutes as requested)
  private static readonly DATA_CACHE_TTL = 1800000; // 30 minutes in milliseconds

  // Data storage
  private films: Film[] = [];
  private developers: Developer[] = [];
  private combinations: Combination[] = [];
  private loaded = false;
  private lastLoadedTimestamp: number | null = null;

  // Indexes for O(1) lookup
  private filmIndex = new Map<string, Film>();
  private developerIndex = new Map<string, Developer>();
  private combinationIndex = new Map<string, Combination>();

  // Caching and deduplication
  private searchCache = new TTLCache<any>();
  private deduplicator = new RequestDeduplicator();

  // Request cancellation
  private abortControllers = new Map<string, AbortController>();

  // Debounced search methods
  private debouncedFuzzySearchFilms: ReturnType<typeof debounce>;
  private debouncedFuzzySearchDevelopers: ReturnType<typeof debounce>;

  constructor(config: DorkroomClientConfig = {}) {
    // Use platform-aware endpoint configuration
    const apiConfig = getApiEndpointConfig();
    this.baseUrl = config.baseUrl || apiConfig.baseUrl;
    this.timeout = config.timeout || 10000; // 10 seconds
    this.cacheTTL = config.cacheTTL || 300000; // 5 minutes
    this.logger = config.logger || new ConsoleLogger();

    // Log the platform configuration for debugging
    if (config.logger || __DEV__) {
      const envConfig = getEnvironmentConfig();
      this.logger.debug(
        `Dorkroom client initialized for ${envConfig.platform} platform ` +
          `with base URL: ${this.baseUrl}`
      );
    }

    // Initialize HTTP transport
    this.transport = new FetchHTTPTransport(
      { maxRetries: config.maxRetries || 3 },
      this.logger
    );

    // Initialize debounced search methods
    this.debouncedFuzzySearchFilms = debounce(
      this.performFuzzySearchFilms.bind(this),
      config.searchDebounceMs || 300
    );

    this.debouncedFuzzySearchDevelopers = debounce(
      this.performFuzzySearchDevelopers.bind(this),
      config.searchDebounceMs || 300
    );

    // Cleanup expired cache entries periodically
    setInterval(() => {
      this.searchCache.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Check if we have internet connectivity by trying a simple network request.
   * This is used to determine if we should bypass cache when offline.
   */
  private async hasNetworkConnectivity(): Promise<boolean> {
    try {
      // Try a simple HEAD request to the API base URL with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(this.baseUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status < 500; // Even 4xx responses indicate connectivity
    } catch (error) {
      this.logger.debug(`Network connectivity check failed: ${error}`);
      return false;
    }
  }

  /**
   * Store data in persistent local cache using AsyncStorage.
   */
  private async storeLocalCache(
    films: Film[],
    developers: Developer[],
    combinations: Combination[]
  ): Promise<void> {
    try {
      const cacheData = {
        films,
        developers,
        combinations,
        timestamp: Date.now(),
      };

      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(
        'dorkroom_development_data',
        JSON.stringify(cacheData)
      );
      this.logger.debug('Data cached to local storage');
    } catch (error) {
      this.logger.warn(`Failed to store local cache: ${error}`);
    }
  }

  /**
   * Retrieve data from persistent local cache using AsyncStorage.
   */
  private async getLocalCache(): Promise<{
    films: Film[];
    developers: Developer[];
    combinations: Combination[];
    timestamp: number;
  } | null> {
    try {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      const cachedData = await AsyncStorage.getItem(
        'dorkroom_development_data'
      );

      if (!cachedData) {
        return null;
      }

      const parsed = JSON.parse(cachedData);

      // Validate cache structure
      if (
        !parsed.films ||
        !parsed.developers ||
        !parsed.combinations ||
        !parsed.timestamp
      ) {
        this.logger.warn('Invalid cache structure, ignoring');
        return null;
      }

      // Check if cache is expired (30 minutes)
      const cacheAge = Date.now() - parsed.timestamp;
      if (cacheAge > DorkroomClient.DATA_CACHE_TTL) {
        this.logger.debug(
          `Local cache expired (age: ${Math.round(cacheAge / 1000)}s), ignoring`
        );
        return null;
      }

      this.logger.debug(
        `Using local cache (age: ${Math.round(cacheAge / 1000)}s)`
      );
      return parsed;
    } catch (error) {
      this.logger.warn(`Failed to retrieve local cache: ${error}`);
      return null;
    }
  }

  /**
   * Clear the persistent local cache.
   */
  private async clearLocalCache(): Promise<void> {
    try {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('dorkroom_development_data');
      this.logger.debug('Local cache cleared');
    } catch (error) {
      this.logger.warn(`Failed to clear local cache: ${error}`);
    }
  }

  /**
   * Fetch and parse a JSON resource from the API.
   */
  private async fetch<T>(
    resource: string,
    params: URLSearchParams = new URLSearchParams(),
    requestKey?: string
  ): Promise<T[]> {
    const url = joinURL(this.baseUrl, `${resource}?${params.toString()}`);
    const cacheKey = requestKey || url;

    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${resource}`);
      return cached as T[];
    }

    // Use request deduplication
    return this.deduplicator.deduplicate(cacheKey, async () => {
      // Set up request cancellation
      const controller = new AbortController();
      if (requestKey) {
        this.abortControllers.set(requestKey, controller);
      }

      try {
        this.logger.debug(
          `Fetching ${resource} with params: ${params.toString()}`
        );
        const response = await this.transport.get(url, this.timeout);

        try {
          const apiResponse = (await response.json()) as ApiResponse<T>;
          if (apiResponse && apiResponse.data) {
            // Cache the result
            this.searchCache.set(
              cacheKey,
              apiResponse.data as any,
              this.cacheTTL
            );
            return apiResponse.data;
          }
          throw new DataParseError(
            `Invalid API response structure from ${resource}`
          );
        } catch (error) {
          throw new DataParseError(
            `Invalid JSON in ${resource}: ${error}`,
            error as Error
          );
        }
      } catch (error) {
        if (error instanceof DataParseError) {
          throw error;
        }
        throw new DataFetchError(
          `Failed to fetch ${resource}: ${error}`,
          error as Error
        );
      } finally {
        if (requestKey) {
          this.abortControllers.delete(requestKey);
        }
      }
    });
  }

  /**
   * Cancel a specific request by key.
   */
  cancelRequest(requestKey: string): void {
    const controller = this.abortControllers.get(requestKey);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestKey);
    }
    this.deduplicator.cancel(requestKey);
  }

  /**
   * Cancel all pending requests.
   */
  cancelAllRequests(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
    this.deduplicator.clear();
  }

  /**
   * Fetch and parse all JSON data, building internal indexes.
   *
   * This method must be called before using any other client methods.
   * Will use local cache if available and valid, or fetch from API if needed.
   * When offline and cache is expired, will continue using expired cache data.
   */
  async loadAll(): Promise<void> {
    // Check if we should use local cache
    const localCache = await this.getLocalCache();
    const hasNetwork = await this.hasNetworkConnectivity();

    // If we have valid local cache and either no network or data isn't expired, use cache
    if (localCache && (!hasNetwork || !this.isDataExpired())) {
      this.films = localCache.films;
      this.developers = localCache.developers;
      this.combinations = localCache.combinations;
      this.buildIndexes();
      this.loaded = true;
      this.lastLoadedTimestamp = localCache.timestamp;

      this.logger.debug(
        `Using local cache data (${this.films.length} films, ${this.developers.length} developers, ${this.combinations.length} combinations)`
      );
      return;
    }

    // If we have network but cache is expired, try to fetch fresh data
    if (hasNetwork) {
      try {
        await this.performLoad();
        return;
      } catch (error) {
        this.logger.warn(
          `Failed to fetch fresh data, falling back to local cache if available: ${error}`
        );

        // If API fails but we have local cache (even if expired), use it
        if (localCache) {
          this.films = localCache.films;
          this.developers = localCache.developers;
          this.combinations = localCache.combinations;
          this.buildIndexes();
          this.loaded = true;
          this.lastLoadedTimestamp = localCache.timestamp;

          this.logger.info('Using expired local cache due to API failure');
          return;
        }

        // No cache available, re-throw the error
        throw error;
      }
    }

    // No network and no cache - this is an error state
    if (!localCache) {
      throw new DataFetchError(
        'No network connectivity and no local cache available'
      );
    }

    // Use expired cache when offline
    this.films = localCache.films;
    this.developers = localCache.developers;
    this.combinations = localCache.combinations;
    this.buildIndexes();
    this.loaded = true;
    this.lastLoadedTimestamp = localCache.timestamp;

    this.logger.info(
      'Using expired local cache due to no network connectivity'
    );
  }

  /**
   * Force reload all data from the API, bypassing cache.
   * This method will clear local cache and always fetch fresh data.
   */
  async forceReload(): Promise<void> {
    this.logger.info('Force reloading data from API');

    // Clear local cache when force reloading
    await this.clearLocalCache();

    await this.performLoad();
  }

  /**
   * Internal method to perform the actual data loading.
   */
  private async performLoad(): Promise<void> {
    try {
      // Fetch all data in parallel
      debugLog('[DorkroomClient] Starting parallel data fetch...');
      const [rawFilms, rawDevelopers, rawCombinations] = await Promise.all([
        this.fetch<Film>('films'),
        this.fetch<Developer>('developers'),
        this.fetch<any>('combinations'),
      ]);

      debugLog('[DorkroomClient] Raw data fetched:', {
        films: rawFilms.length,
        developers: rawDevelopers.length,
        combinations: rawCombinations.length,
      });

      // Log sample raw data to understand structure
      if (rawFilms.length > 0) {
        debugLog('[DorkroomClient] Sample raw film data:', rawFilms[0]);
      }
      if (rawDevelopers.length > 0) {
        debugLog(
          '[DorkroomClient] Sample raw developer data:',
          rawDevelopers[0]
        );
      }

      // Build quick-lookup maps (slug -> uuid) for films & developers
      const filmSlugToUuid = new Map<string, string>();
      rawFilms.forEach((f) => {
        if (f.slug) filmSlugToUuid.set(f.slug, f.uuid);
      });
      const developerSlugToUuid = new Map<string, string>();
      rawDevelopers.forEach((d) => {
        if (d.slug) developerSlugToUuid.set(d.slug, d.uuid);
      });

      // Transform films from API response format to match TypeScript interface
      this.films = rawFilms.map(
        (rawFilm: any): Film => ({
          id: rawFilm.id || rawFilm.uuid,
          uuid: rawFilm.uuid,
          slug: rawFilm.slug,
          name: rawFilm.name,
          brand: rawFilm.brand,
          isoSpeed: rawFilm.iso_speed || rawFilm.isoSpeed,
          colorType: rawFilm.color_type || rawFilm.colorType,
          description: rawFilm.description,
          discontinued: rawFilm.discontinued ? 1 : 0,
          manufacturerNotes:
            this.parseManufacturerNotes(rawFilm.manufacturer_notes) ||
            rawFilm.manufacturerNotes ||
            [],
          manufacturer_notes:
            this.parseManufacturerNotes(rawFilm.manufacturer_notes) ||
            rawFilm.manufacturerNotes ||
            [],
          grainStructure: rawFilm.grain_structure || rawFilm.grainStructure,
          reciprocityFailure:
            rawFilm.reciprocity_failure || rawFilm.reciprocityFailure,
          staticImageURL: rawFilm.static_image_url || rawFilm.staticImageURL,
          dateAdded:
            rawFilm.date_added || rawFilm.dateAdded || rawFilm.created_at,
        })
      );

      // Transform developers from API response format to match TypeScript interface
      this.developers = rawDevelopers.map(
        (rawDev: any): Developer => ({
          id: rawDev.id || rawDev.uuid,
          uuid: rawDev.uuid,
          slug: rawDev.slug,
          name: rawDev.name,
          manufacturer: rawDev.manufacturer,
          type: rawDev.type,
          // Convert boolean film_or_paper to string filmOrPaper
          filmOrPaper:
            rawDev.film_or_paper === true
              ? 'film'
              : rawDev.film_or_paper === false
              ? 'paper'
              : rawDev.filmOrPaper || 'film',
          dilutions: rawDev.dilutions || [],
          workingLifeHours:
            rawDev.working_life_hours || rawDev.workingLifeHours,
          stockLifeMonths: rawDev.stock_life_months || rawDev.stockLifeMonths,
          notes: rawDev.notes,
          discontinued: rawDev.discontinued ? 1 : 0,
          mixingInstructions:
            rawDev.mixing_instructions || rawDev.mixingInstructions,
          safetyNotes: rawDev.safety_notes || rawDev.safetyNotes,
          datasheetUrl: Array.isArray(rawDev.datasheet_url)
            ? rawDev.datasheet_url
            : rawDev.datasheetUrl || [],
          dateAdded: rawDev.date_added || rawDev.dateAdded || rawDev.created_at,
        })
      );

      debugLog('[DorkroomClient] Transformed data:', {
        films: this.films.length,
        developers: this.developers.length,
      });

      // Log sample transformed data
      if (this.films.length > 0) {
        debugLog('[DorkroomClient] Sample transformed film:', this.films[0]);
      }
      if (this.developers.length > 0) {
        debugLog(
          '[DorkroomClient] Sample transformed developer:',
          this.developers[0]
        );
      }

      // Normalise combinations coming from the API so they match our
      // internal Combination camel-cased shape & use UUID references.
      this.combinations = (rawCombinations as any[]).map((c) => {
        // Map film/developer slugs to UUIDs when available
        const filmUuid =
          filmSlugToUuid.get(c.film_stock ?? c.film_stock_id) ??
          c.filmStockId ??
          c.film_stock ??
          c.film_stock_id;
        const developerUuid =
          developerSlugToUuid.get(c.developer ?? c.developer_id) ??
          c.developerId ??
          c.developer ??
          c.developer_id;

        // Temperature – API may send °C, convert to °F if °F not provided
        let temperatureF: number | undefined = c.temperature_f;
        if (temperatureF === undefined && c.temperature_celsius !== undefined) {
          temperatureF = Math.round((c.temperature_celsius * 9) / 5 + 32);
        }

        return {
          id: String(c.id),
          uuid: c.uuid ?? String(c.id),
          slug: c.slug ?? c.uuid ?? String(c.id),
          name: c.name ?? '',
          filmStockId: filmUuid,
          developerId: developerUuid,
          temperatureF: temperatureF ?? 68, // default to room temp if missing
          timeMinutes: c.time_minutes ?? c.timeMinutes ?? 0,
          shootingIso: c.shooting_iso ?? c.shootingIso ?? 0,
          pushPull: c.push_pull ?? c.pushPull ?? 0,
          agitationSchedule: c.agitation_method ?? c.agitationSchedule,
          notes: c.notes,
          dilutionId: c.dilution_id
            ? parseInt(String(c.dilution_id), 10)
            : c.dilutionId,
          customDilution: c.custom_dilution ?? c.customDilution ?? null,
          dateAdded: c.created_at ?? c.dateAdded ?? new Date().toISOString(),
        } as Combination;
      });

      // Build indexes for fast look-ups
      this.buildIndexes();

      this.loaded = true;
      this.lastLoadedTimestamp = Date.now();

      // Store data in local cache for future use
      await this.storeLocalCache(
        this.films,
        this.developers,
        this.combinations
      );

      debugLog('[DorkroomClient] Data loading completed successfully:', {
        films: this.films.length,
        developers: this.developers.length,
        combinations: this.combinations.length,
        loaded: this.loaded,
      });

      this.logger.info(
        `Loaded ${this.films.length} films, ` +
          `${this.developers.length} developers, ` +
          `${this.combinations.length} combinations.`
      );
    } catch (error) {
      this.logger.error(`Failed to load data: ${error}`);
      throw error;
    }
  }

  /**
   * Parse PostgreSQL array format string to JavaScript array
   */
  private parseManufacturerNotes(notes: any): string[] | null {
    if (Array.isArray(notes)) {
      debugLog('[DorkroomClient] Manufacturer notes already an array:', notes);
      return notes;
    }

    if (typeof notes === 'string') {
      try {
        // Handle PostgreSQL array format: {"item1","item2","item3"}
        if (notes.startsWith('{') && notes.endsWith('}')) {
          debugLog('[DorkroomClient] Parsing PostgreSQL array format:', notes);

          // Remove outer braces and split by comma
          const inner = notes.slice(1, -1);
          if (inner.trim() === '') {
            debugLog('[DorkroomClient] Empty array detected');
            return [];
          }

          // Parse quoted items, handling escaped quotes
          const items: string[] = [];
          let current = '';
          let inQuotes = false;
          let escaped = false;

          for (let i = 0; i < inner.length; i++) {
            const char = inner[i];

            if (escaped) {
              current += char;
              escaped = false;
              continue;
            }

            if (char === '\\') {
              escaped = true;
              continue;
            }

            if (char === '"') {
              inQuotes = !inQuotes;
              continue;
            }

            if (char === ',' && !inQuotes) {
              items.push(current.trim());
              current = '';
              continue;
            }

            current += char;
          }

          if (current.trim()) {
            items.push(current.trim());
          }

          debugLog(
            '[DorkroomClient] Successfully parsed manufacturer notes:',
            items
          );
          return items;
        } else {
          debugLog(
            '[DorkroomClient] String format not recognized as PostgreSQL array:',
            notes
          );
        }
      } catch (error) {
        debugLog('[DorkroomClient] Failed to parse manufacturer notes:', error);
        return null;
      }
    }

    debugLog(
      '[DorkroomClient] Manufacturer notes not a string or array:',
      typeof notes,
      notes
    );
    return null;
  }

  /**
   * Build internal indexes for O(1) lookups.
   */
  private buildIndexes(): void {
    this.filmIndex.clear();
    this.developerIndex.clear();
    this.combinationIndex.clear();

    for (const film of this.films) {
      this.filmIndex.set(film.uuid, film);
    }

    for (const developer of this.developers) {
      this.developerIndex.set(developer.uuid, developer);
    }

    for (const combination of this.combinations) {
      this.combinationIndex.set(combination.uuid, combination);
    }
  }

  /**
   * Check if the cached data has expired (older than 30 minutes).
   */
  isDataExpired(): boolean {
    if (!this.loaded || this.lastLoadedTimestamp === null) {
      return true;
    }
    return (
      Date.now() - this.lastLoadedTimestamp > DorkroomClient.DATA_CACHE_TTL
    );
  }

  /**
   * Get the age of cached data in milliseconds.
   */
  getCacheAge(): number {
    if (!this.loaded || this.lastLoadedTimestamp === null) {
      return 0;
    }
    return Date.now() - this.lastLoadedTimestamp;
  }

  /**
   * Ensure data has been loaded before performing operations.
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      throw new DataNotLoadedError();
    }
  }

  /**
   * Get a film by its UUID.
   */
  getFilm(filmId: string): Film | undefined {
    this.ensureLoaded();
    return this.filmIndex.get(filmId);
  }

  /**
   * Get a developer by its UUID.
   */
  getDeveloper(developerId: string): Developer | undefined {
    this.ensureLoaded();
    return this.developerIndex.get(developerId);
  }

  /**
   * Get a combination by its UUID.
   */
  getCombination(combinationId: string): Combination | undefined {
    this.ensureLoaded();
    return this.combinationIndex.get(combinationId);
  }

  /**
   * Get all films.
   */
  getAllFilms(): Film[] {
    this.ensureLoaded();
    return [...this.films];
  }

  /**
   * Get all developers.
   */
  getAllDevelopers(): Developer[] {
    this.ensureLoaded();
    return [...this.developers];
  }

  /**
   * Get all combinations.
   */
  getAllCombinations(): Combination[] {
    this.ensureLoaded();
    return [...this.combinations];
  }

  /**
   * Get all development combinations for a specific film.
   */
  getCombinationsForFilm(filmId: string): Combination[] {
    this.ensureLoaded();
    return this.combinations.filter((c) => c.filmStockId === filmId);
  }

  /**
   * Get all development combinations for a specific developer.
   */
  getCombinationsForDeveloper(developerId: string): Combination[] {
    this.ensureLoaded();
    return this.combinations.filter((c) => c.developerId === developerId);
  }

  /**
   * Fetch combinations with server-side filtering for better performance.
   * This method leverages the Supabase edge function's filtering capabilities.
   */
  async fetchCombinations(
    options: CombinationFetchOptions = {}
  ): Promise<PaginatedApiResponse<Combination>> {
    const params = new URLSearchParams();

    if (options.filmSlug) {
      params.set('film', options.filmSlug);
    }

    if (options.developerSlug) {
      params.set('developer', options.developerSlug);
    }

    if (options.count && options.count > 0) {
      params.set('count', options.count.toString());
    }

    if (options.page && options.page > 0) {
      params.set('page', options.page.toString());
    }

    if (options.id) {
      params.set('id', options.id);
    }

    const requestKey = `combinations-${params.toString()}`;

    // Check cache first
    const cached = this.searchCache.get(requestKey);
    if (cached) {
      return cached;
    }

    // Use deduplication for concurrent requests
    return this.deduplicator.deduplicate(requestKey, async () => {
      try {
        const response = await this.transport.get(
          joinURL(this.baseUrl, `combinations?${params.toString()}`),
          this.timeout
        );

        const data = await response.json();

        // Handle single record response (when querying by ID)
        if (
          options.id &&
          data &&
          typeof data === 'object' &&
          !Array.isArray(data.data)
        ) {
          const result: PaginatedApiResponse<Combination> = {
            data: data ? [data] : [],
            count: data ? 1 : 0,
            filters: {
              film: options.filmSlug,
              developer: options.developerSlug,
            },
          };

          // Cache the result
          this.searchCache.set(requestKey, result, this.cacheTTL);
          return result;
        }

        // Handle paginated/filtered response
        const result: PaginatedApiResponse<Combination> = {
          data: data.data || [],
          count: data.count || null,
          page: data.page,
          perPage: data.perPage,
          filters: data.filters || {
            film: options.filmSlug,
            developer: options.developerSlug,
          },
        };

        // Cache the result
        this.searchCache.set(requestKey, result, this.cacheTTL);
        return result;
      } catch (error) {
        this.logger.error(
          `Failed to fetch combinations with options ${JSON.stringify(
            options
          )}: ${error}`
        );
        throw new DataFetchError(
          `Failed to fetch combinations: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    });
  }

  /**
   * Get combinations for a specific film using server-side filtering.
   * More efficient than client-side filtering for large datasets.
   */
  async getCombinationsForFilmSlug(filmSlug: string): Promise<Combination[]> {
    const response = await this.fetchCombinations({ filmSlug });
    return response.data;
  }

  /**
   * Get combinations for a specific developer using server-side filtering.
   * More efficient than client-side filtering for large datasets.
   */
  async getCombinationsForDeveloperSlug(
    developerSlug: string
  ): Promise<Combination[]> {
    const response = await this.fetchCombinations({ developerSlug });
    return response.data;
  }

  /**
   * Get combinations for both a specific film and developer using server-side filtering.
   * Most efficient way to find combinations for a specific film+developer pair.
   */
  async getCombinationsForFilmAndDeveloper(
    filmSlug: string,
    developerSlug: string
  ): Promise<Combination[]> {
    const response = await this.fetchCombinations({ filmSlug, developerSlug });
    return response.data;
  }

  /**
   * Get a single combination by its UUID using server-side filtering.
   * More efficient than loading all combinations when you only need one.
   */
  async getCombinationById(id: string): Promise<Combination | null> {
    const response = await this.fetchCombinations({ id });
    return response.data.length > 0 ? response.data[0] : null;
  }

  /**
   * Get paginated combinations with optional filtering.
   * Useful for implementing pagination in UI components.
   */
  async getPaginatedCombinations(
    page: number = 1,
    count: number = 25,
    filters?: { filmSlug?: string; developerSlug?: string }
  ): Promise<PaginatedApiResponse<Combination>> {
    const options: CombinationFetchOptions = {
      page,
      count,
      ...filters,
    };

    return this.fetchCombinations(options);
  }

  /**
   * Search films by name or brand using substring matching.
   */
  searchFilms(query: string, colorType?: string): Film[] {
    this.ensureLoaded();
    const lowerQuery = query.toLowerCase().trim();

    // Return empty array for empty queries
    if (!lowerQuery) {
      return [];
    }

    return this.films.filter((film) => {
      const matchesQuery =
        film.name.toLowerCase().includes(lowerQuery) ||
        film.brand.toLowerCase().includes(lowerQuery);

      const matchesColorType = !colorType || film.colorType === colorType;

      return matchesQuery && matchesColorType;
    });
  }

  /**
   * Search developers by manufacturer or name using substring matching.
   */
  searchDevelopers(query: string, type?: string): Developer[] {
    this.ensureLoaded();
    const lowerQuery = query.toLowerCase().trim();

    // Return empty array for empty queries
    if (!lowerQuery) {
      return [];
    }

    return this.developers.filter((developer) => {
      const matchesQuery =
        developer.name.toLowerCase().includes(lowerQuery) ||
        developer.manufacturer.toLowerCase().includes(lowerQuery);

      const matchesType = !type || developer.type === type;

      return matchesQuery && matchesType;
    });
  }

  /**
   * Internal method for performing fuzzy search on films.
   * Now enhanced with tokenization post-processing for better relevance.
   */
  private async performFuzzySearchFilms(
    query: string,
    options: FuzzySearchOptions = {}
  ): Promise<Film[]> {
    const params = new URLSearchParams({
      query,
      fuzzy: 'true',
    });

    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    const requestKey = `fuzzy-films-${query}-${JSON.stringify(options)}`;

    // Get raw fuzzy results from API
    const rawResults = await this.fetch<Film>('films', params, requestKey);

    // Apply tokenization post-processing to improve relevance
    const enhancedResults = enhanceFilmResults(
      query,
      rawResults,
      DEFAULT_TOKENIZED_CONFIG
    );

    // Extract just the film items from the scored results
    const processedResults = enhancedResults.map((result) => result.item);

    // Apply original limit if specified, since tokenization filtering might change count
    if (options.limit && processedResults.length > options.limit) {
      return processedResults.slice(0, options.limit);
    }

    return processedResults;
  }

  /**
   * Internal method for performing fuzzy search on developers.
   * Now enhanced with tokenization post-processing for better relevance.
   */
  private async performFuzzySearchDevelopers(
    query: string,
    options: FuzzySearchOptions = {}
  ): Promise<Developer[]> {
    const params = new URLSearchParams({
      query,
      fuzzy: 'true',
    });

    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    const requestKey = `fuzzy-developers-${query}-${JSON.stringify(options)}`;

    // Get raw fuzzy results from API
    const rawResults = await this.fetch<Developer>(
      'developers',
      params,
      requestKey
    );

    // Apply tokenization post-processing to improve relevance
    const enhancedResults = enhanceDeveloperResults(
      query,
      rawResults,
      DEFAULT_TOKENIZED_CONFIG
    );

    // Extract just the developer items from the scored results
    const processedResults = enhancedResults.map((result) => result.item);

    // Apply original limit if specified, since tokenization filtering might change count
    if (options.limit && processedResults.length > options.limit) {
      return processedResults.slice(0, options.limit);
    }

    return processedResults;
  }

  /**
   * Fuzzy search for films by name, brand, and description via the API.
   * This method is debounced to prevent excessive API calls.
   */
  async fuzzySearchFilms(
    query: string,
    options: FuzzySearchOptions = {}
  ): Promise<Film[]> {
    return new Promise((resolve, reject) => {
      this.debouncedFuzzySearchFilms(query, options)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Fuzzy search for developers by manufacturer, name, and notes via the API.
   * This method is debounced to prevent excessive API calls.
   */
  async fuzzySearchDevelopers(
    query: string,
    options: FuzzySearchOptions = {}
  ): Promise<Developer[]> {
    return new Promise((resolve, reject) => {
      this.debouncedFuzzySearchDevelopers(query, options)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Flush pending debounced search requests immediately.
   */
  flushPendingSearches(): void {
    this.debouncedFuzzySearchFilms.flush();
    this.debouncedFuzzySearchDevelopers.flush();
  }

  /**
   * Cancel pending debounced search requests.
   */
  cancelPendingSearches(): void {
    this.debouncedFuzzySearchFilms.cancel();
    this.debouncedFuzzySearchDevelopers.cancel();
  }

  /**
   * Get statistics about the loaded data.
   */
  getStats(): {
    films: number;
    developers: number;
    combinations: number;
    cacheSize: number;
    pendingRequests: number;
  } {
    this.ensureLoaded();
    return {
      films: this.films.length,
      developers: this.developers.length,
      combinations: this.combinations.length,
      cacheSize: this.searchCache.size(),
      pendingRequests: this.abortControllers.size,
    };
  }

  /**
   * Clear all caches and cancel pending requests.
   */
  clearCache(): void {
    this.searchCache.clear();
    this.cancelAllRequests();
    this.cancelPendingSearches();
  }

  /**
   * Check if data has been loaded.
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get transport layer status for monitoring.
   */
  getTransportStatus(): { circuitBreakerState?: string } {
    const transport = this.transport as FetchHTTPTransport;
    return {
      circuitBreakerState: transport.getCircuitBreakerState?.(),
    };
  }

  /**
   * Reset the client state (useful for testing).
   */
  reset(): void {
    this.films = [];
    this.developers = [];
    this.combinations = [];
    this.filmIndex.clear();
    this.developerIndex.clear();
    this.combinationIndex.clear();
    this.loaded = false;
    this.lastLoadedTimestamp = null;
    this.clearCache();

    // Reset transport layer if possible
    const transport = this.transport as FetchHTTPTransport;
    if (transport.resetCircuitBreaker) {
      transport.resetCircuitBreaker();
    }
  }
}
