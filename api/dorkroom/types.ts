/**
 * TypeScript interfaces for Dorkroom API data structures.
 *
 * These interfaces represent the data structures returned by the
 * Dorkroom REST API for film stocks, developers, and development combinations.
 */

/**
 * Represents a film stock with all its properties.
 */
export interface Film {
  /** Unique identifier for the film */
  id: string;
  /** Display name of the film */
  name: string;
  /** Manufacturer/brand name */
  brand: string;
  /** ISO speed rating */
  isoSpeed: number;
  /** Type of film (color, b&w, etc.) */
  colorType: string;
  /** Optional detailed description */
  description?: string;
  /** Whether film is discontinued (0=no, 1=yes) */
  discontinued: number;
  /** List of notes from manufacturer */
  manufacturerNotes: string[];
  /** Description of grain characteristics */
  grainStructure?: string | null;
  /** Information about reciprocity failure */
  reciprocityFailure?: number | null;
  /** URL for a static image of the film box */
  staticImageURL?: string;
  /** Date the film was added to the database */
  dateAdded: string;
  /** UUID for the film */
  uuid: string;
  /** URL-friendly slug for the film */
  slug: string;

  // Snake_case variants from actual API response
  /** ISO speed rating (snake_case) */
  iso_speed?: number;
  /** Type of film (snake_case) */
  color_type?: string;
  /** List of notes from manufacturer (snake_case) */
  manufacturer_notes?: string[];
  /** Description of grain characteristics (snake_case) */
  grain_structure?: string | null;
  /** Information about reciprocity failure (snake_case) */
  reciprocity_failure?: number | null;
  /** URL for a static image of the film box (snake_case) */
  static_image_url?: string;
  /** Date the film was added to the database (snake_case) */
  date_added?: string;
}

/**
 * Represents a dilution ratio for a developer.
 */
export interface Dilution {
  id: number;
  name: string;
  dilution: string;
}

/**
 * Represents a film/paper developer with all its properties.
 */
export interface Developer {
  /** Unique identifier for the developer */
  id: string;
  /** Display name of the developer */
  name: string;
  /** Manufacturer/brand name */
  manufacturer: string;
  /** Type of developer (e.g., "concentrate") */
  type: string;
  /** Whether for film or paper development */
  filmOrPaper: string;
  /** List of available dilution ratios */
  dilutions: Dilution[];
  /** Working solution lifetime in hours */
  workingLifeHours?: number | null;
  /** Stock solution lifetime in months */
  stockLifeMonths?: number | null;
  /** Additional notes about the developer */
  notes?: string;
  /** Whether developer is discontinued (0=no, 1=yes) */
  discontinued: number;
  /** How to prepare the developer */
  mixingInstructions?: string | null;
  /** Safety information and warnings */
  safetyNotes?: string | null;
  /** URLs to manufacturer datasheets */
  datasheetUrl?: string[];
  /** UUID for the developer */
  uuid: string;
  /** URL-friendly slug for the developer */
  slug: string;
  /** Date the developer was added */
  dateAdded: string;
}

/**
 * Represents a film+developer combination with development parameters.
 */
export interface Combination {
  /** Unique identifier for the combination */
  id: string;
  /** Display name describing the combination */
  name: string;
  /** UUID of the film used */
  filmStockId: string;
  /** UUID of the developer used */
  developerId: string;
  /** Development temperature in Fahrenheit */
  temperatureF: number;
  /** Development time in minutes */
  timeMinutes: number;
  /** ISO at which the film was shot */
  shootingIso: number;
  /** Push/pull processing offset (0=normal, +1=push 1 stop, etc.) */
  pushPull: number;
  /** Description of agitation pattern */
  agitationSchedule?: string;
  /** Additional development notes */
  notes?: string;
  /** ID of specific dilution used */
  dilutionId?: number;
  /** Custom dilution ratio if not standard */
  customDilution?: string | null;
  /** UUID for the combination */
  uuid: string;
  /** URL-friendly slug for the combination */
  slug: string;
  /** Date the combination was added */
  dateAdded: string;
}

/**
 * Configuration options for the DorkroomClient.
 */
export interface DorkroomClientConfig {
  /** Base URL for the API endpoints */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Custom logger instance */
  logger?: Logger;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  /** Debounce delay for search requests in milliseconds (default: 300ms) */
  searchDebounceMs?: number;
}

/**
 * Simple logger interface for dependency injection.
 */
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Options for fuzzy search operations.
 */
export interface FuzzySearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity score (0-1) to include in results */
  threshold?: number;
}

/**
 * Represents the structure of a successful API response.
 */
export interface ApiResponse<T> {
  data: T[];
  success: boolean;
  message: string;
  total: number;
}

/**
 * Represents the structure of a paginated API response from Supabase edge functions.
 */
export interface PaginatedApiResponse<T> {
  /** The data array */
  data: T[];
  /** Total count of records matching the query */
  count: number | null;
  /** Current page number (only present for paginated requests) */
  page?: number;
  /** Number of items per page (only present for paginated requests) */
  perPage?: number;
  /** Applied filters */
  filters?: {
    /** Film slug filter */
    film?: string;
    /** Developer slug filter */
    developer?: string;
  };
}

/**
 * Options for fetching combinations with server-side filtering.
 */
export interface CombinationFetchOptions {
  /** Film slug to filter by */
  filmSlug?: string;
  /** Developer slug to filter by */
  developerSlug?: string;
  /** Number of results per page */
  count?: number;
  /** Page number (starts at 1) */
  page?: number;
  /** Specific combination UUID to fetch */
  id?: string;
}

/**
 * Raw film data structure from API response (may include both camelCase and snake_case fields).
 * Core fields are required; format variations (camelCase/snake_case) and optional fields may vary.
 */
export interface RawFilm {
  id?: string;
  uuid: string;
  slug: string;
  name: string;
  brand: string;
  iso_speed: number;
  isoSpeed?: number;
  color_type: string;
  colorType?: string;
  description?: string;
  discontinued?: boolean | number;
  manufacturer_notes?: string | string[];
  manufacturerNotes?: string[];
  grain_structure?: string | null;
  grainStructure?: string | null;
  reciprocity_failure?: number | null;
  reciprocityFailure?: number | null;
  static_image_url?: string;
  staticImageURL?: string;
  date_added?: string;
  dateAdded?: string;
  created_at?: string;
}

/**
 * Raw developer data structure from API response (may include both camelCase and snake_case fields).
 * Core fields are required; format variations (camelCase/snake_case) and optional fields may vary.
 */
export interface RawDeveloper {
  id?: string;
  uuid: string;
  slug: string;
  name: string;
  manufacturer: string;
  type: string;
  film_or_paper: boolean | string;
  filmOrPaper?: string;
  dilutions?: Dilution[];
  working_life_hours?: number | null;
  workingLifeHours?: number | null;
  stock_life_months?: number | null;
  stockLifeMonths?: number | null;
  notes?: string;
  discontinued?: boolean | number;
  mixing_instructions?: string | null;
  mixingInstructions?: string | null;
  safety_notes?: string | null;
  safetyNotes?: string | null;
  datasheet_url?: string[];
  datasheetUrl?: string[];
  date_added?: string;
  dateAdded?: string;
  created_at?: string;
}

/**
 * Raw combination data structure from API response (may include both camelCase and snake_case fields).
 */
export interface RawCombination {
  id?: string | number;
  uuid?: string;
  slug?: string;
  name?: string;
  film_stock?: string;
  film_stock_id?: string;
  filmStockId?: string;
  developer?: string;
  developer_id?: string;
  developerId?: string;
  temperature_f?: number;
  temperature_celsius?: number;
  temperatureF?: number;
  time_minutes?: number;
  timeMinutes?: number;
  shooting_iso?: number;
  shootingIso?: number;
  push_pull?: number;
  pushPull?: number;
  agitation_method?: string;
  agitationSchedule?: string;
  notes?: string;
  dilution_id?: string | number;
  dilutionId?: number;
  custom_dilution?: string | null;
  customDilution?: string | null;
  created_at?: string;
  dateAdded?: string;
}

/**
 * Chrome-specific Performance Memory API interface.
 */
export interface PerformanceMemory {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}
