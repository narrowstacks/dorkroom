import type { Developer, Film } from '@dorkroom/api';
import type { FilmdevRecipe } from '../services/filmdev-api';
import type {
  CustomDeveloperData,
  CustomFilmData,
  CustomRecipeFormData,
} from '../types/custom-recipes';
import { roundTemperature, toFahrenheit } from './temperature';

const STANDARD_ISOS = new Set([
  6, 12, 20, 25, 32, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 800, 1600,
  3200, 6400, 12800, 25600,
]);

/**
 * Extracts a standard ISO speed from a film name string.
 */
function extractIsoFromString(str: string): number | null {
  for (const token of tokenize(str)) {
    if (/^\d+$/.test(token) && STANDARD_ISOS.has(Number(token))) {
      return Number(token);
    }
  }
  return null;
}

/**
 * Words that carry no identity on their own: marketing suffixes, format
 * labels and filler that filmdev.org and our catalogue disagree on.
 * "Kentmere Photographic Kentmere 400" is our "Kentmere Pan 400", and
 * "Foma Fomapan 100" is our "Fomapan 100 Classic".
 */
const GENERIC_WORDS = new Set([
  'bw',
  'concentrate',
  'dev',
  'developer',
  'film',
  'films',
  'inc',
  'iso',
  'liquid',
  'mf',
  'pan',
  'photographic',
  'plus',
  'powder',
  'pro',
  'professional',
  'stock',
  'type',
]);

/**
 * Product-line suffixes ("Fomapan 100 Classic") that filmdev.org usually
 * leaves off. Missing from a query they cost nothing, but they still count
 * as a difference when the query has a word of its own ("Fomapan Ortho
 * 400" is not "Fomapan 400 Action").
 */
const SUFFIX_WORDS = new Set(['action', 'classic', 'creative']);

/** filmdev.org spellings that mean one of our catalogue entries. */
const TOKEN_SYNONYMS = new Map([['r09', 'rodinal']]);

/**
 * Lowercases and splits a name into comparable tokens. Hyphens and dots
 * join ("T-Max" -> "tmax", "HC-110" -> "hc110") and "+" reads as "plus"
 * ("HP5+" -> "hp5 plus").
 */
function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[-.']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((token) => TOKEN_SYNONYMS.get(token) ?? token);
}

/**
 * Expands "A/B rest" into "A rest" and "B rest", so "Rodinal/Adonal" can be
 * matched by either name and "T-MAX/Ektapan 400" by "T-Max 400".
 */
function expandAlternatives(name: string): string[] {
  const match = name.match(/(\S+)\/(\S+)/);
  if (!match) return [name];
  return [name.replace(match[0], match[1]), name.replace(match[0], match[2])];
}

interface ParsedQuery {
  tokens: string[];
  tokenSet: Set<string>;
  /** Tokens plus adjacent pairs joined, so "HC 110" can meet "hc110". */
  matchable: string[];
  normalized: string;
  iso: number | null;
}

function parseQuery(str: string): ParsedQuery {
  const tokens = tokenize(str);
  const pairs = tokens.slice(1).map((token, i) => tokens[i] + token);
  return {
    tokens,
    tokenSet: new Set(tokens),
    matchable: [...tokens, ...pairs],
    normalized: tokens.join(' '),
    iso: extractIsoFromString(str),
  };
}

/**
 * One token stands for another when equal, or when a long token is a prefix
 * of the other ("doublex" / "doublexx"). Short prefixes are ignored so that
 * "pan" never matches "fomapan".
 */
function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 5 && longer.startsWith(shorter);
}

/** Brands get a looser prefix rule: "Agfa" names "AgfaPhoto", "Foma" "Fomapan". */
function brandTokenMatches(brandToken: string, queryToken: string): boolean {
  if (tokensMatch(brandToken, queryToken)) return true;
  const [shorter, longer] =
    brandToken.length <= queryToken.length
      ? [brandToken, queryToken]
      : [queryToken, brandToken];
  return shorter.length >= 4 && longer.startsWith(shorter);
}

const isNumeric = (token: string) => /^\d+$/.test(token);

const EXACT_FULL_NAME_SCORE = 1000;
const EXACT_NAME_SCORE = 900;

/**
 * Scores one catalogue entry against a filmdev.org string, or returns null
 * when it is not a plausible match. A plausible match needs real evidence:
 * a distinctive word of the product name, or (for names that are only
 * generic words and a speed, like "Pan 400" or "Legacy Pro 100") the brand
 * together with the ISO. A brand or speed alone is never enough.
 *
 * @param query - Parsed filmdev.org string
 * @param brand - Catalogue brand or manufacturer
 * @param name - Catalogue product name, without the brand
 * @param iso - Box speed, for films; omitted for developers
 */
function scoreCandidate(
  query: ParsedQuery,
  brand: string,
  name: string,
  iso?: number
): number | null {
  const brandTokens = tokenize(brand);
  const brandSet = new Set(brandTokens);
  const fullName = [...brandTokens, ...tokenize(name)].join(' ');
  if (query.normalized === fullName) return EXACT_FULL_NAME_SCORE;
  if (query.normalized === tokenize(name).join(' ')) return EXACT_NAME_SCORE;

  let best: number | null = null;
  for (const variant of expandAlternatives(name)) {
    const nameTokens = tokenize(variant);

    // A speed in the query that the film doesn't have rules it out.
    if (
      iso !== undefined &&
      query.iso !== null &&
      query.iso !== iso &&
      !nameTokens.includes(String(query.iso))
    ) {
      continue;
    }

    const isIsoToken = (token: string) =>
      iso !== undefined && token === String(iso);
    const distinctive = nameTokens.filter(
      (token) =>
        !GENERIC_WORDS.has(token) &&
        !SUFFIX_WORDS.has(token) &&
        token.length > 1 &&
        !isIsoToken(token)
    );
    // Adjacent name tokens joined, so "BRF 400" can meet "BRF-400".
    const namePairs = new Set(
      nameTokens.slice(1).map((token, i) => nameTokens[i] + token)
    );
    const pairedTokens = new Set(
      nameTokens.flatMap((token, i) =>
        query.tokenSet.has(token + (nameTokens[i + 1] ?? '')) ||
        query.tokenSet.has((nameTokens[i - 1] ?? '') + token)
          ? [token]
          : []
      )
    );
    const matched = distinctive.filter(
      (token) =>
        pairedTokens.has(token) ||
        query.matchable.some((q) => tokensMatch(token, q))
    );
    const unmatchedCount = distinctive.length - matched.length;
    const brandMatched = brandTokens.some(
      (b) =>
        !GENERIC_WORDS.has(b) &&
        query.tokens.some((q) => brandTokenMatches(b, q))
    );
    const isoMatched = iso !== undefined && query.iso === iso;

    // Query words this entry can't account for, like "Ortho" in
    // "Fomapan Ortho 400" or "Diafine" in "Acufine Diafine".
    const unexplained = query.tokens.filter(
      (q) =>
        !isNumeric(q) &&
        q.length > 1 &&
        !GENERIC_WORDS.has(q) &&
        !nameTokens.some((t) => tokensMatch(t, q)) &&
        !namePairs.has(q) &&
        !brandTokens.some((b) => brandTokenMatches(b, q))
    );

    let score: number;
    if (distinctive.length === 0) {
      if (!brandMatched || (iso !== undefined && !isoMatched)) continue;
      if (unexplained.length > 0) continue;
      score = 70;
    } else {
      if (matched.length === 0) continue;
      // A partial name match must be backed by the brand.
      if (unmatchedCount > 0 && !brandMatched) continue;
      if (unexplained.length > 0) {
        // An unexplained word plus a missing one means a different product.
        const suffixMissing = nameTokens.some(
          (t) => SUFFIX_WORDS.has(t) && !query.tokenSet.has(t)
        );
        if (unmatchedCount > 0 || suffixMissing) continue;
        // The match must rest on more than the brand repeated as the name
        // ("Acufine Inc. Acufine" vs "Acufine Diafine").
        if (matched.every((t) => brandSet.has(t))) continue;
      }
      score =
        50 * matched.length +
        (unmatchedCount === 0 ? 60 : 0) -
        10 * unmatchedCount;
    }

    score += (brandMatched ? 30 : 0) + (isoMatched ? 40 : 0);
    score -= 5 * unexplained.length;
    // Tie-break between near twins ("BRF 400" vs "BRF 400 Plus"): prefer the
    // entry whose words line up with the query's, generic ones included.
    const nameSet = new Set(nameTokens);
    score -= nameTokens.filter(
      (t) => !query.tokenSet.has(t) && !pairedTokens.has(t) && !isIsoToken(t)
    ).length;
    score -= query.tokens.filter(
      (q) => GENERIC_WORDS.has(q) && !nameSet.has(q) && !brandSet.has(q)
    ).length;
    if (best === null || score > best) best = score;
  }
  return best;
}

function pickBest<T>(
  candidates: T[],
  score: (candidate: T) => number | null
): T | null {
  let bestCandidate: T | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const s = score(candidate);
    if (s !== null && s > bestScore) {
      bestScore = s;
      bestCandidate = candidate;
    }
  }
  return bestCandidate;
}

/**
 * Finds the local film a filmdev.org film string names, or null when none
 * plausibly does (the importer then creates a custom film). Known aliases
 * (e.g. "Kodak T-MAX 400" for "T-MAX/Ektapan 400") are matched too.
 *
 * Pass the whole catalogue, not a filtered view: a film missing from the
 * list will be "matched" to its nearest wrong neighbour instead.
 *
 * @param filmdevFilmString - Film name provided by filmdev.org
 * @param availableFilms - Collection of locally known films to search
 * @returns The matching `Film`, or `null` when no plausible match exists
 */
export function findBestFilmMatch(
  filmdevFilmString: string,
  availableFilms: Film[]
): Film | null {
  if (!filmdevFilmString.trim() || !availableFilms.length) return null;
  const query = parseQuery(filmdevFilmString);

  return pickBest(availableFilms, (film) => {
    const scores = [
      scoreCandidate(query, film.brand, film.name, film.isoSpeed),
      ...(film.aliases ?? []).map((alias) =>
        scoreCandidate(query, '', alias.name, film.isoSpeed)
      ),
    ].filter((s): s is number => s !== null);
    return scores.length ? Math.max(...scores) : null;
  });
}

/**
 * Finds the local developer a filmdev.org developer string names, or null
 * when none plausibly does. Blends such as "Kodak XTOL + Rodinal" never
 * match a single developer.
 *
 * @param filmdevDeveloperString - Developer name provided by filmdev.org
 * @param availableDevelopers - Collection of locally known developers to search
 * @returns Matching developer, or null when no plausible match exists
 */
export function findBestDeveloperMatch(
  filmdevDeveloperString: string,
  availableDevelopers: Developer[]
): Developer | null {
  if (!filmdevDeveloperString.trim() || !availableDevelopers.length)
    return null;
  // "A + B" between words is a blend; "1+2" is a dilution and stays.
  if (/[a-z0-9]\s*\+\s*[a-z]/i.test(filmdevDeveloperString)) return null;
  const query = parseQuery(filmdevDeveloperString);

  return pickBest(availableDevelopers, (developer) =>
    scoreCandidate(query, developer.manufacturer, developer.name)
  );
}

/**
 * Creates a custom film entry from filmdev.org data when no match is found.
 * Attempts to parse brand and name from the input string.
 *
 * @param filmString - Film name string from filmdev.org
 * @returns Custom film data object with parsed brand, name, and defaults
 * @example
 * ```typescript
 * const film = createCustomFilmFromFilmdev('Kodak Tri-X 400');
 * console.log(film); // { brand: 'Kodak', name: 'Tri-X 400', isoSpeed: 400, ... }
 * ```
 */
export function createCustomFilmFromFilmdev(
  filmString: string
): CustomFilmData {
  // Try to parse brand and name from the string
  // Common patterns: "Brand Name", "Brand Film Name", etc.
  const parts = filmString.trim().split(/\s+/);

  let brand = '';
  let name = filmString.trim();

  // If multiple words, assume first word is brand
  if (parts.length > 1) {
    brand = parts[0];
    name = parts.slice(1).join(' ');
  }

  // If only one word, use it as both brand and name
  if (parts.length === 1) {
    brand = parts[0];
    name = parts[0];
  }

  return {
    brand,
    name,
    // Box speed from the name ("Kodak Tri-X 400"), else 400; user can adjust
    isoSpeed: extractIsoFromString(filmString) ?? 400,
    colorType: 'bw', // Default to B&W, user can adjust
    description: `Imported from filmdev.org: ${filmString}`,
  };
}

/**
 * Creates a custom developer entry from filmdev.org data when no match is found.
 * Attempts to parse manufacturer and name from the input string.
 *
 * @param developerString - Developer name string from filmdev.org
 * @returns Custom developer data object with parsed manufacturer, name, and defaults
 * @example
 * ```typescript
 * const dev = createCustomDeveloperFromFilmdev('Kodak D-76');
 * console.log(dev); // { manufacturer: 'Kodak', name: 'D-76', type: 'liquid', ... }
 * ```
 */
export function createCustomDeveloperFromFilmdev(
  developerString: string
): CustomDeveloperData {
  // Try to parse manufacturer and name
  const parts = developerString.trim().split(/\s+/);

  let manufacturer = '';
  let name = developerString.trim();

  // If multiple words, assume first word is manufacturer
  if (parts.length > 1) {
    manufacturer = parts[0];
    name = parts.slice(1).join(' ');
  }

  // If only one word, use it as both
  if (parts.length === 1) {
    manufacturer = parts[0];
    name = parts[0];
  }

  return {
    manufacturer,
    name,
    type: 'liquid', // Default type, user can adjust
    filmOrPaper: 'film',
    notes: `Imported from filmdev.org: ${developerString}`,
    dilutions: [{ name: 'Stock', dilution: 'Stock' }],
  };
}

/**
 * Parses temperature from filmdev.org string format, preferring Fahrenheit.
 * Falls back to Celsius conversion if Fahrenheit is not available.
 *
 * @param celsiusString - Temperature string in Celsius from filmdev.org
 * @param fahrenheitString - Temperature string in Fahrenheit from filmdev.org
 * @returns Parsed temperature in Fahrenheit, defaults to 68°F if parsing fails
 * @example
 * ```typescript
 * const temp = parseTemperature('20', '68');
 * console.log(temp); // 68 (prefers Fahrenheit)
 *
 * const temp2 = parseTemperature('20', '');
 * console.log(temp2); // 68.0 (converted from Celsius)
 * ```
 */
export function parseTemperature(
  celsiusString: string,
  fahrenheitString: string
): number {
  // Try to parse Fahrenheit first since that's what your system uses
  const fahrenheit = parseFloat(fahrenheitString);
  if (!Number.isNaN(fahrenheit) && fahrenheit > 0) {
    return fahrenheit;
  }

  // Fall back to Celsius and convert
  const celsius = parseFloat(celsiusString);
  if (!Number.isNaN(celsius) && celsius > 0) {
    return roundTemperature(toFahrenheit(celsius));
  }

  // Default to room temperature
  return 68;
}

/**
 * Maps a filmdev.org recipe to CustomRecipeFormData format for form integration.
 * Handles temperature conversion, time calculation, and custom film/developer creation.
 *
 * @param recipe - Raw recipe data from filmdev.org API
 * @param matchedFilm - Matched film from local database, if any
 * @param matchedDeveloper - Matched developer from local database, if any
 * @param filmId - Optional film UUID for existing film selection
 * @param developerId - Optional developer UUID for existing developer selection
 * @returns Form data object ready for recipe creation
 * @example
 * ```typescript
 * const formData = mapFilmdevRecipeToFormData(
 *   filmdevRecipe,
 *   matchedFilm,
 *   null, // no developer match
 *   'film-uuid'
 * );
 * console.log(formData.useExistingFilm); // true
 * console.log(formData.useExistingDeveloper); // false
 * ```
 */
export function mapFilmdevRecipeToFormData(
  recipe: FilmdevRecipe,
  matchedFilm: Film | null,
  matchedDeveloper: Developer | null,
  filmId?: string,
  developerId?: string
): CustomRecipeFormData {
  const temperatureF = parseTemperature(recipe.celcius, recipe.fahrenheit);
  // Convert duration to total minutes (hours + minutes + seconds/60)
  const timeMinutes =
    (recipe.duration_hours || 0) * 60 +
    (recipe.duration_minutes || 0) +
    (recipe.duration_seconds || 0) / 60;

  // Create custom film/developer data if no matches found
  const customFilm = !matchedFilm
    ? createCustomFilmFromFilmdev(recipe.film)
    : undefined;
  const customDeveloper = !matchedDeveloper
    ? createCustomDeveloperFromFilmdev(recipe.developer)
    : undefined;

  // Build dilution info from dilution_ratio
  let customDilution = '';
  if (
    recipe.dilution_ratio &&
    recipe.dilution_ratio.toLowerCase() !== 'stock'
  ) {
    customDilution = recipe.dilution_ratio;
  }

  // Use the recipe name from filmdev.org if available, otherwise create one
  const recipeName =
    recipe.recipe_name ||
    `${recipe.film} + ${recipe.developer}${
      recipe.dilution_ratio ? ` (${recipe.dilution_ratio})` : ''
    }`;

  // Box speed from the matched film, else from the film name
  const boxSpeedIso =
    matchedFilm?.isoSpeed || extractIsoFromString(recipe.film) || null;

  // developed_at is the ISO the film was shot at. filmdev.org leaves it
  // empty for box-speed recipes, so an empty one means box speed, not a push.
  const shootingIso = recipe.developed_at || boxSpeedIso || 400;

  // Calculate push/pull stops: log2(shootingIso / boxSpeedIso)
  // Positive = push (shot at higher ISO), Negative = pull (shot at lower ISO)
  const pushPull =
    boxSpeedIso && shootingIso !== boxSpeedIso
      ? Math.round(Math.log2(shootingIso / boxSpeedIso))
      : 0;

  // Build the source URL from recipe_link or construct from ID
  const sourceUrl =
    recipe.recipe_link || `https://filmdev.org/recipe/show/${recipe.id}`;

  return {
    name: recipeName,
    useExistingFilm: !!matchedFilm,
    selectedFilmId: filmId || '',
    customFilm,
    useExistingDeveloper: !!matchedDeveloper,
    selectedDeveloperId: developerId || '',
    customDeveloper,
    temperatureF,
    timeMinutes,
    shootingIso,
    pushPull,
    agitationSchedule: '30s initial, 10s every minute', // Default schedule
    notes:
      recipe.notes || `Imported from filmdev.org (Recipe ID: ${recipe.id})`,
    customDilution,
    isPublic: false, // Default to private
    tags: ['filmdev.org'], // Automatically tag filmdev.org imports
    sourceUrl, // Link back to filmdev.org recipe
  };
}

/**
 * Result type for the mapping process
 */
export interface FilmdevMappingResult {
  formData: CustomRecipeFormData;
  matchedFilm: Film | null;
  matchedDeveloper: Developer | null;
  isFilmCustom: boolean;
  isDeveloperCustom: boolean;
  originalRecipe: FilmdevRecipe;
}

/**
 * Complete mapping function that handles film/developer matching and form data creation.
 * Orchestrates the entire process of converting a filmdev.org recipe to local format.
 *
 * @param recipe - Raw recipe data from filmdev.org API
 * @param availableFilms - Array of available films in local database
 * @param availableDevelopers - Array of available developers in local database
 * @returns Complete mapping result with form data, matches, and metadata
 * @example
 * ```typescript
 * const result = mapFilmdevRecipe(filmdevRecipe, films, developers);
 * console.log(result.formData); // Ready-to-use form data
 * console.log(result.isFilmCustom); // true if no film match found
 * console.log(result.matchedDeveloper); // Matched developer or null
 * ```
 */
export function mapFilmdevRecipe(
  recipe: FilmdevRecipe,
  availableFilms: Film[],
  availableDevelopers: Developer[]
): FilmdevMappingResult {
  const matchedFilm = findBestFilmMatch(recipe.film, availableFilms);
  const matchedDeveloper = findBestDeveloperMatch(
    recipe.developer,
    availableDevelopers
  );

  const formData = mapFilmdevRecipeToFormData(
    recipe,
    matchedFilm,
    matchedDeveloper,
    matchedFilm?.uuid,
    matchedDeveloper?.uuid
  );

  return {
    formData,
    matchedFilm,
    matchedDeveloper,
    isFilmCustom: !matchedFilm,
    isDeveloperCustom: !matchedDeveloper,
    originalRecipe: recipe,
  };
}
