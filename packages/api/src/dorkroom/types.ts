/**
 * TypeScript interfaces for the public Dorkroom API client.
 *
 * These interfaces mirror the current responses from
 * https://beta.dorkroom.art/api and expose a camel-cased shape that the rest
 * of the app consumes.
 */

/**
 * Represents a film stock entry returned by the API.
 */
export interface Film {
  /** Numeric identifier from the API (stringified for stability across platforms). */
  id: string;
  /** Dorkroom UUID for the film. */
  uuid: string;
  /** URL-friendly slug. */
  slug: string;
  /** Manufacturer or brand name. */
  brand: string;
  /** Marketing name. */
  name: string;
  /** ISO speed rating. */
  isoSpeed: number;
  /** API-provided color classification (e.g. "bw", "color"). */
  colorType: string;
  /** Longer descriptive copy if available. */
  description?: string | null;
  /** Whether the stock is discontinued (0 = no, 1 = yes for backwards compatibility). */
  discontinued: number;
  /** Array form of manufacturer notes. */
  manufacturerNotes: string[];
  /** Snake_case alias for consumers that still expect it. */
  manufacturer_notes?: string[];
  /** Grain structure description. */
  grainStructure?: string | null;
  /** Snake_case alias. */
  grain_structure?: string | null;
  /** Reciprocity failure information (minutes multiplier). */
  reciprocityFailure?: number | null;
  /** Snake_case alias. */
  reciprocity_failure?: number | null;
  /** Optional product imagery. */
  staticImageURL?: string | null;
  /** Snake_case alias. */
  static_image_url?: string | null;
  /** First known appearance in the catalogue. */
  dateAdded?: string;
  /** Snake_case alias. */
  date_added?: string;
  /** Timestamps from the upstream service. */
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Dilution option for a developer.
 */
export interface Dilution {
  id: number;
  name: string;
  dilution: string;
}

/**
 * Developer entry returned by the API.
 */
export interface Developer {
  id: string;
  uuid: string;
  slug: string;
  name: string;
  manufacturer: string;
  type: string;
  /** Free-form description (mapped from the upstream `description` field). */
  description?: string | null;
  /** Legacy alias that existing UI components reference. */
  notes?: string | null;
  mixingInstructions?: string | null;
  storageRequirements?: string | null;
  safetyNotes?: string | null;
  dilutions: Dilution[];
  /** "film" if the upstream `film_or_paper` flag is true, otherwise "paper". */
  filmOrPaper: 'film' | 'paper' | 'both' | 'unspecified';
  workingLifeHours?: number | null;
  stockLifeMonths?: number | null;
  datasheetUrl?: string[];
  discontinued: number;
  dateAdded?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Combination of film + developer returned by the API.
 */
export interface Combination {
  id: string;
  uuid: string;
  slug: string;
  name: string;
  /** UUID (when available) of the film used in the recipe. */
  filmStockId: string | null;
  /** Raw slug from the upstream payload (handy for debugging/filtering). */
  filmSlug?: string | null;
  /** UUID (when available) of the developer. */
  developerId: string | null;
  /** Raw slug from the upstream payload. */
  developerSlug?: string | null;
  /** Temperature converted to Fahrenheit to match legacy UI expectations. */
  temperatureF: number;
  /** Temperature in Celsius as supplied by the upstream service. */
  temperatureC?: number | null;
  /** Total development time in minutes. */
  timeMinutes: number;
  /** ISO at which the film was exposed. */
  shootingIso: number;
  /** Push/pull delta expressed in stops. */
  pushPull: number;
  agitationSchedule?: string | null;
  notes?: string | null;
  dilutionId?: number;
  customDilution?: string | null;
  /** Classification tags such as `official-ilford`. */
  tags?: string[];
  /** Source URL for the data when provided. */
  infoSource?: string | null;
  dateAdded?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Configuration options for the DorkroomClient.
 */
export interface DorkroomClientConfig {
  baseUrl?: string;
  timeout?: number;
  logger?: Logger;
  cacheTTL?: number;
}

/**
 * Minimal logger contract so callers can inject structured logging.
 */
export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/**
 * Shape of collection responses returned by beta.dorkroom.art.
 */
export interface ApiResponse<T> {
  data: T[];
  count?: number;
  filters?: Record<string, unknown>;
}

/**
 * Paginated response helpers (the upstream API sometimes echoes page metadata).
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  page?: number;
  perPage?: number;
}

/**
 * Query parameters supported by the combinations endpoint.
 */
export interface CombinationFetchOptions {
  filmSlug?: string;
  developerSlug?: string;
  count?: number;
  page?: number;
  id?: string;
}
