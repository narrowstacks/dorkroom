import type { Developer, Film } from '@dorkroom/api';
import {
  buildRecipeIndex,
  type DevelopmentCombinationView,
  useCustomRecipes,
  useDevelopmentRecipes,
} from '@dorkroom/logic';
import { useMemo } from 'react';
import {
  toDeveloperOptions,
  toFilmOptions,
  useCustomCombinationViews,
  useRecipesByUuid,
} from './useRecipeData';

const NO_FILMS: Film[] = [];
const NO_DEVELOPERS: Developer[] = [];

/**
 * The catalogue and the user's custom recipes as one index. Nothing here depends
 * on the selection, the scope or the favourites, so the index is rebuilt only
 * when the catalogue or a custom recipe changes.
 */
export function useWorkbenchCatalog() {
  const recipes = useDevelopmentRecipes();
  const custom = useCustomRecipes();
  const {
    allCombinations,
    catalogFilms,
    catalogDevelopers,
    getFilmById,
    getDeveloperById,
    isLoaded,
  } = recipes;

  const customViews = useCustomCombinationViews(
    custom.customRecipes,
    getFilmById,
    getDeveloperById
  );
  const index = useMemo(() => {
    const apiViews: DevelopmentCombinationView[] = allCombinations.map(
      (combination) => ({
        combination,
        film: getFilmById(combination.filmStockId),
        developer: getDeveloperById(combination.developerId),
        source: 'api',
      })
    );
    return buildRecipeIndex(
      [...apiViews, ...customViews],
      catalogFilms,
      catalogDevelopers
    );
  }, [
    allCombinations,
    customViews,
    catalogFilms,
    catalogDevelopers,
    getFilmById,
    getDeveloperById,
  ]);

  const recipesByUuid = useRecipesByUuid(allCombinations, custom.customRecipes);
  const catalogFilmOptions = useMemo(
    () => toFilmOptions(catalogFilms),
    [catalogFilms]
  );
  const catalogDeveloperOptions = useMemo(
    () => toDeveloperOptions(catalogDevelopers),
    [catalogDevelopers]
  );

  return {
    ...recipes,
    ...custom,
    index,
    catalogFilmOptions,
    catalogDeveloperOptions,
    /**
     * For `useRecipeUrlState`, held back until all three queries succeed. Films
     * can land before the recipes, and the hook starts rewriting the URL from the
     * page's state the moment it has films: a slow recipe query would erase the
     * link it was about to open. A custom recipe alone would likewise make a
     * shared uuid read as unknown.
     */
    urlFilms: isLoaded ? catalogFilms : NO_FILMS,
    urlDevelopers: isLoaded ? catalogDevelopers : NO_DEVELOPERS,
    urlRecipesByUuid: isLoaded ? recipesByUuid : undefined,
  };
}
