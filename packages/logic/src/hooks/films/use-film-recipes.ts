import type { Combination } from '@dorkroom/api';
import { useCallback, useMemo } from 'react';
import {
  buildFilmRecipeIndex,
  type FilmRecipe,
  type FilmRecipeIndex,
  getFilmRecipeCount,
  groupRecipesByShootingIso,
  pickDefaultRecipeIso,
  type RecipeIsoGroup,
  resolveFilmRecipes,
} from '../../utils/film-recipes';
import { useCombinations } from '../api/use-combinations';
import { useDevelopers } from '../api/use-developers';

export interface UseFilmRecipesOptions {
  /**
   * When false nothing is fetched. Pass false until the film catalog has
   * loaded, and on e-ink devices (the caller decides; logic has no device
   * check). Defaults to true.
   */
  enabled?: boolean;
}

export interface FilmRecipeGroups {
  groups: Array<RecipeIsoGroup<FilmRecipe>>;
  /** ISO tab to open first: the box speed when present, else the nearest. */
  defaultIso: number | undefined;
}

export interface UseFilmRecipesReturn {
  /** Per-slug counts, ready for `useFilmDatabase({ recipeCounts })`. */
  recipeCounts: ReadonlyMap<string, number>;
  index: FilmRecipeIndex;
  getRecipeCount: (filmSlug: string) => number;
  /** Recipes for a film grouped by shooting ISO, dilutions resolved. */
  getRecipeGroups: (filmSlug: string, boxIso: number) => FilmRecipeGroups;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_COMBINATIONS: Combination[] = [];

/**
 * Recipe data for the film pages, built from the same combinations (and
 * developers) queries that `/development` and site search use, so the cache is
 * shared. Callers must not show recipes for films where `filmSupportsRecipes`
 * is false; this hook indexes every combination it receives.
 */
export function useFilmRecipes({
  enabled = true,
}: UseFilmRecipesOptions = {}): UseFilmRecipesReturn {
  const combinations = useCombinations({ enabled });
  const developers = useDevelopers({ enabled });

  const index = useMemo(
    () => buildFilmRecipeIndex(combinations.data ?? EMPTY_COMBINATIONS),
    [combinations.data]
  );

  const getRecipeCount = useCallback(
    (filmSlug: string) => getFilmRecipeCount(index, filmSlug),
    [index]
  );

  const developerList = developers.data;
  const getRecipeGroups = useCallback(
    (filmSlug: string, boxIso: number): FilmRecipeGroups => {
      const groups = groupRecipesByShootingIso(
        index.recipesBySlug.get(filmSlug) ?? []
      ).map(({ shootingIso, recipes }) => ({
        shootingIso,
        recipes: resolveFilmRecipes(recipes, developerList ?? []),
      }));
      return { groups, defaultIso: pickDefaultRecipeIso(groups, boxIso) };
    },
    [index, developerList]
  );

  return {
    recipeCounts: index.counts,
    index,
    getRecipeCount,
    getRecipeGroups,
    isLoading: enabled && (combinations.isPending || developers.isPending),
    error: combinations.error?.message ?? null,
  };
}
