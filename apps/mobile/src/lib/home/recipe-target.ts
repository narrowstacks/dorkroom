import type { Developer, Film } from '@dorkroom/api';

export interface RecipeTarget {
  film: Film | null;
  developer: Developer | null;
  /**
   * Names the first requested film or developer the browser cannot list
   * recipes for, or null when everything asked for can be shown.
   */
  unavailable: string | null;
}

/**
 * Resolves the `film` / `developer` slugs a Home result opens the recipe
 * browser with. Home searches the whole catalog (color films, paper
 * developers, entries with no recipes), the browser lists only B&W films and
 * film developers that have recipes, so a slug can be known and still not
 * listable. That case is reported by name instead of silently dropped.
 *
 * @param listed - What the browser can select (has recipes).
 * @param catalog - Everything Home can name; only used for the display name.
 */
export function resolveRecipeTarget(
  params: { film?: string; developer?: string },
  listed: { films: readonly Film[]; developers: readonly Developer[] },
  catalog: { films?: readonly Film[]; developers?: readonly Developer[] }
): RecipeTarget {
  let unavailable: string | null = null;
  let film: Film | null = null;
  let developer: Developer | null = null;

  if (params.film) {
    film = listed.films.find((f) => f.slug === params.film) ?? null;
    if (!film) {
      const known = catalog.films?.find((f) => f.slug === params.film);
      unavailable = known ? `${known.brand} ${known.name}` : params.film;
    }
  }
  if (params.developer) {
    developer =
      listed.developers.find((d) => d.slug === params.developer) ?? null;
    if (!developer && unavailable === null) {
      const known = catalog.developers?.find(
        (d) => d.slug === params.developer
      );
      unavailable = known
        ? `${known.manufacturer} ${known.name}`
        : params.developer;
    }
  }
  return { film, developer, unavailable };
}
