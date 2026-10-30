// Pure grouping/filtering + save-guard logic for the film stock picker.
// Kept free of React so it's covered by fast, colocated vitest tests
// (see apps/mobile/CLAUDE.md "Testing reality").
import type { FilmRoll, FilmStock } from '@/types/film-log';

export interface FilmSection {
  title: string;
  data: FilmStock[];
}

const CUSTOM_PREFIX = 'custom-';
const YOUR_FILMS_TITLE = 'Your films';

function matches(film: FilmStock, query: string): boolean {
  return `${film.brand} ${film.name}`.toLowerCase().includes(query);
}

/**
 * Group films into "Your films" (custom stocks, in their existing order)
 * followed by catalog stocks grouped by brand (A→Z, films within a brand in
 * their existing order — the input is already brand/name-sorted upstream in
 * `useFilmStocks`, so this never re-sorts per keystroke). An optional query
 * filters case-insensitively over "{brand} {name}"; sections that end up
 * empty are dropped.
 */
export function buildFilmSections(
  films: readonly FilmStock[],
  query: string
): FilmSection[] {
  const q = query.trim().toLowerCase();
  const matched = q ? films.filter((f) => matches(f, q)) : films;

  const custom = matched.filter((f) => f.id.startsWith(CUSTOM_PREFIX));
  const catalog = matched.filter((f) => !f.id.startsWith(CUSTOM_PREFIX));

  const brandOrder: string[] = [];
  const byBrand = new Map<string, FilmStock[]>();
  for (const film of catalog) {
    let group = byBrand.get(film.brand);
    if (!group) {
      group = [];
      byBrand.set(film.brand, group);
      brandOrder.push(film.brand);
    }
    group.push(film);
  }
  brandOrder.sort((a, b) => a.localeCompare(b));

  const sections: FilmSection[] = [];
  if (custom.length > 0) {
    sections.push({ title: YOUR_FILMS_TITLE, data: custom });
  }
  for (const brand of brandOrder) {
    const data = byBrand.get(brand);
    if (data) sections.push({ title: brand, data });
  }
  return sections;
}

/**
 * Decide the `filmStockName` snapshot to save for a roll. Resolving the
 * current id always wins with a fresh name. When the id no longer resolves
 * (stub-era ids, or an empty offline cache), keep the roll's previous
 * snapshot IF the id is unchanged from the roll being edited — otherwise
 * (a new roll, or the user picked a different, now-unresolvable id) there is
 * nothing sensible to keep.
 */
export function resolveFilmStockName(
  stock: FilmStock | undefined,
  filmStockId: string | undefined,
  existing: FilmRoll | undefined
): string | undefined {
  if (stock) {
    return `${stock.brand} ${stock.name}`;
  }
  if (existing && existing.filmStockId === filmStockId) {
    return existing.filmStockName;
  }
  return undefined;
}
