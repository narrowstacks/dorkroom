// Core data types for the Dorkroom API

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
  dateAdded: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dilution {
  id: string;
  name: string;
  dilution: string;
}

export interface RawDilution {
  id: number;
  name: string;
  dilution: string;
}

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
  pushPull: number;
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

// Fetch options for on-demand API calls
export interface FetchFilmsOptions {
  limit?: number;
  query?: string;
  fuzzy?: boolean;
  colorType?: string;
  brand?: string;
}

export interface FetchDevelopersOptions {
  limit?: number;
  query?: string;
  fuzzy?: boolean;
  type?: string;
  manufacturer?: string;
}

export interface FetchCombinationsOptions {
  limit?: number;
  query?: string;
  fuzzy?: boolean;
  film?: string;
  developer?: string;
  count?: number;
  page?: number;
  id?: string;
}

// API raw response types (snake_case from server)
export interface RawFilm {
  id: number;
  uuid: string;
  slug: string;
  brand: string;
  name: string;
  color_type: string;
  iso_speed: number;
  grain_structure: string | null;
  description: string;
  manufacturer_notes: string[] | null;
  reciprocity_failure: string | null;
  discontinued: boolean;
  static_image_url: string | null;
  date_added: string;
  created_at: string;
  updated_at: string;
}

export interface RawDeveloper {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  manufacturer: string;
  type: string;
  description: string;
  film_or_paper: boolean;
  dilutions: RawDilution[];
  mixing_instructions: string | null;
  storage_requirements: string | null;
  safety_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawCombination {
  id: number;
  uuid: string;
  name: string;
  film_stock: string;
  developer: string;
  shooting_iso: number;
  dilution_id: number | null;
  temperature_celsius: number;
  time_minutes: number;
  agitation_method: string;
  push_pull: number;
  tags: string | null;
  info_source: string | null;
  created_at: string;
  updated_at: string;
}

// Error types
export class DorkroomApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'DorkroomApiError';
  }
}
