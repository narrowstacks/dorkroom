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
  iso: number | null;
  dilution: ReturnType<typeof findDilution>;
  celsius: number | null;
  tokens: string[];
  catalog: Catalog;
  match: CatalogMatch;
}

export function readQuery(query: string, data: HomeSearchData): QueryReading {
  const text = prepare(query);
  const time = findTime(text);
  const untimed = time ? blank(text, time.index, time.length) : text;
  const iso = findIso(untimed);
  const dilution = findDilution(untimed);
  const temperature = findTemperature(untimed);
  let words = untimed;
  for (const span of [iso, dilution, temperature]) {
    if (span) words = blank(words, span.index, span.length);
  }
  const catalog = getCatalog(data);
  const tokens = catalogTokens(words);
  return {
    text,
    seconds: time?.seconds ?? null,
    untimed,
    iso: iso?.iso ?? null,
    dilution,
    celsius: temperature?.celsius ?? null,
    tokens,
    catalog,
    match: matchCatalog(catalog, tokens),
  };
}

/** Numbers that belong to the film or developer the query names ("delta 100"). */
function nameNumbers({ tokens, match }: QueryReading): Set<string> {
  const names = [match.film?.entry.own, match.developer?.entry.own];
  return new Set(
    tokens.filter(
      (t) => /^\d+$/.test(t) && names.some((own) => own?.includes(t))
    )
  );
}

/** The answer a calculator gives, or null when the query is not one. */
export function calculatorAnswer(reading: QueryReading): HomeAnswer | null {
  const { text, untimed, seconds, match } = reading;
  if (seconds !== null) {
    const stops = findStops(untimed);
    if (stops) return stopsAnswer(seconds, stops);
  }
  if (isCameraExposure(text, findDims(text).length > 0)) {
    return cameraExposureAnswer();
  }
  const mat = matAnswer(untimed);
  if (mat) return mat;
  const resize = readResize(untimed, seconds !== null);
  if (resize) {
    const answer = resizeAnswer(resize, seconds);
    if (answer) return answer;
  }
  const easel = readEasel(untimed, nameNumbers(reading));
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
  return null;
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
      ...toolsForTokens(reading.tokens),
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
      ...toolsForTokens(reading.tokens),
    ]),
  ];
  return {
    answer,
    groups,
    pending: !answer && !reading.catalog.complete && reading.tokens.length > 0,
    count: countOf(groups),
  };
}
