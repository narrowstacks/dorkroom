import type { TemperatureUnit } from '../temperature';
import {
  cameraExposureAnswer,
  isCameraExposure,
  lensAnswer,
  readLens,
} from './camera';
import {
  type Catalog,
  catalogGroups,
  type CatalogMatch,
  catalogTokens,
  getCatalog,
  matchCatalog,
  recipeAnswer,
  recipesOf,
  reciprocityAnswer,
} from './catalog';
import {
  borderAnswer,
  findStops,
  matAnswer,
  readEasel,
  readResize,
  resizeAnswer,
  stopsAnswer,
} from './printing';
import {
  blank,
  findDilution,
  findDims,
  findIso,
  findTemperature,
  findTime,
  prepare,
  tokenize,
} from './query';
import { RELATED_TOOLS, toolsForTokens } from './tools';
import type {
  HomeAnswer,
  HomeResultGroup,
  HomeSearchData,
  HomeSearchOptions,
  HomeSearchResult,
  HomeToolRoute,
} from './types';

const RECIPROCITY_WORDS = /\b(?:recip\w*|long|night)\b/;

/** A query read once: its pieces, and what in the catalog it names. */
export interface QueryReading {
  text: string;
  seconds: number | null;
  /** The text with the time blanked out. */
  untimed: string;
  /** The EI asked for: after "at", "@", "ei" or "iso", or see `bareEi`. */
  iso: number | null;
  dilution: ReturnType<typeof findDilution>;
  celsius: number | null;
  /** Words that could name a film or developer (no connectives). */
  tokens: string[];
  /**
   * Every word left once times, speeds, dilutions and temperatures are read.
   * Tool names ("reciprocity", "exposure") are stop words to the catalog, so
   * tools are found from these rather than from `tokens`.
   */
  words: string[];
  catalog: Catalog;
  match: CatalogMatch;
  /** Numbers that belong to the film or developer named ("delta 100"). */
  nameNumbers: Set<string>;
}

/** On the ISO third-stop series (100, 125, 160, 200, ...), to within rounding. */
const onIsoSeries = (n: number) => {
  const thirds = 3 * Math.log2(n / 100);
  return Math.abs(thirds - Math.round(thirds)) < 0.05;
};

/**
 * A bare number beside a film and developer that is part of neither name, read
 * as the EI ("tri-x xtol 1600"). Only an EI the pair has a recipe at, or a
 * film speed of 100 or more, counts, so a dilution or temperature ("hp5
 * rodinal 50", "hp5 xtol 68") is not one. A box speed typed beside a push
 * ("hp5 400 xtol 1600") gives way to the push.
 */
function bareEi(
  catalog: Catalog,
  match: CatalogMatch,
  tokens: readonly string[],
  used: ReadonlySet<number>
): number | null {
  const film = match.film?.entry;
  const developer = match.developer?.entry;
  if (!film || !developer) return null;
  const speeds = new Set(
    recipesOf(catalog, { film, developer }).map((c) => c.shootingIso)
  );
  const numbers = tokens
    .filter((t, i) => /^\d{2,5}$/.test(t) && !used.has(i))
    .map(Number)
    .filter((n) => speeds.has(n) || (n >= 100 && onIsoSeries(n)));
  return (
    numbers.findLast((n) => n !== film.film.isoSpeed) ?? numbers.at(-1) ?? null
  );
}

export function readQuery(query: string, data: HomeSearchData): QueryReading {
  const text = prepare(query);
  const time = findTime(text);
  const untimed = time ? blank(text, time.index, time.length) : text;
  // Temperature first, so "at 24c" is never read as EI 24.
  const temperature = findTemperature(untimed);
  let words = temperature
    ? blank(untimed, temperature.index, temperature.length)
    : untimed;
  const iso = findIso(words);
  const dilution = findDilution(words);
  for (const span of [iso, dilution]) {
    if (span) words = blank(words, span.index, span.length);
  }
  const catalog = getCatalog(data);
  const tokens = catalogTokens(words);
  const match = matchCatalog(catalog, tokens);
  const used = new Set([
    ...(match.film?.used ?? []),
    ...(match.developer?.used ?? []),
  ]);
  const bareIso = bareEi(catalog, match, tokens, used);
  return {
    text,
    seconds: time?.seconds ?? null,
    untimed,
    iso: iso?.iso ?? bareIso,
    dilution,
    celsius: temperature?.celsius ?? null,
    tokens,
    words: tokenize(words),
    catalog,
    match,
    nameNumbers: new Set(
      tokens.filter((t, i) => /^\d+$/.test(t) && used.has(i))
    ),
  };
}

/** The answer a calculator gives, or null when the query is not one. */
export function calculatorAnswer(reading: QueryReading): HomeAnswer | null {
  const { text, untimed, seconds, match } = reading;
  if (seconds !== null) {
    const stops = findStops(untimed);
    if (stops) return stopsAnswer(seconds, stops);
  }
  const mat = matAnswer(untimed);
  if (mat) return mat;
  const resize = readResize(untimed, seconds !== null);
  if (resize) {
    const answer = resizeAnswer(resize, seconds);
    if (answer) return answer;
  }
  const easel = readEasel(untimed, reading.nameNumbers);
  const lens = readLens(untimed);
  // With paper in the query, a mm number is a border, unless "lens" says
  // otherwise or it could never fit on that paper as one.
  const lensIsBorder =
    lens &&
    easel.paper &&
    !lens.explicit &&
    !(
      easel.border?.unit === 'mm' &&
      2 * easel.border.inches >= easel.paper.short
    );
  if (lens && !lensIsBorder) return lensAnswer(lens);
  // Before the catalog loads, a word the reading cannot explain may name a
  // film or developer ("tmax 100 4x5", "d76 8x10"): wait for the data rather
  // than answer a border that changes once it arrives.
  // A word the easel cannot explain might be a film or developer name, and
  // only the names (not the recipes) can tell.
  const unsure = !reading.catalog.namesLoaded && easel.unread;
  if (
    easel.any &&
    !unsure &&
    !match.developer &&
    !(match.film && !easel.paper)
  ) {
    return borderAnswer(easel);
  }
  // Last, so an f-number never hides an answer read above ("8x10 to 16x20
  // 20s f/8" is a resize).
  return isCameraExposure(text, findDims(text).length > 0)
    ? cameraExposureAnswer()
    : null;
}

function catalogAnswer(
  reading: QueryReading,
  unit: TemperatureUnit
): HomeAnswer | null {
  const { match, catalog, seconds } = reading;
  const film = match.film?.entry;
  if (!film) return null;
  if (match.developer) {
    // Until the recipes load, "no recipe for this pair" may be untrue.
    if (!catalog.complete) return null;
    return recipeAnswer(
      catalog,
      film,
      match.developer.entry,
      {
        iso: reading.iso,
        dilution: reading.dilution,
        celsius: reading.celsius,
      },
      unit
    );
  }
  const { factor } = film;
  if (
    factor !== null &&
    (seconds !== null || RECIPROCITY_WORDS.test(reading.text))
  ) {
    return reciprocityAnswer({ ...film, factor }, seconds);
  }
  return null;
}

function toolsGroup(routes: readonly HomeToolRoute[]): HomeResultGroup[] {
  const tools = [...new Set(routes)];
  return tools.length
    ? [{ key: 'tools', label: 'Tools', total: tools.length, tools }]
    : [];
}

const EMPTY: HomeSearchResult = {
  answer: null,
  groups: [],
  pending: false,
  count: 0,
};

const countOf = (groups: readonly HomeResultGroup[]) =>
  groups.reduce((sum, group) => sum + group.total, 0);

/**
 * Answer a home-page query: a calculator result or a recipe when the query
 * reads as one, plus grouped matches from the catalog and the tools.
 * Calculator answers need no data; catalog answers wait for it (`pending`).
 *
 * @example
 * ```typescript
 * searchHome('8x10 35mm 1/2').answer?.figure?.value; // '6×9'
 * searchHome('hp5 at 800 in dd-x', { films, developers, combinations });
 * ```
 */
export function searchHome(
  query: string,
  data: HomeSearchData = {},
  { temperatureUnit = 'celsius' }: HomeSearchOptions = {}
): HomeSearchResult {
  const reading = readQuery(query, data);
  if (!reading.text) return EMPTY;
  const calculator = calculatorAnswer(reading);
  if (calculator) {
    const groups = toolsGroup([
      ...RELATED_TOOLS[calculator.kind],
      ...toolsForTokens(reading.words),
    ]);
    return {
      answer: calculator,
      groups,
      pending: false,
      count: countOf(groups),
    };
  }
  const answer = catalogAnswer(reading, temperatureUnit);
  const groups = [
    ...catalogGroups(
      reading.catalog,
      reading.tokens,
      reading.match,
      reading.iso,
      temperatureUnit
    ),
    ...toolsGroup([
      ...(answer ? RELATED_TOOLS[answer.kind] : []),
      ...toolsForTokens(reading.words),
    ]),
  ];
  return {
    answer,
    groups,
    pending: !answer && !reading.catalog.complete && reading.tokens.length > 0,
    count: countOf(groups),
  };
}
