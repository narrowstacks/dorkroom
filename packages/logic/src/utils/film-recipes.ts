import type { Combination, Developer, Film } from '@dorkroom/api';
import { getCombinationDilution } from './combination-dilution';

const BLACK_AND_WHITE_TYPES = new Set(['bw', 'b&w', 'b & w']);

/**
 * Display rule 1: only black and white films show development recipes. Decided
 * by film type, never by count, so a color or slide film stays recipe-free even
 * if a recipe row for it ever exists.
 */
export function filmSupportsRecipes(film: Pick<Film, 'colorType'>): boolean {
  return BLACK_AND_WHITE_TYPES.has(film.colorType.toLowerCase());
}

/**
 * Whether the film-type filter value ('', 'bw', 'color', 'slide') can show
 * recipes. Only an explicit color or slide filter cannot: with no type filter
 * the list still contains black and white films.
 */
export function filmTypeFilterSupportsRecipes(
  colorTypeFilter: string
): boolean {
  return colorTypeFilter !== 'color' && colorTypeFilter !== 'slide';
}

/** Recipes for one film index, keyed by film slug. */
export interface FilmRecipeIndex {
  /** Number of recipes per film slug. Films without recipes are absent. */
  counts: ReadonlyMap<string, number>;
  /** Recipes per film slug, in input order. */
  recipesBySlug: ReadonlyMap<string, readonly Combination[]>;
}

/** Index combinations by `filmSlug`. Pure; safe to memoize on the array. */
export function buildFilmRecipeIndex(
  combinations: readonly Combination[]
): FilmRecipeIndex {
  const recipesBySlug = new Map<string, Combination[]>();
  for (const combination of combinations) {
    const slug = combination.filmSlug;
    if (!slug) continue;
    const list = recipesBySlug.get(slug);
    if (list) list.push(combination);
    else recipesBySlug.set(slug, [combination]);
  }
  const counts = new Map<string, number>();
  for (const [slug, list] of recipesBySlug) counts.set(slug, list.length);
  return { counts, recipesBySlug };
}

/** Recipe count for a film, 0 when it has none. */
export function getFilmRecipeCount(
  index: FilmRecipeIndex,
  filmSlug: string
): number {
  return index.counts.get(filmSlug) ?? 0;
}

/** Recipes shot at one ISO. */
export interface RecipeIsoGroup<T> {
  shootingIso: number;
  recipes: T[];
}

/** Group recipes by `shootingIso`, ascending. Recipe order within a group is kept. */
export function groupRecipesByShootingIso<T extends { shootingIso: number }>(
  recipes: readonly T[]
): Array<RecipeIsoGroup<T>> {
  const groups = new Map<number, T[]>();
  for (const recipe of recipes) {
    const list = groups.get(recipe.shootingIso);
    if (list) list.push(recipe);
    else groups.set(recipe.shootingIso, [recipe]);
  }
  return [...groups.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([shootingIso, list]) => ({ shootingIso, recipes: list }));
}

/**
 * The ISO group to open first: the film's box speed when it has recipes at
 * that speed, else the group nearest to it (the lower one on a tie). Undefined
 * when there are no groups.
 */
export function pickDefaultRecipeIso(
  groups: ReadonlyArray<{ shootingIso: number }>,
  boxIso: number
): number | undefined {
  let best: number | undefined;
  for (const { shootingIso } of groups) {
    if (best === undefined) {
      best = shootingIso;
      continue;
    }
    const distance = Math.abs(shootingIso - boxIso);
    const bestDistance = Math.abs(best - boxIso);
    if (
      distance < bestDistance ||
      (distance === bestDistance && shootingIso < best)
    ) {
      best = shootingIso;
    }
  }
  return best;
}

/**
 * A recipe with its developer and dilution resolved for display. A null field
 * means "unknown" (the developers list has not loaded, or failed): show
 * nothing rather than a guess.
 */
export interface FilmRecipe {
  combination: Combination;
  /** Developer name; null when the developers list is unavailable. */
  developerName: string | null;
  /** Dilution as people read it, via `getCombinationDilution`; null when unknown. */
  dilution: string | null;
}

/**
 * Attach developer name and dilution label to each of a film's recipes.
 * Pass `undefined` for `developers` while they are unavailable. Recipes are
 * matched on `developerSlug` (the API sends the slug in both developer fields).
 * "Stock" is returned only when the recipe has no dilution of its own and no
 * dilution id, or when the developer resolved.
 */
export function resolveFilmRecipes(
  recipes: readonly Combination[],
  developers: readonly Developer[] | undefined
): FilmRecipe[] {
  return recipes.map((combination) => {
    if (!developers) {
      const custom = combination.customDilution?.trim();
      let dilution: string | null = custom || null;
      if (!custom && !combination.dilutionId) dilution = 'Stock';
      return { combination, developerName: null, dilution };
    }
    const developer =
      developers.find((d) => d.slug === combination.developerSlug) ?? null;
    return {
      combination,
      developerName: developer?.name ?? combination.developerSlug,
      dilution: getCombinationDilution(combination, developer),
    };
  });
}

/** Sort keys for the film list. 'name' is the default order. */
export type FilmSort = 'name' | 'iso' | 'recipes';

export const FILM_SORTS: readonly FilmSort[] = ['name', 'iso', 'recipes'];

/**
 * Display rule 3: a recipes sort falls back to name when the type filter is
 * color or slide, where recipes are never shown.
 */
export function resolveFilmSort(
  sort: FilmSort,
  colorTypeFilter: string
): FilmSort {
  if (sort === 'recipes' && !filmTypeFilterSupportsRecipes(colorTypeFilter)) {
    return 'name';
  }
  return sort;
}

/**
 * Sort films. 'name' returns the input order untouched (callers pass films
 * already ordered by brand and name, or by search relevance). 'iso' is
 * ascending and 'recipes' is most first; ties keep the input order. Films that
 * cannot show recipes count as 0 so they never lead a recipes sort.
 */
export function sortFilms(
  films: readonly Film[],
  sort: FilmSort,
  recipeCounts: ReadonlyMap<string, number> = new Map()
): Film[] {
  if (sort === 'iso') {
    return films.toSorted((a, b) => a.isoSpeed - b.isoSpeed);
  }
  if (sort === 'recipes') {
    const count = (film: Film) =>
      filmSupportsRecipes(film) ? (recipeCounts.get(film.slug) ?? 0) : 0;
    return films.toSorted((a, b) => count(b) - count(a));
  }
  return [...films];
}
