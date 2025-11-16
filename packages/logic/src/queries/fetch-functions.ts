import {
  Film,
  Developer,
  Combination,
  RawFilm,
  RawDeveloper,
  RawCombination,
} from '@dorkroom/api';
import type { QueryFunctionContext } from '@tanstack/react-query';

const BASE_URL = 'https://dorkroom.art/api';

/**
 * Fetch films from the API
 */
export async function fetchFilms(
  context?: QueryFunctionContext
): Promise<Film[]> {
  const response = await fetch(`${BASE_URL}/films`, {
    signal: context?.signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch films: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data.map(transformFilm);
}

/**
 * Fetch developers from the API
 */
export async function fetchDevelopers(
  context?: QueryFunctionContext
): Promise<Developer[]> {
  const response = await fetch(`${BASE_URL}/developers`, {
    signal: context?.signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch developers: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data.map(transformDeveloper);
}

/**
 * Fetch combinations from the API
 */
export async function fetchCombinations(
  context?: QueryFunctionContext
): Promise<Combination[]> {
  const response = await fetch(`${BASE_URL}/combinations`, {
    signal: context?.signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch combinations: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data.map(transformCombination);
}

/**
 * Transform raw film data to camelCase format
 */
function transformFilm(raw: RawFilm): Film {
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
function transformDeveloper(raw: RawDeveloper): Developer {
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
function transformCombination(raw: RawCombination): Combination {
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
