import { z } from 'zod';
import {
  rawCombinationSchema,
  rawDeveloperSchema,
  rawFilmSchema,
  statsSchema,
} from './schemas';
import type {
  Combination,
  Developer,
  Film,
  RawCombination,
  RawDeveloper,
  RawFilm,
  Stats,
} from './types';
import { DorkroomApiError } from './types';

/**
 * Minimal envelope schema - validates only that the response has a data array.
 * Individual items are validated separately to allow graceful filtering.
 */
const envelopeSchema = z.object({
  data: z.array(z.unknown()),
  count: z.number().optional(),
});

/**
 * Public API base URL — use this when building external applications.
 * Requires an API key via the `apiKey` config option.
 */
export const PUBLIC_API_BASE_URL = 'https://api.dorkroom.art';

/**
 * Internal API base URL — same-origin relative path used by the dorkroom.art app.
 * @internal
 */
export const INTERNAL_API_BASE_URL = '/api';

/**
 * @internal Alias kept for backwards compatibility within the monorepo.
 */
export const DEFAULT_BASE_URL = INTERNAL_API_BASE_URL;

/**
 * Configuration for DorkroomApiClient.
 */
export interface DorkroomApiClientConfig {
  /** API base URL. Defaults to PUBLIC_API_BASE_URL for external consumers. */
  baseUrl?: string;
  /** API key sent as X-API-Key header. Required for api.dorkroom.art. */
  apiKey?: string;
  /**
   * Opaque per-install identity sent as X-Client-Id; enables per-client rate
   * limits on the shared key.
   */
  clientId?: string;
  /**
   * Called when a collection response contained rows that failed validation
   * and were dropped. Lets callers surface partial data (telemetry, a banner)
   * instead of relying on the `console.warn`. Optional; omit to ignore.
   */
  onInvalidRows?: (info: InvalidRowsInfo) => void;
}

/** Collection endpoints that validate and drop rows individually. */
export type CollectionResource = 'films' | 'developers' | 'combinations';

/** Row nouns for the drop warning, kept identical to the pre-refactor text. */
const ROW_NOUNS = {
  films: 'film(s)',
  developers: 'developer(s)',
  combinations: 'combination(s)',
} as const satisfies Record<CollectionResource, string>;

/** Describes rows dropped from a collection response during validation. */
export interface InvalidRowsInfo {
  resource: CollectionResource;
  /** Number of rows dropped. */
  dropped: number;
  /** Number of rows in the response, before dropping. */
  total: number;
}

const isAbortError = (error: Error, signal?: AbortSignal): boolean =>
  signal?.aborted === true || error.name === 'AbortError';

/**
 * API client for Dorkroom API
 */
export class DorkroomApiClient {
  private baseUrl: string;
  private apiKey: string | undefined;
  private clientId: string | undefined;
  private onInvalidRows: DorkroomApiClientConfig['onInvalidRows'];

  constructor(config: DorkroomApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? PUBLIC_API_BASE_URL;
    this.apiKey = config.apiKey;
    this.clientId = config.clientId;
    this.onInvalidRows = config.onInvalidRows;
  }

  /**
   * Reconfigure an existing client in place. Lets a consumer that depends on
   * the shared `apiClient` singleton (and the `fetch*` helpers bound to
   * it) point at a different base URL / API key at runtime — e.g. the mobile
   * app switching from the same-origin default to `api.dorkroom.art` with a
   * shipped key. Omitted fields are left unchanged.
   */
  configure(config: DorkroomApiClientConfig): void {
    if (config.baseUrl !== undefined) {
      this.baseUrl = config.baseUrl;
    }
    if (config.apiKey !== undefined) {
      this.apiKey = config.apiKey;
    }
    if (config.clientId !== undefined) {
      this.clientId = config.clientId;
    }
    if (config.onInvalidRows !== undefined) {
      this.onInvalidRows = config.onInvalidRows;
    }
  }

  private buildHeaders(): Record<string, string> | undefined {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    if (this.clientId) {
      headers['X-Client-Id'] = this.clientId;
    }
    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  /**
   * GET `path`, parse the JSON body, and validate it against `schema`.
   *
   * Every failure surfaces as a {@link DorkroomApiError}, except an abort,
   * which is rethrown untouched so TanStack Query cancellation keeps working:
   * - non-OK HTTP response: `statusCode` is the HTTP status
   * - network failure, unparseable JSON, or a body failing `schema`:
   *   `statusCode` is `undefined`
   */
  private async getValidated<T>(
    path: string,
    noun: string,
    schema: z.ZodType<T>,
    signal?: AbortSignal
  ): Promise<T> {
    const endpoint = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        signal,
        headers: this.buildHeaders(),
      });
    } catch (caught) {
      const error =
        caught instanceof Error ? caught : new Error(String(caught));
      if (isAbortError(error, signal)) throw caught;
      throw new DorkroomApiError(
        `Network error while fetching ${noun}: ${error.message}`,
        undefined,
        endpoint,
        { cause: caught }
      );
    }

    if (!response.ok) {
      throw new DorkroomApiError(
        `Failed to fetch ${noun}: ${response.statusText || response.status}`,
        response.status,
        endpoint
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (caught) {
      const error =
        caught instanceof Error ? caught : new Error(String(caught));
      if (isAbortError(error, signal)) throw caught;
      throw new DorkroomApiError(
        `Invalid JSON in API response for ${noun}: ${error.message}`,
        undefined,
        endpoint,
        { cause: caught }
      );
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      console.error(
        `[DorkroomApiClient] ${noun} API response invalid:`,
        parsed.error
      );
      throw new DorkroomApiError(
        `Invalid API response format for ${noun}`,
        undefined,
        endpoint,
        { cause: parsed.error }
      );
    }
    return parsed.data;
  }

  /**
   * Fetch a collection endpoint: validate the envelope (throws on failure),
   * then validate each item individually and drop the invalid ones, reporting
   * the drop count through `onInvalidRows` and `console.warn`.
   */
  private async fetchCollection<Raw, Out>(
    resource: CollectionResource,
    schema: z.ZodType<Raw>,
    transform: (raw: Raw) => Out,
    signal?: AbortSignal
  ): Promise<Out[]> {
    const envelope = await this.getValidated(
      `/${resource}`,
      resource,
      envelopeSchema,
      signal
    );

    const validItems: Raw[] = [];
    for (const item of envelope.data) {
      const result = schema.safeParse(item);
      if (result.success) {
        validItems.push(result.data);
      }
    }
    const dropped = envelope.data.length - validItems.length;
    if (dropped > 0) {
      console.warn(
        `[DorkroomApiClient] Filtered out ${dropped} invalid ${ROW_NOUNS[resource]} from API response`
      );
      // The rows are already validated; a throwing telemetry callback must
      // not turn a successful partial response into a failed query.
      try {
        this.onInvalidRows?.({
          resource,
          dropped,
          total: envelope.data.length,
        });
      } catch (callbackError) {
        console.error(
          '[DorkroomApiClient] onInvalidRows callback threw',
          callbackError
        );
      }
    }

    return validItems.map(transform);
  }

  /**
   * Fetch films from the API with runtime validation.
   * Invalid individual items are filtered out rather than failing the entire request.
   * @throws DorkroomApiError on HTTP, network, JSON, or envelope failure.
   */
  fetchFilms(options?: { signal?: AbortSignal }): Promise<Film[]> {
    return this.fetchCollection(
      'films',
      rawFilmSchema,
      this.transformFilm.bind(this),
      options?.signal
    );
  }

  /**
   * Fetch developers from the API with runtime validation.
   * Invalid individual items are filtered out rather than failing the entire request.
   * @throws DorkroomApiError on HTTP, network, JSON, or envelope failure.
   */
  fetchDevelopers(options?: { signal?: AbortSignal }): Promise<Developer[]> {
    return this.fetchCollection(
      'developers',
      rawDeveloperSchema,
      this.transformDeveloper.bind(this),
      options?.signal
    );
  }

  /**
   * Fetch combinations from the API with runtime validation.
   * Invalid individual items are filtered out rather than failing the entire request.
   * @throws DorkroomApiError on HTTP, network, JSON, or envelope failure.
   */
  fetchCombinations(options?: {
    signal?: AbortSignal;
  }): Promise<Combination[]> {
    return this.fetchCollection(
      'combinations',
      rawCombinationSchema,
      this.transformCombination.bind(this),
      options?.signal
    );
  }

  /**
   * Fetch aggregate stats (film, developer, combination counts) from the API.
   * @throws DorkroomApiError on HTTP, network, JSON, or validation failure.
   */
  fetchStats(options?: { signal?: AbortSignal }): Promise<Stats> {
    return this.getValidated('/stats', 'stats', statsSchema, options?.signal);
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
          manufacturerNotes = notesStr.split('","').flatMap((note) => {
            const cleaned = note.replace(/^"|"$/g, '').trim();
            return cleaned ? [cleaned] : [];
          });
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
      aliases: raw.aliases,
      baseFilmSlug: raw.base_film_slug,
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
        raw.dilutions
          ?.map((d) => ({
            id: String(d.id), // Convert number/string ID to string
            // Use name if available, fallback to dilution/ratio. Trimmed so a
            // whitespace-only field falls through to the next one.
            name: d.name?.trim() || d.dilution?.trim() || d.ratio?.trim() || '',
            // Some API entries use 'ratio' instead of 'dilution'
            dilution: d.dilution?.trim() || d.ratio?.trim() || '',
          }))
          // A dilution with no non-blank name, dilution or ratio has nothing to
          // show; drop it so the UI never renders a blank option. Recipes
          // pointing at it fall back to 'Stock'.
          .filter((d) => d.name !== '') || [],
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

// Default API client instance for internal (same-origin) use
export const apiClient = new DorkroomApiClient({
  baseUrl: INTERNAL_API_BASE_URL,
});

/**
 * Reconfigure the shared `apiClient` singleton (and therefore every
 * `fetch*` helper bound to it, including the `@dorkroom/logic` API
 * hooks). External consumers such as the mobile app call this once at startup
 * to switch from the same-origin default to the public API with a key.
 */
export const configureApiClient = (config: DorkroomApiClientConfig): void =>
  apiClient.configure(config);

// Export convenience functions for external use
export const fetchFilms = (options?: { signal?: AbortSignal }) =>
  apiClient.fetchFilms(options);

export const fetchDevelopers = (options?: { signal?: AbortSignal }) =>
  apiClient.fetchDevelopers(options);

export const fetchCombinations = (options?: { signal?: AbortSignal }) =>
  apiClient.fetchCombinations(options);

export const fetchStatsForQuery = (context?: { signal?: AbortSignal }) =>
  apiClient.fetchStats(context);
