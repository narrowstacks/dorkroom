import type { Combination, Developer, Film } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { getAllSlugsForFilm, matchesSearchQuery } from '@dorkroom/logic';

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

/** What one link opening asks the browser to show. */
export interface RecipeListOpening {
  /** Identity of this opening; the browser applies each key once. */
  key: string;
  film?: string;
  developer?: string;
  /** The ISO filter value (`shootingIso` as text), when the link sets one. */
  iso?: string;
}

/** A positive whole ISO as the filter's text, else undefined. */
function isoFilterFrom(value: string | undefined): string | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const iso = Number(value);
  return iso > 0 ? String(iso) : undefined;
}

/**
 * The fresh filter request a link opens the browser with, or null when the
 * link asks for nothing (a plain open keeps whatever the user had). A link
 * from Home carries `film` and/or `developer`; one from a roll waiting to be
 * developed carries `roll`, plus `film` and `iso` when its film is in the
 * catalog, so a roll-only link opens the browser unfiltered. An `iso` that is
 * not a positive whole number is ignored.
 */
export function recipeListOpening(params: {
  film?: string;
  developer?: string;
  iso?: string;
  roll?: string;
  at?: string;
}): RecipeListOpening | null {
  // An `iso` alone names no film to apply it to, so it is not an opening and
  // must not reset what the user has.
  if (!params.film && !params.developer && !params.roll) return null;
  const iso = isoFilterFrom(params.iso);
  return {
    key: [
      params.film ?? '',
      params.developer ?? '',
      iso ?? '',
      params.roll ?? '',
      params.at ?? '',
    ].join('|'),
    film: params.film || undefined,
    developer: params.developer || undefined,
    iso,
  };
}

/**
 * The ISO filter a link's `iso` should become: kept only when the film has at
 * least one recipe at exactly that ISO (the filter is an exact match), else
 * dropped so the browser shows the film's recipes instead of "No recipes
 * match" (a roll shot at EI 320 when the recipes are at 400). With no film it
 * is dropped too. The film's recipes are matched the way the browser filters
 * them: its slug and aliases, its base film and the films rebranded from it.
 */
export function isoToApply({
  iso,
  film,
  films,
  recipes,
}: {
  iso: string | undefined;
  film: Film | null;
  films: readonly Film[];
  recipes: readonly Pick<
    Combination,
    'filmSlug' | 'filmStockId' | 'shootingIso'
  >[];
}): string | undefined {
  if (!iso || !film) return undefined;
  // The base film by any of its slugs (the browser's slug index includes
  // aliases), and the films rebranded from this one.
  const bySlug = new Map(
    films.flatMap((f) =>
      getAllSlugsForFilm(f).map((slug) => [slug, f] as const)
    )
  );
  const base = film.baseFilmSlug ? bySlug.get(film.baseFilmSlug) : undefined;
  const related = [
    film,
    ...(base ? [base] : []),
    ...films.filter((f) => f.baseFilmSlug === film.slug),
  ];
  const slugs = new Set(related.flatMap((f) => getAllSlugsForFilm(f)));
  const wanted = Number(iso);
  const found = recipes.some(
    (recipe) =>
      (slugs.has(recipe.filmSlug) || slugs.has(recipe.filmStockId)) &&
      recipe.shootingIso === wanted
  );
  return found ? iso : undefined;
}

/**
 * The roll a recipe opened from the browser carries on to its screen (and so
 * to the timer): the roll of the link that opened the browser, only while the
 * film filter is still the one that link set. The screen forgets the opening
 * on a manual film change or a filter reset; this also covers a film changed
 * any other way.
 */
export function rollForRecipeOpen({
  openingRoll,
  openingFilm,
  currentFilm,
}: {
  openingRoll: string | undefined;
  openingFilm: string | undefined;
  currentFilm: string | undefined;
}): string | undefined {
  return openingRoll && openingFilm === currentFilm ? openingRoll : undefined;
}

/**
 * Whether a manual film pick or clear should also clear the ISO filter: only
 * when the last link opening set one and it is still the one in place (a roll
 * at EI 400 picked HP5's 400; the user then picked Tri-X). An ISO the user
 * chose themselves since is left alone.
 */
export function clearsOpeningIso({
  openingIso,
  currentIso,
}: {
  openingIso: string | undefined;
  currentIso: string;
}): boolean {
  return openingIso !== undefined && currentIso === openingIso;
}
