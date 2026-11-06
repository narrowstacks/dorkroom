import type { Developer, Film } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '../types/development-recipe-view';
import { getCombinationDilution } from './combination-dilution';
import { sameDilution } from './dilution-parser';
import {
  catalogTokens,
  developerNames,
  filmNames,
  matchesNames,
  type NameMatch,
  type NameWords,
} from './home-search/catalog';
import {
  blank,
  findDilution,
  findIso,
  findTemperature,
  prepare,
  type TypedTemperature,
} from './home-search/query';
import { onIsoSeries } from './home-search/search';
import {
  getRecipeRows,
  recipeIdOf,
  type RecipeIndex,
} from './recipe-selection';

type RecipeView = DevelopmentCombinationView;

const DEFAULT_LIMIT = 8;

/**
 * A recipe the search found. Everything the page needs to fill both pickers and
 * open it. `film` is the one behind `filmKey`, which on a rebrand-shared row is
 * not `view.film`, so show this name. Read time and temperature off
 * `view.combination`: they are the published row's own values.
 */
export interface RecipeSearchHit {
  recipeId: string;
  filmKey: string;
  developerKey: string;
  view: RecipeView;
  film: Film;
  developer: Developer;
  dilution: string;
}

export interface RecipeSearchResult {
  /** Fastest first, at most `limit`. */
  hits: RecipeSearchHit[];
  /** How many matched before the cap. */
  total: number;
  /** There are more than `hits` shows, so the search could be narrowed. */
  truncated: boolean;
}

export interface RecipeSearchOptions {
  limit?: number;
}

const isNumber = (token: string) => /^\d+$/.test(token);

/**
 * What this box accepts beyond home's reader. Local, because changing home's
 * aliases or stop words would change its answers.
 */
const QUERY_REWRITES: ReadonlyArray<readonly [RegExp, string]> = [
  // "hp5+ 800" would otherwise read as a dilution of 5+800.
  [/([a-z]\d*)\s*\+/g, '$1 plus '],
  [/(\d)\s*(?:(?:deg(?:rees?)?|°)\s*f(?:ahrenheit)?|fahrenheit)\b/g, '$1f'],
  [/(\d)\s*(?:(?:deg(?:rees?)?|°)\s*c(?:elsius)?|celsius)\b/g, '$1c'],
  // With no unit, no one develops at 40C or above, and no one means 24F.
  [/\b([4-9]\d|\d{3})(\.\d)?\s*(?:deg(?:rees?)?\b|°)/g, '$1$2f'],
  [/\b(\d{1,2})(\.\d)?\s*(?:deg(?:rees?)?\b|°)/g, '$1$2c'],
  // A time is what the search answers, not something to search by.
  [/\b\d+(?:\.\d+)?\s*(?:m|mins?|minutes?)\b/g, ' '],
  // "hc-110 c" would otherwise read as 110C.
  [/\b(hc(?:[-\s]?110)?)\s+([a-h])\b/g, '$1 dilution $2'],
  [/\bfujifilm\b/g, 'fuji'],
  [/\bilfotec\s+(?=dd[-\s]?x\b)/g, ''],
  // Home drops "dev" as a stop word; here it says which name the word before is.
  [/\bdev\b/g, 'developer'],
];

/** Words that ask nothing of a recipe, unless a name has them (Tanol Speed). */
const IGNORED_WORDS = new Set(['speed', 'box']);

const DEVELOPER_WORD = 'developer';

interface RecipeQuery {
  temperature: TypedTemperature | null;
  /** The ratio asked for, in the form `sameDilution` reads. */
  dilution: string | null;
  /** A speed typed as one: "at 800", "ei 800". */
  typedSpeed: number | null;
  /** Words and numbers left to read against names. */
  tokens: string[];
  /** Numbers the words before them already say ("delta400 400"). */
  repeatedNumbers: number[];
  /** Indexes of tokens followed by "developer", as in "tmax rs dev". */
  beforeDeveloperWord: ReadonlySet<number>;
}

/**
 * Sort the query's words. Neighbours that are one word of a name join ("tri x",
 * "hc 110"), because home's matcher would spend "tri" and "hc" as prefixes and
 * leave the rest over, and here a word left over means no match. A run into a
 * full name ("delta 100") also settles that the number is the name.
 */
function readTokens(
  words: readonly string[],
  nameWords: ReadonlySet<string>
): Pick<RecipeQuery, 'tokens' | 'repeatedNumbers' | 'beforeDeveloperWord'> {
  const tokens: string[] = [];
  const repeatedNumbers: number[] = [];
  const beforeDeveloperWord = new Set<number>();
  for (const word of words) {
    const last = tokens.at(-1);
    // Joining comes first: "tmax dev" is T-MAX Developer exactly, not T-MAX RS.
    if (word === DEVELOPER_WORD && !(last && nameWords.has(last + word))) {
      if (last) beforeDeveloperWord.add(tokens.length - 1);
    } else if (IGNORED_WORDS.has(word) && !nameWords.has(word)) {
      // Asks nothing.
    } else if (
      last &&
      !beforeDeveloperWord.has(tokens.length - 1) &&
      nameWords.has(last + word)
    ) {
      tokens[tokens.length - 1] = last + word;
    } else if (isNumber(word) && tokens.some((t) => t.endsWith(word))) {
      repeatedNumbers.push(Number(word));
    } else {
      tokens.push(word);
    }
  }
  return { tokens, repeatedNumbers, beforeDeveloperWord };
}

/** Read a query into what it asks for, or null when it asks for nothing. */
function readRecipeQuery(
  query: string,
  nameWords: ReadonlySet<string>
): RecipeQuery | null {
  let text = QUERY_REWRITES.reduce(
    (rewritten, [pattern, replacement]) =>
      rewritten.replace(pattern, replacement),
    prepare(query)
  );
  // Temperature first, so "at 24c" is never read as EI 24.
  const temperature = findTemperature(text);
  if (temperature) text = blank(text, temperature.index, temperature.length);
  const iso = findIso(text);
  if (iso) text = blank(text, iso.index, iso.length);
  const dilution = findDilution(text);
  if (dilution) text = blank(text, dilution.index, dilution.length);

  const read = readTokens(catalogTokens(text), nameWords);
  const asksSomething =
    temperature ||
    iso ||
    dilution ||
    read.tokens.length + read.repeatedNumbers.length > 0;
  return asksSomething
    ? {
        temperature: temperature?.temperature ?? null,
        dilution: dilution?.dilution ?? null,
        typedSpeed: iso?.iso ?? null,
        ...read,
      }
    : null;
}

/** Half a degree either way, so a whole 65F (18.3C) still finds 18C. */
const isAtTemperature = (
  { combination }: RecipeView,
  { celsius }: TypedTemperature
) => Math.abs(combination.temperatureC - celsius) <= 0.5;

/**
 * The tokens a film really covers. Not a word inside a joined token it already
 * used ("tmax" beside "tmax400"), and not one "developer" gave to a developer.
 */
function filmCoverage(
  match: NameMatch | null,
  names: NameWords,
  tokens: readonly string[],
  forDeveloper: ReadonlySet<number>
): number[] {
  if (!match) return [];
  const usedTokens = match.used.map((i) => tokens[i]);
  const own = new Set(names.own);
  const joined = new Set(names.joined);
  const covered = match.used.filter((i) => {
    const token = tokens[i];
    const inJoined = usedTokens.some(
      (other) =>
        other !== token &&
        own.has(token) &&
        joined.has(other) &&
        (other.startsWith(token) || other.endsWith(token))
    );
    return !inJoined && !forDeveloper.has(i);
  });
  return covered.some((i) => !isNumber(tokens[i])) ? covered : [];
}

interface PairMatch {
  filmKey: string;
  developerKey: string;
  recipes: readonly RecipeView[];
  filmUsed: readonly number[];
  developerUsed: readonly number[];
  /** The film's words, not only a maker it shares, are what named it here. */
  filmClaims: boolean;
  /** Numbers this pair's words say are part of a name. */
  claims: readonly number[];
}

const keysNamedByOwnWords = (
  words: ReadonlyMap<string, NameWords>,
  tokens: readonly string[]
) =>
  new Set(
    [...words]
      .filter(([, names]) => matchesNames({ ...names, brand: [] }, tokens))
      .map(([key]) => key)
  );

/** Pairs whose names cover every word of the query. Numbers are read later. */
function matchPairs(
  index: RecipeIndex,
  { tokens, beforeDeveloperWord }: RecipeQuery,
  filmWords: ReadonlyMap<string, NameWords>,
  developerWords: ReadonlyMap<string, NameWords>
): PairMatch[] {
  const developerUsed = new Map(
    [...developerWords].map(([key, names]) => [
      key,
      matchesNames(names, tokens)?.used ?? [],
    ])
  );
  // "hp5 developer" has no such developer, so the word just asks nothing.
  const forDeveloper = new Set(
    [...developerUsed.values()].flat().filter((i) => beforeDeveloperWord.has(i))
  );
  const filmUsed = new Map(
    [...filmWords].map(([key, names]) => [
      key,
      filmCoverage(matchesNames(names, tokens), names, tokens, forDeveloper),
    ])
  );
  const filmsByOwnWords = keysNamedByOwnWords(filmWords, tokens);
  const developersByOwnWords = keysNamedByOwnWords(developerWords, tokens);

  const matches: PairMatch[] = [];
  for (const [filmKey, byDeveloper] of index.pairs) {
    const byFilm = filmUsed.get(filmKey) ?? [];
    for (const [developerKey, recipes] of byDeveloper) {
      const byDeveloperName = developerUsed.get(developerKey) ?? [];
      const byDeveloperSet = new Set(byDeveloperName);
      const used = new Set([...byFilm, ...byDeveloperName]);
      if (!tokens.every((token, i) => used.has(i) || isNumber(token))) continue;
      // In "kodak xtol 400" the maker goes with the developer already named, so
      // it is any film at EI 400, not Tri-X at any speed. "kodak 400" names no
      // developer, so the 400 is the film's even though D-76 is also Kodak's.
      const makerIsDevelopers = developersByOwnWords.has(developerKey);
      const filmClaims =
        byFilm.length > 0 &&
        (filmsByOwnWords.has(filmKey) ||
          byFilm.some(
            (i) =>
              !isNumber(tokens[i]) &&
              !(makerIsDevelopers && byDeveloperSet.has(i))
          ));
      matches.push({
        filmKey,
        developerKey,
        recipes,
        filmUsed: byFilm,
        developerUsed: byDeveloperName,
        filmClaims,
        claims: [...(filmClaims ? byFilm : []), ...byDeveloperName].filter(
          (i) => isNumber(tokens[i])
        ),
      });
    }
  }
  return matches;
}

/**
 * The one speed a pair is asked for: null for any, undefined when the numbers
 * cannot be read for this pair.
 */
function speedFor(
  { filmUsed, developerUsed, filmClaims, recipes }: PairMatch,
  { tokens, repeatedNumbers, typedSpeed }: RecipeQuery,
  nameNumbers: ReadonlySet<number>,
  boxIso: number
): number | null | undefined {
  const used = new Set([...filmUsed, ...developerUsed]);
  const bare: number[] = [...repeatedNumbers];
  for (const [i, token] of tokens.entries()) {
    if (!isNumber(token)) continue;
    if (!nameNumbers.has(i)) bare.push(Number(token));
    else if (!used.has(i)) return undefined;
  }

  // Home's rule beside a named pair: "hp5 rodinal 50" and "hp5 xtol 68" are a
  // dilution or a temperature half-typed, so they do not filter.
  const published = new Set(recipes.map((v) => v.combination.shootingIso));
  const plausible =
    filmClaims && developerUsed.length > 0
      ? bare.filter((n) => published.has(n) || (n >= 100 && onIsoSeries(n)))
      : bare;

  const speeds = new Set(plausible);
  if (typedSpeed !== null) speeds.add(typedSpeed);
  // "hp5 400 xtol 1600": a box speed typed beside a push gives way to the push.
  if (filmClaims && speeds.size > 1) speeds.delete(boxIso);
  if (speeds.size > 1) return undefined;
  return [...speeds][0] ?? null;
}

/**
 * One temperature per dilution and speed, as `getRecipeRows` lists them, unless
 * one was typed: then it is every row at that temperature.
 */
const rowsFor = (
  recipes: readonly RecipeView[],
  temperature: TypedTemperature | null
) =>
  temperature
    ? recipes
        .filter((view) => isAtTemperature(view, temperature))
        .map((view) => ({
          view,
          dilution: getCombinationDilution(view.combination, view.developer),
        }))
    : getRecipeRows(recipes);

const NO_HITS: RecipeSearchResult = { hits: [], total: 0, truncated: false };

/**
 * Search recipes across every film in the index, which may be narrowed by
 * `filterRecipesByScope`. Understands the home page's queries (`hp5 at 800 in
 * dd-x`, `tri-x d-76 1+1`, `tmy 24c`) and adds what its single-recipe answer
 * cannot: a film or developer alone is enough, and every word must count, so an
 * unknown word finds nothing rather than a loose match. Only filler (`box speed`,
 * `9 min`) asks nothing.
 *
 * A number in the name of a film or developer that matches the other words reads
 * as that name (`delta 100`), otherwise as a shooting speed (`hp5 1600`), unless
 * a named pair neither publishes it nor could (`hp5 xtol 68`). A row
 * shared by rebrands is listed once, under its own film if that one matched,
 * else the lowest key. Without a typed temperature, one per dilution and speed:
 * 20C, else nearest. Rows published twice at the same values all stay. Pure.
 */
export function searchRecipes(
  query: string,
  index: RecipeIndex,
  { limit = DEFAULT_LIMIT }: RecipeSearchOptions = {}
): RecipeSearchResult {
  // Only names with recipes, or "acros 100" would join into the recipe-less
  // Neopan Acros 100 and hide Neopan 100 Acros II.
  const filmWords = new Map<string, NameWords>();
  const developerWords = new Map<string, NameWords>();
  for (const [filmKey, byDeveloper] of index.allPairs) {
    const film = index.films.get(filmKey)?.film;
    if (film) filmWords.set(filmKey, filmNames(film));
    for (const developerKey of byDeveloper.keys()) {
      const developer = index.developers.get(developerKey)?.developer;
      if (developer) {
        developerWords.set(developerKey, developerNames(developer));
      }
    }
  }
  const nameWords = new Set(
    [...filmWords.values(), ...developerWords.values()].flatMap(
      ({ own, joined }) => [...own, ...joined]
    )
  );

  const reading = readRecipeQuery(query, nameWords);
  if (!reading) return NO_HITS;

  const matches = matchPairs(index, reading, filmWords, developerWords);
  const nameNumbers = new Set(matches.flatMap(({ claims }) => claims));

  const best = new Map<string, RecipeSearchHit>();
  for (const match of matches) {
    const { filmKey, developerKey, recipes } = match;
    const filmEntry = index.films.get(filmKey);
    const developerEntry = index.developers.get(developerKey);
    if (!filmEntry || !developerEntry) continue;

    const speed = speedFor(
      match,
      reading,
      nameNumbers,
      filmEntry.film.isoSpeed
    );
    if (speed === undefined) continue;

    for (const { view, dilution } of rowsFor(recipes, reading.temperature)) {
      if (speed !== null && view.combination.shootingIso !== speed) continue;
      if (reading.dilution && !sameDilution(dilution, reading.dilution)) {
        continue;
      }
      const recipeId = recipeIdOf(view);
      const held = best.get(recipeId);
      const ownKey = index.keysById.get(recipeId)?.filmKey;
      const keepHeld =
        held &&
        filmKey !== ownKey &&
        (held.filmKey === ownKey || held.filmKey < filmKey);
      if (keepHeld) continue;
      best.set(recipeId, {
        recipeId,
        filmKey,
        developerKey,
        view,
        film: filmEntry.film,
        developer: developerEntry.developer,
        dilution,
      });
    }
  }

  const sorted = [...best.values()].toSorted(
    (a, b) =>
      a.view.combination.timeMinutes - b.view.combination.timeMinutes ||
      a.filmKey.localeCompare(b.filmKey) ||
      a.developerKey.localeCompare(b.developerKey) ||
      a.recipeId.localeCompare(b.recipeId)
  );
  const hits = sorted.slice(0, limit);
  return { hits, total: sorted.length, truncated: sorted.length > hits.length };
}
