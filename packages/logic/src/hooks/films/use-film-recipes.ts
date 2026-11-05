import type { Combination, Film } from '@dorkroom/api';
import { useCallback, useMemo } from 'react';
import {
  buildFilmRecipeIndex,
  type FilmRecipe,
  filmSupportsRecipes,
  getFilmRecipeCount,
  groupRecipesByShootingIso,
  pickDefaultRecipeIso,
  type RecipeIsoGroup,
  resolveFilmRecipes,
} from '../../utils/film-recipes';
import { useCombinations } from '../api/use-combinations';
import { useDevelopers } from '../api/use-developers';
import { useFilms } from '../api/use-films';

export interface UseFilmRecipesOptions {
  /**
   * When false nothing is fetched. Pass false until the film catalog has
   * loaded, and on e-ink devices (the caller decides; logic has no device
   * check). Defaults to true.
   */
  enabled?: boolean;
  /**
   * Also fetch developers, which only the recipe rows on a film page need
   * (developer names and dilution labels). Counts do not. Defaults to false.
   */
  detailsEnabled?: boolean;
}

export interface FilmRecipeGroups {
  groups: Array<RecipeIsoGroup<FilmRecipe>>;
  /** ISO tab to open first: the box speed when present, else the nearest. */
  defaultIso: number | undefined;
}

export interface UseFilmRecipesReturn {
  /**
   * Recipe count per film slug, the input to `useFilmDatabase({ recipeCounts })`.
   * Raw: it can hold slugs of films that must not show recipes, which
   * `sortFilms` ignores. For display use `getRecipeCount`.
   */
  recipeCounts: ReadonlyMap<string, number>;
  /** Recipe count for a film; 0 unless `filmSupportsRecipes(film)`. */
  getRecipeCount: (film: Pick<Film, 'slug' | 'colorType'>) => number;
  /**
   * A film's recipes grouped by shooting ISO; empty unless
   * `filmSupportsRecipes(film)`. Developer names and dilutions are null until
   * `developersReady`.
   */
  getRecipeGroups: (
    film: Pick<Film, 'slug' | 'colorType' | 'isoSpeed'>
  ) => FilmRecipeGroups;
  /** Combinations request in flight. Does not wait on developers. */
  isLoading: boolean;
  error: string | null;
  /** Developers loaded, so names and dilution labels are resolved. */
  developersReady: boolean;
  developersError: string | null;
}

const EMPTY_COMBINATIONS: Combination[] = [];
const EMPTY_FILMS: Film[] = [];
const NO_GROUPS: FilmRecipeGroups = { groups: [], defaultIso: undefined };

/**
 * Recipe data for the film pages, built from the same combinations (and
 * developers) queries that `/development` and site search use, so the cache is
 * shared.
 */
export function useFilmRecipes({
  enabled = true,
  detailsEnabled = false,
}: UseFilmRecipesOptions = {}): UseFilmRecipesReturn {
  // Combinations wait for the catalog so they never delay the film table.
  const films = useFilms();
  const catalogReady = films.data !== undefined;
  const combinations = useCombinations({ enabled: enabled && catalogReady });
  const developers = useDevelopers({
    enabled: enabled && catalogReady && detailsEnabled,
  });

  const index = useMemo(
    () =>
      buildFilmRecipeIndex(
        enabled
          ? (combinations.data ?? EMPTY_COMBINATIONS)
          : EMPTY_COMBINATIONS,
        films.data ?? EMPTY_FILMS
      ),
    [enabled, combinations.data, films.data]
  );

  const getRecipeCount = useCallback(
    (film: Pick<Film, 'slug' | 'colorType'>) =>
      filmSupportsRecipes(film) ? getFilmRecipeCount(index, film.slug) : 0,
    [index]
  );

  // A disabled observer still returns cached data, so gate on the options.
  const developerList = enabled && detailsEnabled ? developers.data : undefined;
  const getRecipeGroups = useCallback(
    (film: Pick<Film, 'slug' | 'colorType' | 'isoSpeed'>): FilmRecipeGroups => {
      if (!filmSupportsRecipes(film)) return NO_GROUPS;
      const groups = groupRecipesByShootingIso(
        index.recipesBySlug.get(film.slug) ?? []
      ).map(({ shootingIso, recipes }) => ({
        shootingIso,
        recipes: resolveFilmRecipes(recipes, developerList),
      }));
      return {
        groups,
        defaultIso: pickDefaultRecipeIso(groups, film.isoSpeed),
      };
    },
    [index, developerList]
  );

  return {
    recipeCounts: index.counts,
    getRecipeCount,
    getRecipeGroups,
    isLoading: enabled && !films.isError && combinations.isPending,
    error: enabled
      ? (combinations.error?.message ?? films.error?.message ?? null)
      : null,
    developersReady: developerList !== undefined,
    developersError: developers.error?.message ?? null,
  };
}
