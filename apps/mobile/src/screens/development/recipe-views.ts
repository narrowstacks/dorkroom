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
    // Scans each view's own short tag list, not one shared array. Building a Set per view
    // would cost an allocation per item to replace a handful of comparisons — strictly
    // slower. Suppressed as a false positive rather than "fixed".
    // eslint-disable-next-line react-doctor/js-set-map-lookups -- see above
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

/** Picker options for the film selector; '' = All films. */
export function filmPickerOptions(
  films: Film[]
): { label: string; value: string }[] {
  return [
    { label: 'All films', value: '' },
    ...films.map((f) => ({
      label: `${f.brand} ${f.name}`.trim(),
      value: f.slug,
    })),
  ];
}

/** Picker options for the developer selector; '' = All developers. */
export function developerPickerOptions(
  developers: Developer[]
): { label: string; value: string }[] {
  return [
    { label: 'All developers', value: '' },
    ...developers.map((d) => ({
      label: `${d.manufacturer} ${d.name}`.trim(),
      value: d.slug,
    })),
  ];
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
