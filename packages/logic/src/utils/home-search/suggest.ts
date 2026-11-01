import type { Combination } from '@dorkroom/api';
import { PAPER_SIZES } from '../../constants/border-calculator';
import { MAT_PRESETS } from '../../constants/mat-calculator';
import { formatExposureTime } from '../exposure-calculations';
import {
  type Catalog,
  catalogTokens,
  type DeveloperEntry,
  type FilmEntry,
  isStopWord,
  rank,
  recipesOf,
} from './catalog';
import { formatTypedDims } from './format';
import { isNegativeNotation } from './printing';
import { areaSqIn, findDims } from './query';
import { calculatorAnswer, readQuery } from './search';
import { toolCompletions } from './tools';
import type { HomeSearchData, HomeSuggestion, HomeToolRoute } from './types';

/** How many suggestions the list shows at most. */
const MAX_SUGGESTIONS = 6;

/**
 * The partner a film or developer is best known with: of those it has
 * recipes with, the most widely used (`partners`), then the one with most
 * recipes for the pair. Data alone decides; no names are favoured.
 */
function topPartner<E extends { partners: number }>(
  recipes: readonly Combination[],
  slugOf: (c: Combination) => string,
  bySlug: ReadonlyMap<string, E>
): E | undefined {
  const counts = new Map<E, number>();
  for (const c of recipes) {
    const entry = bySlug.get(slugOf(c));
    if (entry) counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }
  return [...counts]
    .toSorted(([a, x], [b, y]) => b.partners - a.partners || y - x)
    .at(0)?.[0];
}

/** The value seen most often, ties to the first seen. */
function mostCommon<T>(values: readonly T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let top: T | undefined;
  let topCount = 0;
  for (const [v, n] of counts) {
    if (n > topCount) {
      top = v;
      topCount = n;
    }
  }
  return top;
}

/** The next standard paper up from a size, by area. */
function nextPaper(area: number): string | undefined {
  return PAPER_SIZES.find(
    (p) => p.value !== 'custom' && p.width * p.height > area + 1e-6
  )?.value;
}

/** The next mat board up that fits a print with room for a border. */
function matFor(short: number, long: number): string | undefined {
  const board = MAT_PRESETS.find((m) => m.w > short && m.h > long);
  return board ? `${board.w}x${board.h}` : undefined;
}

/**
 * Suggestions for a query being typed: templates that teach the syntax for
 * what it looks like so far (a film, a size, a focal length, a time) and
 * completions of the word being typed. At most `MAX_SUGGESTIONS`.
 *
 * @example
 * ```typescript
 * suggestHome('8x10').map((s) => s.label);
 * // ['8x10 35mm 1/2', '8x10 to 11x14 12s', '11x14 mat 8x10']
 * ```
 */
export function suggestHome(
  query: string,
  data: HomeSearchData = {}
): HomeSuggestion[] {
  const reading = readQuery(query, data);
  const { text, catalog, match } = reading;
  if (!text) return [];
  const out: HomeSuggestion[] = [];
  const seen = new Set([text]);
  const add: Add = (label, hint, fill = label, tool) => {
    const key = fill.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(
      tool ? { label, query: fill, hint, tool } : { label, query: fill, hint }
    );
  };

  const dims = findDims(text);
  // A calculator query names no film or developer, whatever its words match.
  const calculator = calculatorAnswer(reading) !== null;
  const numbered = calculator ? [] : filmsByNumber(catalog, text);
  const film = numbered[0] ?? (calculator ? undefined : match.film?.entry);
  const developer = calculator ? undefined : match.developer?.entry;
  // With both named, the answer and the pair's other recipes listed beside
  // it already cover every speed the data has, so nothing is suggested.
  if (film && !developer) {
    filmTemplates(catalog, film, reading, add);
  } else if (developer && !film) {
    const top = topPartner(
      recipesOf(catalog, { developer }),
      (c) => c.filmSlug,
      catalog.filmBySlug
    );
    if (top) recipe(add, top, developer);
  }

  const only = (pattern: RegExp) => pattern.test(text);
  if (dims.length === 1 && only(/^[\d.]+\s*x\s*[\d.]+\s*(?:cm|mm|in)?$/)) {
    const d = dims[0];
    const size = formatTypedDims(d);
    if (isNegativeNotation(d) || (d.key === '4x5' && d.unit === 'in')) {
      add(`8x10 ${size} 1/2`, 'border');
      add(`80mm on ${size}`, 'lens');
    } else {
      const area = areaSqIn(d);
      add(`${size} 35mm 1/2`, 'border');
      const bigger = nextPaper(area);
      if (bigger) add(`${size} to ${bigger} 12s`, 'resize');
      const board = matFor(d.lo * d.toInches, d.hi * d.toInches);
      if (board) add(`${board} mat ${size}`, 'mat');
    }
  }

  const focal = /^(\d+(?:\.\d+)?)\s*mm$/.exec(text);
  if (focal) {
    add(`${focal[1]}mm on 6x6`, 'lens');
    add(`${focal[1]}mm on 645 to apsc`, 'lens');
  }

  if (reading.seconds !== null && !reading.untimed.trim()) {
    const time = formatExposureTime(reading.seconds);
    add(`${time} +1/3 stop`, 'stops');
    add(`8x10 to 11x14 ${time}`, 'resize');
    const longFilm = catalog.films
      .filter((f) => f.factor !== null)
      .toSorted((a, b) => b.partners - a.partners)[0];
    if (longFilm) {
      add(
        `${longFilm.name} ${time}`,
        'reciprocity',
        `${longFilm.film.name} ${time}`
      );
    }
  }

  for (const f of numbered) add(f.name, 'film', f.film.name);
  completions(reading.text, calculator, catalog, add);
  return out.slice(0, MAX_SUGGESTIONS);
}

/**
 * "delta 32", "tmax 4": a number being typed after a film name, read as the
 * start of that name's number (Delta 3200, T-MAX 400). Empty once the number
 * names a film exactly, or when the words before it name none.
 */
function filmsByNumber(catalog: Catalog, text: string): FilmEntry[] {
  const words = text.split(' ');
  const last = words.at(-1) ?? '';
  const head = catalogTokens(words.slice(0, -1).join(' '));
  if (!/^\d+$/.test(last) || head.length === 0) return [];
  const named = rank(catalog.films, head)
    .filter((s) => s.own > 0 && s.used.length === head.length)
    .map((s) => s.entry);
  if (named.some((f) => f.own.includes(last))) return [];
  return named
    .filter((f) => f.own.some((w) => w.startsWith(last)))
    .toSorted((a, b) => b.partners - a.partners)
    .slice(0, 3);
}

type Add = (
  label: string,
  hint: HomeSuggestion['hint'],
  fill?: string,
  tool?: HomeToolRoute
) => void;

/**
 * A recipe template, named in full as the answer and matches name it
 * ("Ilford HP5 Plus at 800 in Ilford DD-X"), filled short ("HP5 Plus at 800
 * in DD-X").
 */
function recipe(
  add: Add,
  film: FilmEntry,
  developer: DeveloperEntry,
  iso?: number
) {
  const at = iso === undefined ? '' : ` at ${iso}`;
  add(
    `${film.name}${at} in ${developer.name}`,
    'recipe',
    `${film.film.name}${at} in ${developer.developer.name}`
  );
}

/**
 * "HP5 Plus in DD-X", "HP5 Plus at 800 in DD-X", "HP5 Plus 30s". The
 * developer is the film's `topPartner`, among the recipes at the EI typed
 * when there are any. With a time typed, the answer is already the film's
 * reciprocity, so that template is left out.
 */
function filmTemplates(
  catalog: Catalog,
  film: FilmEntry,
  { iso, seconds }: { iso: number | null; seconds: number | null },
  add: Add
) {
  const all = recipesOf(catalog, { film });
  const atIso = iso === null ? [] : all.filter((c) => c.shootingIso === iso);
  const recipes = atIso.length ? atIso : all;
  const top = topPartner(
    recipes,
    (c) => c.developerSlug,
    catalog.developerBySlug
  );
  if (top && iso !== null && atIso.length) {
    recipe(add, film, top, iso);
  } else if (top) {
    recipe(add, film, top);
    const pushed = mostCommon(
      recipes
        .filter(
          (c) =>
            c.developerSlug === top.developer.slug &&
            c.shootingIso > film.film.isoSpeed
        )
        .map((c) => c.shootingIso)
    );
    if (pushed) recipe(add, film, top, pushed);
  }
  if (film.factor !== null && seconds === null) {
    add(`${film.name} 30s`, 'reciprocity', `${film.film.name} 30s`);
  }
}

/** Films, developers and tools whose words start with the word being typed. */
function completions(
  text: string,
  toolsOnly: boolean,
  catalog: Catalog,
  add: Add
) {
  const words = text.split(' ');
  const last = words.at(-1) ?? '';
  const prefix = last.replace(/[-'.]/g, '');
  const head = words.slice(0, -1).join(' ');
  // "hp5 in", "hp5 at": a connective after a name starts the next part of
  // the query; completing it as a name would replace it.
  if (
    prefix.length < 2 ||
    !/[a-z]/.test(prefix) ||
    (head && isStopWord(prefix))
  )
    return;
  const fill = (name: string) => (head ? `${head} ${name}` : name);
  const starts = (entry: { own: string[]; brand: string[] }) =>
    [...entry.own, ...entry.brand].some((w) => w.startsWith(prefix));
  const films = toolsOnly ? [] : catalog.films;
  const developers = toolsOnly ? [] : catalog.developers;
  for (const f of films
    .filter(starts)
    .toSorted((a, b) => b.partners - a.partners)
    .slice(0, 3)) {
    add(f.name, 'film', fill(f.film.name));
  }
  for (const d of developers
    .filter(starts)
    .toSorted((a, b) => b.partners - a.partners)
    .slice(0, 2)) {
    add(d.name, 'developer', fill(d.developer.name));
  }
  if (!head) {
    for (const { route, word } of toolCompletions(prefix)) {
      add(word.charAt(0).toUpperCase() + word.slice(1), 'tool', word, route);
    }
  }
}
