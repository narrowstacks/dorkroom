import type { Combination, Developer, Film } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { matchesSearchQuery } from '@dorkroom/logic';

type FilmLookup = (id: string) => Film | undefined;
type DeveloperLookup = (id: string) => Developer | undefined;

/**
 * Join raw combinations to their Film/Developer objects to produce the view
 * models the recipe cards/detail render. Pure — the lookups come from
 * useDevelopmentRecipes (getFilmById / getDeveloperById).
 */
export function buildRecipeViews(
  combinations: Combination[],
  getFilmById: FilmLookup,
  getDeveloperById: DeveloperLookup
): DevelopmentCombinationView[] {
  return combinations.map((combination) => ({
    combination,
    film: getFilmById(combination.filmSlug || combination.filmStockId),
    developer: getDeveloperById(
      combination.developerId || combination.developerSlug
    ),
    source: 'api',
  }));
}

/**
 * Apply the in-screen text search (film/developer name) and tag filter on top
 * of the hook's already-filtered+sorted combinations. The hook does not itself
 * filter by free text or tag, so this stays here.
 */
export function filterRecipeViews(
  views: DevelopmentCombinationView[],
  query: string,
  tag: string
): DevelopmentCombinationView[] {
  const q = query.trim();
  if (!q && !tag) return views;
  return views.filter((view) => {
    if (tag && !(view.combination.tags ?? []).includes(tag)) return false;
    if (!q) return true;
    const film = view.film ? `${view.film.brand} ${view.film.name}` : '';
    const developer = view.developer
      ? `${view.developer.manufacturer} ${view.developer.name}`
      : '';
    return (
      matchesSearchQuery(film, query) || matchesSearchQuery(developer, query)
    );
  });
}

/** Distinct developer types present in the catalog, for the type filter chips. */
export function developerTypeOptions(
  developers: Developer[]
): { label: string; value: string }[] {
  const types = new Set<string>();
  for (const dev of developers) {
    if (dev.type) types.add(dev.type);
  }
  return [
    { label: 'All types', value: '' },
    ...[...types].sort().map((type) => ({ label: type, value: type })),
  ];
}
