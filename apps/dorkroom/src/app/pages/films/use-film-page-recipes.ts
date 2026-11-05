import type { Film } from '@dorkroom/api';
import type { UseFilmRecipesReturn } from '@dorkroom/logic';
import type { FilmPageRecipes } from '@dorkroom/ui/films';
import { useMemo } from 'react';
import { buildFilmPageRecipes } from './build-film-page-recipes';

/**
 * The selected film's recipes for the film page, or null with no selection.
 * `useFilmRecipes` returns a new object every render, so the memo depends on
 * its parts.
 */
export function useFilmPageRecipes(
  film: Film | null,
  recipesEnabled: boolean,
  data: UseFilmRecipesReturn
): FilmPageRecipes | null {
  const {
    error,
    isLoading,
    getRecipeGroups,
    getRecipeCount,
    developersReady,
    developersError,
  } = data;
  return useMemo(
    () =>
      film
        ? buildFilmPageRecipes(film, recipesEnabled, {
            error,
            isLoading,
            getRecipeGroups,
            getRecipeCount,
            developersReady,
            developersError,
          })
        : null,
    [
      film,
      recipesEnabled,
      error,
      isLoading,
      getRecipeGroups,
      getRecipeCount,
      developersReady,
      developersError,
    ]
  );
}
