import { useCallback, useMemo } from 'react';
import type { Combination, Film, Developer } from '@dorkroom/api';
import type { CustomRecipe } from '@dorkroom/logic';
import {
  getCustomRecipeFilm,
  getCustomRecipeDeveloper,
  createCombinationFromCustomRecipe,
} from '@dorkroom/logic';
import { type DevelopmentCombinationView } from '@dorkroom/ui';

export interface UseRecipeDataProps {
  filteredCombinations: Combination[];
  customRecipes: CustomRecipe[];
  allFilms: Film[];
  allDevelopers: Developer[];
  selectedFilm: Film | null;
  selectedDeveloper: Developer | null;
  developerTypeFilter: string;
  dilutionFilter: string;
  isoFilter: string;
  customRecipeFilter: 'all' | 'hide-custom' | 'only-custom';
  tagFilter: string;
  favoritesOnly: boolean;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  sharedCustomRecipe: CustomRecipe | null;
  flags: {
    CUSTOM_RECIPE_SHARING: boolean;
  };
  isFavorite: (id: string) => boolean;
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
}

export interface UseRecipeDataReturn {
  recipesByUuid: Map<string, Combination>;
  combinedRows: DevelopmentCombinationView[];
  apiCombinationViews: DevelopmentCombinationView[];
  customCombinationViews: DevelopmentCombinationView[];
  filteredCustomViews: DevelopmentCombinationView[];
  sharedCustomRecipeView: DevelopmentCombinationView | null;
  filmOptions: Array<{ label: string; value: string }>;
  developerOptions: Array<{ label: string; value: string }>;
  memoizedIsFavorite: (id: string) => boolean;
}

/**
 * Hook that handles all data processing and derived state for development recipes
 * Consolidates recipe maps, combination views, filtering, and sorting
 */
export function useRecipeData(props: UseRecipeDataProps): UseRecipeDataReturn {
  const {
    filteredCombinations,
    customRecipes,
    allFilms,
    allDevelopers,
    selectedFilm,
    selectedDeveloper,
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
    customRecipeFilter,
    tagFilter,
    favoritesOnly,
    sortBy,
    sortDirection,
    sharedCustomRecipe,
    flags,
    isFavorite,
    getFilmById,
    getDeveloperById,
  } = props;

  // Optimize: Split recipe maps to avoid reprocessing custom recipes (which have validation overhead)
  // when only the filtered API results change, and vice versa.
  const apiRecipesMap = useMemo(() => {
    const map = new Map<string, Combination>();
    // Add API combinations (already filtered upstream)
    for (const combo of filteredCombinations) {
      if (combo.uuid) {
        map.set(combo.uuid, combo);
      }
    }
    return map;
  }, [filteredCombinations]);

  const customRecipesMap = useMemo(() => {
    const map = new Map<string, Combination>();
    // Add custom recipes (convert to Combination format)
    for (const recipe of customRecipes) {
      map.set(recipe.id, createCombinationFromCustomRecipe(recipe));
    }
    return map;
  }, [customRecipes]);

  const recipesByUuid = useMemo(() => {
    // Start with API recipes
    const map = new Map(apiRecipesMap);
    // Overlay custom recipes (they take precedence if IDs collide, though they shouldn't)
    for (const [id, combo] of customRecipesMap) {
      map.set(id, combo);
    }
    return map;
  }, [apiRecipesMap, customRecipesMap]);

  // Memoize expensive shared custom recipe conversion
  const sharedCustomRecipeView = useMemo(() => {
    if (!sharedCustomRecipe) {
      return null;
    }

    // Convert CustomRecipe to DevelopmentCombinationView
    const combination = createCombinationFromCustomRecipe(
      sharedCustomRecipe,
      'shared-custom'
    );

    // Get film and developer (either from database or custom data)
    let film: Film | undefined = undefined;
    let developer: Developer | undefined = undefined;

    if (sharedCustomRecipe.isCustomFilm && sharedCustomRecipe.customFilm) {
      // Create a temporary film object from custom data
      film = {
        id: 0,
        uuid: 'custom_film_temp',
        slug: 'custom-film',
        brand: sharedCustomRecipe.customFilm.brand,
        name: sharedCustomRecipe.customFilm.name,
        colorType: sharedCustomRecipe.customFilm.colorType,
        isoSpeed: sharedCustomRecipe.customFilm.isoSpeed,
        grainStructure: sharedCustomRecipe.customFilm.grainStructure || null,
        description: sharedCustomRecipe.customFilm.description || '',
        manufacturerNotes: null,
        reciprocityFailure: null,
        discontinued: false,
        staticImageUrl: null,
        dateAdded: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      film = getFilmById(sharedCustomRecipe.filmId);
    }

    if (
      sharedCustomRecipe.isCustomDeveloper &&
      sharedCustomRecipe.customDeveloper
    ) {
      // Create a temporary developer object from custom data
      developer = {
        id: 0,
        uuid: 'custom_dev_temp',
        slug: 'custom-developer',
        name: sharedCustomRecipe.customDeveloper.name,
        manufacturer: sharedCustomRecipe.customDeveloper.manufacturer,
        type: sharedCustomRecipe.customDeveloper.type,
        description: '',
        filmOrPaper:
          sharedCustomRecipe.customDeveloper.filmOrPaper === 'film' ||
          sharedCustomRecipe.customDeveloper.filmOrPaper === 'both',
        dilutions: sharedCustomRecipe.customDeveloper.dilutions.map(
          (d: { name: string; dilution: string }, index: number) => ({
            id: String(index),
            name: d.name,
            dilution: d.dilution,
          })
        ),
        mixingInstructions:
          sharedCustomRecipe.customDeveloper.mixingInstructions || null,
        storageRequirements: null,
        safetyNotes: sharedCustomRecipe.customDeveloper.safetyNotes || null,
        notes: sharedCustomRecipe.customDeveloper.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      developer = getDeveloperById(sharedCustomRecipe.developerId);
    }

    const recipeView: DevelopmentCombinationView = {
      combination,
      film,
      developer,
      source: 'custom',
      canShare: true,
    };

    return recipeView;
  }, [sharedCustomRecipe, getFilmById, getDeveloperById]);

  const customCombinationViews = useMemo<DevelopmentCombinationView[]>(() => {
    if (!customRecipes.length) {
      return [];
    }

    return customRecipes.map((recipe) => {
      return {
        combination: createCombinationFromCustomRecipe(recipe),
        film: getCustomRecipeFilm(recipe.id, customRecipes, getFilmById),
        developer: getCustomRecipeDeveloper(
          recipe.id,
          customRecipes,
          getDeveloperById
        ),
        source: 'custom',
        canShare: flags.CUSTOM_RECIPE_SHARING,
      } satisfies DevelopmentCombinationView;
    });
  }, [
    customRecipes,
    getDeveloperById,
    getFilmById,
    flags.CUSTOM_RECIPE_SHARING,
  ]);

  const apiCombinationViews = useMemo<DevelopmentCombinationView[]>(() => {
    return filteredCombinations.map((combination) => ({
      combination,
      film: getFilmById(combination.filmStockId),
      developer: getDeveloperById(combination.developerId),
      source: 'api',
      canShare: true, // Enable sharing for regular recipes
    }));
  }, [filteredCombinations, getFilmById, getDeveloperById]);

  const filteredCustomViews = useMemo(() => {
    if (!customCombinationViews.length) {
      return [];
    }

    return customCombinationViews.filter((view) => {
      const { combination, developer } = view;

      if (selectedFilm && combination.filmStockId !== selectedFilm.uuid) {
        return false;
      }

      if (
        selectedDeveloper &&
        combination.developerId !== selectedDeveloper.uuid
      ) {
        return false;
      }

      if (developerTypeFilter && developer?.type !== developerTypeFilter) {
        return false;
      }

      if (
        dilutionFilter &&
        combination.customDilution?.toLowerCase() !==
          dilutionFilter.toLowerCase()
      ) {
        return false;
      }

      if (isoFilter && combination.shootingIso.toString() !== isoFilter) {
        return false;
      }

      return true;
    });
  }, [
    customCombinationViews,
    selectedFilm,
    selectedDeveloper,
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
  ]);

  const combinedRows = useMemo<DevelopmentCombinationView[]>(() => {
    let rows: DevelopmentCombinationView[] = [];

    // Apply custom recipe filter
    if (customRecipeFilter === 'all') {
      rows = [...apiCombinationViews, ...filteredCustomViews];
    } else if (customRecipeFilter === 'hide-custom') {
      rows = [...apiCombinationViews];
    } else if (customRecipeFilter === 'only-custom') {
      rows = [...filteredCustomViews];
    }

    // Apply tag filter
    if (tagFilter) {
      rows = rows.filter((row) => {
        const { combination } = row;
        if (tagFilter === 'custom') {
          return row.source === 'custom';
        }
        return combination.tags && combination.tags.includes(tagFilter);
      });
    }

    // Apply favorites-only filter if enabled
    if (favoritesOnly) {
      rows = rows.filter((row) => {
        const id = String(row.combination.uuid || row.combination.id);
        return isFavorite(id);
      });
    }

    // NOTE: Sorting is now handled by TanStack Table via the favoriteAware sorting function
    // in use-development-table.ts. Return unsorted rows to allow table-based sorting.
    return rows;
  }, [
    apiCombinationViews,
    filteredCustomViews,
    customRecipeFilter,
    tagFilter,
    favoritesOnly,
    isFavorite,
  ]);

  // Memoize the isFavorite function for use in table sorting
  const memoizedIsFavorite = useCallback(
    (id: string) => isFavorite(id),
    [isFavorite]
  );

  const filmOptions = useMemo(() => {
    return [
      { label: 'Select film', value: '' },
      ...allFilms.map((film) => ({
        label: `${film.brand} ${film.name}`,
        value: film.uuid,
      })),
    ];
  }, [allFilms]);

  const developerOptions = useMemo(() => {
    return [
      { label: 'Select developer', value: '' },
      ...allDevelopers.map((developer) => ({
        label: `${developer.manufacturer} ${developer.name}`,
        value: developer.uuid,
      })),
    ];
  }, [allDevelopers]);

  return {
    recipesByUuid,
    combinedRows,
    apiCombinationViews,
    customCombinationViews,
    filteredCustomViews,
    sharedCustomRecipeView,
    filmOptions,
    developerOptions,
    memoizedIsFavorite,
  };
}
