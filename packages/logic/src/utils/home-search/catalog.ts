/**
 * Catalog answers: recipes for a film and developer, reciprocity for a film,
 * and the grouped lookup results. Everything shown comes from the data; a
 * value the source lacks is reported as missing, never filled in.
 */

import type { Combination, Developer, Film } from '@dorkroom/api';
import { isRecipeUrlDilution } from '../../constants/development-recipes';
import { RECIPROCITY_FILM_TYPES } from '../../constants/reciprocity';
import { reciprocityCalculatorLink } from '../../schemas/reciprocity-calculator.schema';
import { getCombinationDilution } from '../combination-dilution';
import { parseDilution } from '../dilution-parser';
import { calculatePushPull } from '../exposure-calculations';
import {
  calculateReciprocity,
  formatReciprocityTime,
} from '../reciprocity-calculations';
import {
  formatTemperature,
  STANDARD_TEMP_C,
  type TemperatureUnit,
  toFahrenheit,
} from '../temperature';
import {
  fact,
  formatClock,
  formatPushPull,
  plural,
  recipeSourceLabel,
  signed,
  sourceFact,
  trimNumber,
} from './format';
import { tokenize } from './query';
import type {
  DevelopmentLinkSearch,
  HomeAnswer,
  HomeResultGroup,
  HomeSearchData,
} from './types';

export interface FilmEntry {
  film: Film;
  name: string;
  own: string[];
  brand: string[];
  recipes: number;
  /** Reciprocity exponent from the film data, or null when it has none. */
  factor: number | null;
}

export interface DeveloperEntry {
  developer: Developer;
  name: string;
  own: string[];
  brand: string[];
  recipes: number;
}

export interface Catalog {
  films: FilmEntry[];
  developers: DeveloperEntry[];
  combinations: readonly Combination[];
  filmBySlug: ReadonlyMap<string, FilmEntry>;
  developerBySlug: ReadonlyMap<string, DeveloperEntry>;
  /** Films and developers have loaded, so any name in a query is known. */
  namesLoaded: boolean;
  /** Films, developers and recipes have all loaded. */
  complete: boolean;
}

/** "Ilford DD-X", "Acufine": the maker, unless the name already starts with it. */
function developerName(developer: Developer): string {
  const maker = tokenize(developer.manufacturer)[0];
  return maker && tokenize(developer.name)[0] === maker
    ? developer.name
    : `${developer.manufacturer} ${developer.name}`;
}

function filmFactor(film: Film): number | null {
  const factor = Number.parseFloat(film.reciprocityFailure ?? '');
  return Number.isFinite(factor) && factor > 0 ? factor : null;
}

let memo: { data: HomeSearchData; catalog: Catalog } | null = null;

/** Index the data for matching. Memoised on the arrays' identity. */
export function getCatalog(data: HomeSearchData): Catalog {
  if (
    memo &&
    memo.data.films === data.films &&
    memo.data.developers === data.developers &&
    memo.data.combinations === data.combinations
  ) {
    return memo.catalog;
  }
  const combinations = data.combinations ?? [];
  const filmRecipes = new Map<string, number>();
  const developerRecipes = new Map<string, number>();
  for (const c of combinations) {
    filmRecipes.set(c.filmSlug, (filmRecipes.get(c.filmSlug) ?? 0) + 1);
    developerRecipes.set(
      c.developerSlug,
      (developerRecipes.get(c.developerSlug) ?? 0) + 1
    );
  }

  const filmBySlug = new Map<string, FilmEntry>();
  const films = (data.films ?? []).map((film) => {
    const brand = tokenize(film.brand);
    const brandWords = new Set(brand);
    const entry: FilmEntry = {
      film,
      name: `${film.brand} ${film.name}`,
      own: tokenize(
        [film.name, ...film.aliases.map((a) => a.name)].join(' ')
      ).filter((t) => !brandWords.has(t)),
      brand,
      recipes:
        (filmRecipes.get(film.slug) ?? 0) +
        film.aliases.reduce((n, a) => n + (filmRecipes.get(a.slug) ?? 0), 0),
      factor: filmFactor(film),
    };
    filmBySlug.set(film.slug, entry);
    for (const alias of film.aliases) filmBySlug.set(alias.slug, entry);
    return entry;
  });

  const developerBySlug = new Map<string, DeveloperEntry>();
  const developers = (data.developers ?? []).map((developer) => {
    const entry: DeveloperEntry = {
      developer,
      name: developerName(developer),
      own: tokenize(developer.name),
      brand: tokenize(developer.manufacturer),
      recipes: developerRecipes.get(developer.slug) ?? 0,
    };
    developerBySlug.set(developer.slug, entry);
    return entry;
  });

  const catalog: Catalog = {
    films,
    developers,
    combinations,
    filmBySlug,
    developerBySlug,
    namesLoaded: Boolean(data.films && data.developers),
    complete: Boolean(data.films && data.developers && data.combinations),
  };
  memo = { data, catalog };
  return catalog;
}

/* ------------------------------------------------------------------ *
   Matching
 * ------------------------------------------------------------------ */

interface Scored<E> {
  entry: E;
  score: number;
  own: number;
  /** Indexes of the query tokens this entry used. */
  used: number[];
}

const hasLetter = (token: string) => /[a-z]/.test(token);

/**
 * Score an entry against query tokens: words of its own name count most,
 * its maker's words less, and a bare number ("400") never identifies one.
 */
function score<E extends { own: string[]; brand: string[] }>(
  entry: E,
  tokens: readonly string[]
): Scored<E> {
  let own = 0;
  let brand = 0;
  const used: number[] = [];
  tokens.forEach((token, index) => {
    const letter = hasLetter(token);
    if (
      entry.own.some(
        (word) =>
          word === token ||
          (letter && token.length >= 2 && word.startsWith(token))
      )
    ) {
      own += letter ? 2 : 1;
      used.push(index);
    } else if (
      letter &&
      entry.brand.some(
        (word) =>
          word === token || (token.length >= 3 && word.startsWith(token))
      )
    ) {
      brand += 1;
      used.push(index);
    }
  });
  const named = used.some((index) => hasLetter(tokens[index]));
  return named
    ? { entry, score: own * 3 + brand, own, used }
    : { entry, score: 0, own: 0, used: [] };
}

/** Every entry the tokens match, best first, ties to the one with more recipes. */
export function rank<
  E extends { own: string[]; brand: string[]; recipes: number },
>(entries: readonly E[], tokens: readonly string[]): Scored<E>[] {
  return entries
    .map((entry) => score(entry, tokens))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.recipes - a.entry.recipes);
}

/** The entry the tokens name, if one matches on its own name (not just its maker). */
function best<E extends { own: string[]; brand: string[]; recipes: number }>(
  entries: readonly E[],
  tokens: readonly string[]
): Scored<E> | null {
  return rank(entries, tokens).find((s) => s.own > 0) ?? null;
}

const STOP_WORDS = new Set([
  'at',
  'in',
  'with',
  'for',
  'the',
  'a',
  'of',
  'to',
  'on',
  'how',
  'long',
  'develop',
  'developing',
  'time',
  'times',
  'iso',
  'ei',
  'shot',
  'dev',
  'and',
  'my',
  'recipe',
  'recipes',
  'reciprocity',
  'night',
  'exposure',
  'film',
  'dilution',
  'stock',
  'push',
  'pushed',
  'pull',
  'pulled',
  'rated',
]);

/** A connective or question word that never names a film, developer or tool. */
export const isStopWord = (word: string): boolean => STOP_WORDS.has(word);

/** The query's words that could name a film, developer or tool. */
export function catalogTokens(text: string): string[] {
  return tokenize(text).filter((t) => !isStopWord(t));
}

export interface CatalogMatch {
  film: Scored<FilmEntry> | null;
  developer: Scored<DeveloperEntry> | null;
}

export function matchCatalog(
  catalog: Catalog,
  tokens: readonly string[]
): CatalogMatch {
  const film = best(catalog.films, tokens);
  const used = new Set(film?.used);
  const rest = tokens.filter((_, i) => !used.has(i));
  return { film, developer: best(catalog.developers, rest) };
}

/* ------------------------------------------------------------------ *
   Recipes
 * ------------------------------------------------------------------ */

type RecipeAnswer = Extract<HomeAnswer, { kind: 'recipe' | 'no_recipe' }>;

/** Same mix, however it is written: "1+31" matches "1:31", "stock" matches "Stock". */
function sameDilution(a: string, b: string): boolean {
  const x = parseDilution(a);
  const y = parseDilution(b);
  if (!x || !y) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return (
    x.type === y.type &&
    x.concentrateParts * y.totalParts === y.concentrateParts * x.totalParts
  );
}

function recipeLink(
  combination: Combination,
  dilution: string
): DevelopmentLinkSearch {
  return {
    film: combination.filmSlug,
    developer: combination.developerSlug,
    iso: String(combination.shootingIso),
    dilution: isRecipeUrlDilution(dilution) ? dilution : undefined,
    recipe: combination.uuid,
  };
}

/**
 * The recipes for a film, a developer, or both (a film's aliases count as
 * the film). With neither given, none.
 */
export function recipesOf(
  catalog: Catalog,
  { film, developer }: { film?: FilmEntry; developer?: DeveloperEntry }
): Combination[] {
  if (!film && !developer) return [];
  return catalog.combinations.filter(
    (c) =>
      (!film || catalog.filmBySlug.get(c.filmSlug) === film) &&
      (!developer || c.developerSlug === developer.developer.slug)
  );
}

export interface RecipeWish {
  iso: number | null;
  dilution: { dilution: string; label: string } | null;
  celsius: number | null;
}

/**
 * A temperature in the viewer's unit ("20°C" or "68°F"), from Celsius and,
 * when the source has it, its own Fahrenheit value.
 */
const temperatureIn = (
  unit: TemperatureUnit,
  celsius: number,
  fahrenheit = toFahrenheit(celsius)
) =>
  formatTemperature(unit === 'celsius' ? celsius : fahrenheit, unit, {
    trimTrailingZero: true,
  });
const OTHER_UNIT = { celsius: 'fahrenheit', fahrenheit: 'celsius' } as const;

export function recipeAnswer(
  catalog: Catalog,
  film: FilmEntry,
  developer: DeveloperEntry,
  wish: RecipeWish,
  unit: TemperatureUnit = 'celsius'
): RecipeAnswer {
  const title = `${film.name} in ${developer.name}`;
  const all = recipesOf(catalog, { film, developer });
  if (all.length === 0) {
    return {
      kind: 'no_recipe',
      title,
      badge: 'No recipe',
      readAs: [],
      figure: null,
      facts: [],
      notes: [
        `No recipe for this pair yet.${film.recipes ? ` ${film.film.name} has ${plural(film.recipes, 'recipe')} in other developers.` : ''}`,
      ],
      footnote: null,
      link: {
        label: `Browse ${film.film.name} recipes`,
        target: { to: '/development', search: { film: film.film.slug } },
      },
    };
  }

  const dilutionOf = (c: Combination) =>
    getCombinationDilution(c, developer.developer);
  const iso = wish.iso ?? film.film.isoSpeed;
  let candidates = all.filter((c) => c.shootingIso === iso);
  const isoMissing = candidates.length === 0;
  if (isoMissing) candidates = all;
  let dilutionMissing = false;
  if (wish.dilution) {
    const wanted = wish.dilution.dilution;
    const matching = candidates.filter((c) =>
      sameDilution(dilutionOf(c), wanted)
    );
    dilutionMissing = matching.length === 0;
    if (!dilutionMissing) candidates = matching;
  }
  const temperature = wish.celsius ?? STANDARD_TEMP_C;
  const dilutionRank = (c: Combination) => {
    const d = dilutionOf(c).toLowerCase();
    return d === 'stock' ? 0 : d === '1+1' ? 1 : 2;
  };
  const recipe = candidates.toSorted(
    (a, b) =>
      Math.abs(a.temperatureC - temperature) -
        Math.abs(b.temperatureC - temperature) ||
      Math.abs(a.shootingIso - iso) - Math.abs(b.shootingIso - iso) ||
      dilutionRank(a) - dilutionRank(b)
  )[0];
  const dilution = dilutionOf(recipe);
  const speeds = [...new Set(all.map((c) => c.shootingIso))].sort(
    (a, b) => a - b
  );

  const notes: string[] = [];
  if (isoMissing) {
    notes.push(
      `No recipe at EI ${iso} for this pair. Listed speeds: ${speeds.join(', ')}.`
    );
  }
  if (wish.dilution && dilutionMissing) {
    notes.push(
      `No recipe at ${wish.dilution.label} for this pair. Showing ${dilution}.`
    );
  }
  if (wish.celsius !== null && recipe.temperatureC !== wish.celsius) {
    notes.push(
      `No recipe at ${temperatureIn(unit, wish.celsius)}. This one is at ${temperatureIn(unit, recipe.temperatureC, recipe.temperatureF)}.`
    );
  }
  const others = all.length - 1;

  return {
    kind: 'recipe',
    title,
    badge: recipeSourceLabel(recipe.tags),
    readAs: [],
    figure: {
      value: formatClock(recipe.timeMinutes),
      unit: 'min',
      caption: `at ${temperatureIn(unit, recipe.temperatureC, recipe.temperatureF)} (${temperatureIn(OTHER_UNIT[unit], recipe.temperatureC, recipe.temperatureF)})`,
    },
    facts: [
      fact('Dilution', dilution),
      fact(
        'Rated at',
        `EI ${recipe.shootingIso}`,
        formatPushPull(
          calculatePushPull(recipe.shootingIso, film.film.isoSpeed)
        )
      ),
      fact(
        'Agitation',
        recipe.agitationMethod
          ? recipe.agitationMethod.charAt(0).toUpperCase() +
              recipe.agitationMethod.slice(1)
          : null
      ),
      sourceFact(recipe.infoSource),
    ],
    notes,
    footnote:
      others === 0
        ? 'The only recipe for this pair.'
        : `${plural(others, 'other recipe')} for this pair, EI ${speeds.join(', ')}`,
    link: {
      label: 'Open recipe',
      target: { to: '/development', search: recipeLink(recipe, dilution) },
    },
  };
}

/* ------------------------------------------------------------------ *
   Reciprocity
 * ------------------------------------------------------------------ */

type ReciprocityAnswer = Extract<HomeAnswer, { kind: 'reciprocity' }>;

/** The metered time a reciprocity answer assumes when none was typed. */
const DEFAULT_METERED_SECONDS = 30;

/**
 * The reciprocity calculator's own preset for a film, when one has the same
 * factor and its label's words are all in the film's name (or an alias).
 */
function reciprocityPreset(entry: FilmEntry): string | null {
  const words = new Set([...entry.brand, ...entry.own]);
  const preset = RECIPROCITY_FILM_TYPES.find(
    (p) =>
      p.factor === entry.factor &&
      tokenize(p.label.replace(/\+/g, ' plus')).every((w) => words.has(w))
  );
  return preset?.value ?? null;
}

export function reciprocityAnswer(
  entry: FilmEntry & { factor: number },
  seconds: number | null
): ReciprocityAnswer | null {
  const metered = seconds ?? DEFAULT_METERED_SECONDS;
  const preset = reciprocityPreset(entry);
  const result = calculateReciprocity({
    meteredSeconds: metered,
    filmType: preset ?? 'custom',
    customFactor: entry.factor,
  });
  if (!result) return null;
  const meteredText = formatReciprocityTime(metered);
  return {
    kind: 'reciprocity',
    title: `${entry.name} for ${meteredText} metered`,
    badge: 'Reciprocity',
    readAs: [
      { text: entry.name, assumed: false },
      {
        text: `${meteredText} metered${seconds === null ? ' (default)' : ''}`,
        assumed: seconds === null,
      },
    ],
    figure: {
      value: formatReciprocityTime(result.adjustedTime),
      unit: null,
      caption: 'corrected exposure',
    },
    facts: [
      fact('Factor', trimNumber(entry.factor, 2)),
      fact('Formula', `t^${trimNumber(entry.factor, 2)}`),
      fact(
        'Extra',
        `${signed(Math.log2(result.adjustedTime / metered), 1)} stops`
      ),
      fact('Source', 'Film database'),
    ],
    notes:
      seconds === null
        ? [
            `Assumed ${meteredText} metered. Add a time, like “${entry.film.name.toLowerCase()} 2m”.`,
          ]
        : [],
    footnote: 'Bracket long exposures; reciprocity data is a starting point.',
    link: {
      label: 'Open in Reciprocity',
      target: {
        to: '/reciprocity',
        search: reciprocityCalculatorLink.build({
          filmType: preset ?? 'custom',
          meteredTime: `${trimNumber(metered, 2)}s`,
          customFactor: preset ? undefined : entry.factor,
        }),
      },
    },
  };
}

/* ------------------------------------------------------------------ *
   Grouped results
 * ------------------------------------------------------------------ */

const FILM_TYPES = new Map([
  ['bw', 'B&W negative'],
  ['color', 'Colour negative'],
  ['slide', 'Slide'],
]);

export function catalogGroups(
  catalog: Catalog,
  tokens: readonly string[],
  match: CatalogMatch,
  iso: number | null,
  unit: TemperatureUnit = 'celsius'
): HomeResultGroup[] {
  const groups: HomeResultGroup[] = [];
  const film = match.film?.entry;
  const developer = match.developer?.entry;

  let recipes = recipesOf(catalog, { film, developer });
  if (iso !== null) {
    const atIso = recipes.filter((c) => c.shootingIso === iso);
    if (atIso.length) recipes = atIso;
  }
  recipes = recipes.toSorted(
    (a, b) =>
      Math.abs(a.temperatureC - STANDARD_TEMP_C) -
        Math.abs(b.temperatureC - STANDARD_TEMP_C) ||
      a.shootingIso - b.shootingIso
  );
  if (recipes.length) {
    groups.push({
      key: 'recipes',
      label: 'Development recipes',
      total: recipes.length,
      items: recipes.slice(0, 4).map((c) => {
        const f = catalog.filmBySlug.get(c.filmSlug);
        const d = catalog.developerBySlug.get(c.developerSlug);
        const dilution = getCombinationDilution(c, d?.developer);
        return {
          title: `${f?.name ?? c.filmSlug} in ${d?.name ?? c.developerSlug} ${dilution}`,
          detail: `EI ${c.shootingIso} · ${temperatureIn(unit, c.temperatureC, c.temperatureF)} · ${recipeSourceLabel(c.tags)}`,
          meta: formatClock(c.timeMinutes),
          target: { to: '/development', search: recipeLink(c, dilution) },
        };
      }),
    });
  }

  const films = rank(catalog.films, tokens);
  if (films.length) {
    groups.push({
      key: 'films',
      label: 'Film stocks',
      total: films.length,
      items: films.slice(0, 3).map(({ entry }) => ({
        title: entry.name,
        detail: `${FILM_TYPES.get(entry.film.colorType) ?? 'Film'} · ISO ${entry.film.isoSpeed}${entry.film.discontinued ? ' · discontinued' : ''}`,
        meta: entry.recipes
          ? plural(entry.recipes, 'recipe')
          : entry.factor
            ? `reciprocity ${trimNumber(entry.factor, 2)}`
            : '',
        target: { to: '/films', search: { film: entry.film.slug } },
      })),
    });
  }

  const developers = rank(catalog.developers, tokens);
  if (developers.length) {
    groups.push({
      key: 'developers',
      label: 'Developers',
      total: developers.length,
      items: developers.slice(0, 3).map(({ entry }) => {
        const dilutions = entry.developer.dilutions.map(
          (d) => d.dilution || d.name
        );
        return {
          title: entry.name,
          detail: `${dilutions.slice(0, 4).join(' · ')}${dilutions.length > 4 ? ' …' : ''}`,
          meta: plural(entry.recipes, 'recipe'),
          target: {
            to: '/development',
            search: { developer: entry.developer.slug },
          },
        };
      }),
    });
  }
  return groups;
}
