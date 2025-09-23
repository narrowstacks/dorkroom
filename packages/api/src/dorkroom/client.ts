import type {
  Combination,
  Developer,
  Dilution,
  DorkroomClientConfig,
  Film,
  Logger,
  PaginatedApiResponse,
  CombinationFetchOptions,
} from './types';
import {
  DataFetchError,
  DataNotLoadedError,
  DataParseError,
  TimeoutError,
} from './errors';
import { getApiEndpointConfig } from '../utils/platformDetection';

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_CACHE_TTL = 30 * 60 * 1_000;

interface ApiCollectionResponse<T> {
  data: T[];
  count?: number;
  filters?: Record<string, unknown>;
  page?: number;
  perPage?: number;
}

interface RawFilm {
  id: number;
  uuid: string;
  slug: string;
  brand: string;
  name: string;
  color_type: string | null;
  iso_speed: number | string;
  grain_structure?: string | null;
  description?: string | null;
  manufacturer_notes?: string | string[] | null;
  reciprocity_failure?: number | string | null;
  discontinued?: boolean | null;
  static_image_url?: string | null;
  date_added?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RawDilution {
  id: number | string;
  name?: string | null;
  dilution?: string | null;
}

interface RawDeveloper {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  manufacturer: string;
  type: string;
  description?: string | null;
  mixing_instructions?: string | null;
  storage_requirements?: string | null;
  safety_notes?: string | null;
  dilutions?: RawDilution[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  film_or_paper?: boolean | null;
}

interface RawCombination {
  id: number;
  uuid: string;
  slug?: string | null;
  name?: string | null;
  film_stock?: string | null;
  developer?: string | null;
  film_stock_id?: string | null;
  developer_id?: string | null;
  dilution_id?: number | string | null;
  custom_dilution?: string | null;
  temperature_celsius?: number | string | null;
  temperature_fahrenheit?: number | string | null;
  time_minutes?: number | string | null;
  agitation_method?: string | null;
  notes?: string | null;
  shooting_iso?: number | string | null;
  push_pull?: number | string | null;
  tags?: string[] | null;
  info_source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const defaultLogger: Logger = {
  debug(message, meta) {
    if (meta !== undefined) {
      console.debug(`[dorkroom] ${message}`, meta);
    } else {
      console.debug(`[dorkroom] ${message}`);
    }
  },
  info(message, meta) {
    if (meta !== undefined) {
      console.info(`[dorkroom] ${message}`, meta);
    } else {
      console.info(`[dorkroom] ${message}`);
    }
  },
  warn(message, meta) {
    if (meta !== undefined) {
      console.warn(`[dorkroom] ${message}`, meta);
    } else {
      console.warn(`[dorkroom] ${message}`);
    }
  },
  error(message, meta) {
    if (meta !== undefined) {
      console.error(`[dorkroom] ${message}`, meta);
    } else {
      console.error(`[dorkroom] ${message}`);
    }
  },
};

export class DorkroomClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly cacheTTL: number;
  private readonly logger: Logger;

  private loaded = false;
  private lastLoadedAt: number | null = null;

  private films: Film[] = [];
  private developers: Developer[] = [];
  private combinations: Combination[] = [];

  private filmByUuid = new Map<string, Film>();
  private filmBySlug = new Map<string, Film>();
  private filmById = new Map<string, Film>();

  private developerByUuid = new Map<string, Developer>();
  private developerBySlug = new Map<string, Developer>();
  private developerById = new Map<string, Developer>();

  constructor(config: DorkroomClientConfig = {}) {
    const apiConfig = getApiEndpointConfig();
    this.baseUrl = (config.baseUrl ?? apiConfig.baseUrl).replace(/\/$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.cacheTTL = config.cacheTTL ?? DEFAULT_CACHE_TTL;
    this.logger = config.logger ?? defaultLogger;
  }

  async loadAll(): Promise<void> {
    if (this.loaded && !this.isDataExpired()) {
      return;
    }

    await this.fetchAndCacheAll();
  }

  async forceReload(): Promise<void> {
    await this.fetchAndCacheAll(true);
  }

  isDataExpired(): boolean {
    if (!this.lastLoadedAt) {
      return true;
    }
    return Date.now() - this.lastLoadedAt > this.cacheTTL;
  }

  getAllFilms(): Film[] {
    this.ensureLoaded('getAllFilms');
    return this.films;
  }

  getAllDevelopers(): Developer[] {
    this.ensureLoaded('getAllDevelopers');
    return this.developers;
  }

  getAllCombinations(): Combination[] {
    this.ensureLoaded('getAllCombinations');
    return this.combinations;
  }

  getFilmById(id: string): Film | undefined {
    this.ensureLoaded('getFilmById');
    const key = String(id);
    return (
      this.filmByUuid.get(key) ??
      this.filmById.get(key) ??
      this.filmBySlug.get(key)
    );
  }

  getDeveloperById(id: string): Developer | undefined {
    this.ensureLoaded('getDeveloperById');
    const key = String(id);
    return (
      this.developerByUuid.get(key) ??
      this.developerById.get(key) ??
      this.developerBySlug.get(key)
    );
  }

  async fetchCombinations(
    options: CombinationFetchOptions = {},
  ): Promise<PaginatedApiResponse<Combination>> {
    await this.loadAll();

    let filtered = this.combinations;

    if (options.filmSlug) {
      filtered = filtered.filter(
        (combo) => combo.filmSlug === options.filmSlug || combo.filmStockId === options.filmSlug,
      );
    }

    if (options.developerSlug) {
      filtered = filtered.filter(
        (combo) =>
          combo.developerSlug === options.developerSlug ||
          combo.developerId === options.developerSlug,
      );
    }

    if (options.id) {
      filtered = filtered.filter(
        (combo) => combo.uuid === options.id || combo.id === options.id,
      );
    }

    const count = filtered.length;

    if (options.count && options.count > 0) {
      const page = Math.max(1, options.page ?? 1);
      const offset = (page - 1) * options.count;
      filtered = filtered.slice(offset, offset + options.count);
      return {
        data: filtered,
        count,
        page,
        perPage: options.count,
        filters: {
          film: options.filmSlug,
          developer: options.developerSlug,
        },
      };
    }

    return {
      data: filtered,
      count,
      filters: {
        film: options.filmSlug,
        developer: options.developerSlug,
      },
    };
  }

  private async fetchAndCacheAll(force = false): Promise<void> {
    if (force) {
      this.loaded = false;
    }

    const [filmsResponse, developersResponse, combinationsResponse] = await Promise.all([
      this.fetchCollection<RawFilm>('films'),
      this.fetchCollection<RawDeveloper>('developers'),
      this.fetchCollection<RawCombination>('combinations'),
    ]);

    this.films = filmsResponse.data.map((film) => this.normaliseFilm(film));
    this.rebuildFilmIndexes();

    this.developers = developersResponse.data.map((developer) =>
      this.normaliseDeveloper(developer),
    );
    this.rebuildDeveloperIndexes();

    this.combinations = combinationsResponse.data.map((combination) =>
      this.normaliseCombination(combination),
    );

    this.loaded = true;
    this.lastLoadedAt = Date.now();

    this.logger.info('Loaded development catalogue', {
      films: this.films.length,
      developers: this.developers.length,
      combinations: this.combinations.length,
      source: this.baseUrl,
    });
  }

  private async fetchCollection<T>(endpoint: string): Promise<ApiCollectionResponse<T>> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutHandle: ReturnType<typeof setTimeout> | null = controller
      ? setTimeout(() => controller.abort(), this.timeout)
      : null;

    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        signal: controller?.signal,
      });

      if (!response.ok) {
        throw new DataFetchError(
          `Request to ${endpoint} failed with status ${response.status}`,
          undefined,
          response.status,
          response.status >= 500,
        );
      }

      const json = (await response.json()) as unknown;
      if (!json || typeof json !== 'object' || !Array.isArray((json as Record<string, unknown>).data)) {
        throw new DataParseError(`Unexpected response structure for ${endpoint}`);
      }

      return json as ApiCollectionResponse<T>;
    } catch (error) {
      if (error instanceof DataFetchError || error instanceof DataParseError) {
        throw error;
      }

      if ((error as Error)?.name === 'AbortError') {
        throw new TimeoutError(`Request to ${endpoint} timed out`, this.timeout);
      }

      throw new DataFetchError(`Failed to fetch ${endpoint}`, error as Error);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private normaliseFilm(raw: RawFilm): Film {
    const manufacturerNotes = this.parseStringArray(raw.manufacturer_notes);
    const isoSpeed = this.toNumber(raw.iso_speed) ?? 0;
    const reciprocity = this.toNumber(raw.reciprocity_failure);

    const film: Film = {
      id: String(raw.id ?? raw.uuid),
      uuid: raw.uuid,
      slug: raw.slug,
      brand: raw.brand,
      name: raw.name,
      isoSpeed,
      colorType: (raw.color_type ?? '').toLowerCase(),
      description: raw.description ?? null,
      discontinued: raw.discontinued ? 1 : 0,
      manufacturerNotes,
      manufacturer_notes: manufacturerNotes,
      grainStructure: raw.grain_structure ?? null,
      grain_structure: raw.grain_structure ?? null,
      reciprocityFailure: reciprocity,
      reciprocity_failure: reciprocity,
      staticImageURL: raw.static_image_url ?? null,
      static_image_url: raw.static_image_url ?? null,
      dateAdded: raw.date_added ?? raw.created_at ?? undefined,
      date_added: raw.date_added ?? undefined,
      createdAt: raw.created_at ?? undefined,
      updatedAt: raw.updated_at ?? undefined,
    };

    return film;
  }

  private normaliseDeveloper(raw: RawDeveloper): Developer {
    const dilutions: Dilution[] = Array.isArray(raw.dilutions)
      ? raw.dilutions.map((entry) => ({
          id: this.toNumber(entry.id) ?? 0,
          name: (entry.name ?? entry.dilution ?? 'Stock') || 'Stock',
          dilution: (entry.dilution ?? entry.name ?? 'Stock') || 'Stock',
        }))
      : [];

    const filmOrPaper = raw.film_or_paper === null || raw.film_or_paper === undefined
      ? 'unspecified'
      : raw.film_or_paper
        ? 'film'
        : 'paper';

    const developer: Developer = {
      id: String(raw.id ?? raw.uuid),
      uuid: raw.uuid,
      slug: raw.slug,
      name: raw.name,
      manufacturer: raw.manufacturer,
      type: raw.type,
      description: raw.description ?? null,
      notes: raw.description ?? null,
      mixingInstructions: raw.mixing_instructions ?? null,
      storageRequirements: raw.storage_requirements ?? null,
      safetyNotes: raw.safety_notes ?? null,
      dilutions,
      filmOrPaper,
      workingLifeHours: null,
      stockLifeMonths: null,
      datasheetUrl: [],
      discontinued: 0,
      dateAdded: raw.created_at ?? undefined,
      createdAt: raw.created_at ?? undefined,
      updatedAt: raw.updated_at ?? undefined,
    };

    return developer;
  }

  private normaliseCombination(raw: RawCombination): Combination {
    const dilutionId = raw.dilution_id === null || raw.dilution_id === undefined
      ? undefined
      : this.toNumber(raw.dilution_id) ?? undefined;

    const directCelsius = this.toNumber(raw.temperature_celsius);
    const directFahrenheit = this.toNumber(raw.temperature_fahrenheit);

    const temperatureCFromF = directFahrenheit !== null
      ? ((directFahrenheit - 32) * 5) / 9
      : null;
    const temperatureFFromC = directCelsius !== null
      ? (directCelsius * 9) / 5 + 32
      : null;

    const fallbackF = 68;
    const finalTemperatureF = directFahrenheit ?? temperatureFFromC ?? fallbackF;
    const finalTemperatureC = directCelsius ?? temperatureCFromF ?? ((fallbackF - 32) * 5) / 9;

    const timeMinutes = this.toNumber(raw.time_minutes) ?? 0;
    const shootingIso = this.toNumber(raw.shooting_iso) ?? 0;
    const pushPull = this.toNumber(raw.push_pull) ?? 0;

    const filmSlug = raw.film_stock ?? raw.film_stock_id ?? null;
    const developerSlug = raw.developer ?? raw.developer_id ?? null;

    const combination: Combination = {
      id: String(raw.uuid ?? raw.id),
      uuid: raw.uuid ?? String(raw.id),
      slug: raw.slug ?? raw.uuid ?? String(raw.id),
      name: raw.name ?? '',
      filmStockId: this.resolveFilmReference(filmSlug),
      filmSlug,
      developerId: this.resolveDeveloperReference(developerSlug),
      developerSlug,
      temperatureF: finalTemperatureF,
      temperatureC: finalTemperatureC,
      timeMinutes,
      shootingIso,
      pushPull,
      agitationSchedule: raw.agitation_method ?? null,
      notes: raw.notes ?? null,
      dilutionId,
      customDilution: raw.custom_dilution ?? null,
      tags: Array.isArray(raw.tags)
        ? raw.tags.map((tag) => (typeof tag === 'string' ? tag : String(tag)))
        : [],
      infoSource: raw.info_source ?? null,
      dateAdded: raw.created_at ?? undefined,
      createdAt: raw.created_at ?? undefined,
      updatedAt: raw.updated_at ?? undefined,
    };

    return combination;
  }

  private resolveFilmReference(reference: string | null): string | null {
    if (!reference) {
      return null;
    }
    const key = String(reference);
    if (this.filmByUuid.has(key)) {
      return key;
    }
    const bySlug = this.filmBySlug.get(key);
    if (bySlug) {
      return bySlug.uuid;
    }
    const byId = this.filmById.get(key);
    if (byId) {
      return byId.uuid;
    }
    return key;
  }

  private resolveDeveloperReference(reference: string | null): string | null {
    if (!reference) {
      return null;
    }
    const key = String(reference);
    if (this.developerByUuid.has(key)) {
      return key;
    }
    const bySlug = this.developerBySlug.get(key);
    if (bySlug) {
      return bySlug.uuid;
    }
    const byId = this.developerById.get(key);
    if (byId) {
      return byId.uuid;
    }
    return key;
  }

  private rebuildFilmIndexes(): void {
    this.filmByUuid = new Map(this.films.map((film) => [film.uuid, film]));
    this.filmBySlug = new Map(this.films.map((film) => [film.slug, film]));
    this.filmById = new Map(this.films.map((film) => [film.id, film]));
  }

  private rebuildDeveloperIndexes(): void {
    this.developerByUuid = new Map(this.developers.map((developer) => [developer.uuid, developer]));
    this.developerBySlug = new Map(this.developers.map((developer) => [developer.slug, developer]));
    this.developerById = new Map(this.developers.map((developer) => [developer.id, developer]));
  }

  private parseStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry : String(entry)))
        .filter((entry) => entry.length > 0);
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const normalised = `[${trimmed.slice(1, -1)}]`;
        try {
          const parsed = JSON.parse(normalised.replace(/""/g, '"')) as unknown;
          if (Array.isArray(parsed)) {
            return parsed
              .map((entry) =>
                typeof entry === 'string' ? entry.replace(/\\"/g, '"') : String(entry),
              )
              .filter((entry) => entry.length > 0);
          }
        } catch (error) {
          this.logger.warn('Failed to parse PostgreSQL array string', { value, error });
        }
      }

      return trimmed
        .split(',')
        .map((entry) => entry.replace(/^"|"$/g, '').trim())
        .filter((entry) => entry.length > 0);
    }

    return [];
  }

  private toNumber(value: unknown): number | null {
    let numeric: number | null = null;

    if (typeof value === 'number') {
      numeric = Number.isFinite(value) ? value : null;
    } else if (typeof value === 'string') {
      const parsed = Number(value);
      numeric = Number.isNaN(parsed) ? null : parsed;
    }

    if (numeric === null) {
      return null;
    }

    return Number.isFinite(numeric) ? numeric : null;
  }

  private ensureLoaded(method: string): void {
    if (!this.loaded) {
      throw new DataNotLoadedError(`Call loadAll() before invoking ${method}.`);
    }
  }
}
