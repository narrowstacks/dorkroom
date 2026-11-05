import type { Film } from '@dorkroom/api';
import type { UseFilmRecipesReturn } from '@dorkroom/logic';
import type { FilmPageRecipes } from '@dorkroom/ui/films';

/**
 * What the film page shows for a film's recipes. Unavailable when recipes are
 * off for this device (e-ink) or the combinations request failed; loading
 * while it is in flight; otherwise the film's recipes grouped by ISO. The
 * page decides from the film itself whether recipes apply at all.
 */
export function buildFilmPageRecipes(
  film: Film,
  recipesEnabled: boolean,
  data: Pick<
    UseFilmRecipesReturn,
    | 'error'
    | 'isLoading'
    | 'getRecipeGroups'
    | 'getRecipeCount'
    | 'developersReady'
    | 'developersError'
  >
): FilmPageRecipes {
  if (!recipesEnabled || data.error) return { status: 'unavailable' };
  if (data.isLoading) return { status: 'loading' };
  // Without developer names the rows have nothing to show but a skeleton, so
  // fall back to the plain link. Only for films that have recipes: a film
  // without any must still render nothing (display rule 2).
  if (
    data.developersError &&
    !data.developersReady &&
    data.getRecipeCount(film) > 0
  ) {
    return { status: 'unavailable' };
  }
  const { groups, defaultIso } = data.getRecipeGroups(film);
  return {
    status: 'ready',
    groups,
    defaultIso,
    developersReady: data.developersReady,
    count: data.getRecipeCount(film),
  };
}
