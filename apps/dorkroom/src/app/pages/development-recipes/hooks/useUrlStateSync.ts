import type { Combination, Developer, Film } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react';

export interface UseUrlStateSyncProps {
  isLoaded: boolean;
  initialUrlState: {
    fromUrl?: boolean;
    selectedFilm?: Film | null;
    selectedDeveloper?: Developer | null;
    dilutionFilter?: string;
    isoFilter?: string;
    developerTypeFilter?: string;
    customRecipeFilter?: string;
    favoritesOnly?: boolean;
    view?: string;
    recipeId?: string;
    isSharedApiRecipe?: boolean;
    isDirectSelection?: boolean;
  };
  sharedCustomRecipeView: DevelopmentCombinationView | null;
  recipesByUuid: Map<string, Combination>;
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
  setSelectedFilm: (film: Film | null) => void;
  setSelectedDeveloper: (developer: Developer | null) => void;
  setDilutionFilter: (filter: string) => void;
  setIsoFilter: (filter: string) => void;
  setDeveloperTypeFilter: (filter: string) => void;
  setFavoritesOnly: Dispatch<SetStateAction<boolean>>;
  setCustomRecipeFilter: (
    filter: 'all' | 'hide-custom' | 'only-custom' | 'official'
  ) => void;
  setSharedRecipeView: Dispatch<
    SetStateAction<DevelopmentCombinationView | null>
  >;
  setSharedRecipeSource: Dispatch<SetStateAction<'shared' | 'custom'>>;
  setIsSharedRecipeModalOpen: Dispatch<SetStateAction<boolean>>;
  setDetailView: Dispatch<SetStateAction<DevelopmentCombinationView | null>>;
  setIsDetailOpen: Dispatch<SetStateAction<boolean>>;
  setIsFiltersSidebarCollapsed?: Dispatch<SetStateAction<boolean>>;
}

/**
 * Hook that synchronizes URL state with component state on initial load.
 * Handles shared recipes from URL and applies filters/selections from URL parameters.
 *
 * The effect is intentionally guarded by a one-shot ref so it only fires once
 * after data is loaded, preventing cascading re-renders from the large dep list.
 * Setter functions are captured in a stable ref so they don't contribute to
 * the effect's dependency array — they are referentially stable in practice but
 * listing them caused the effect to re-run on every parent render.
 */
export function useUrlStateSync(props: UseUrlStateSyncProps): void {
  const {
    isLoaded,
    initialUrlState,
    sharedCustomRecipeView,
    recipesByUuid,
    getFilmById,
    getDeveloperById,
    setSelectedFilm,
    setSelectedDeveloper,
    setDilutionFilter,
    setIsoFilter,
    setDeveloperTypeFilter,
    setFavoritesOnly,
    setCustomRecipeFilter,
    setSharedRecipeView,
    setSharedRecipeSource,
    setIsSharedRecipeModalOpen,
    setDetailView,
    setIsDetailOpen,
    setIsFiltersSidebarCollapsed,
  } = props;

  // Capture all setters and lookup functions in a stable ref so they never
  // appear in the effect's dependency array. These values are written on every
  // render but the effect only reads them when it fires (after isLoaded +
  // recipesByUuid are ready), so we always get the current version.
  const settersRef = useRef({
    setSelectedFilm,
    setSelectedDeveloper,
    setDilutionFilter,
    setIsoFilter,
    setDeveloperTypeFilter,
    setFavoritesOnly,
    setCustomRecipeFilter,
    setSharedRecipeView,
    setSharedRecipeSource,
    setIsSharedRecipeModalOpen,
    setDetailView,
    setIsDetailOpen,
    setIsFiltersSidebarCollapsed,
    getFilmById,
    getDeveloperById,
  });
  settersRef.current = {
    setSelectedFilm,
    setSelectedDeveloper,
    setDilutionFilter,
    setIsoFilter,
    setDeveloperTypeFilter,
    setFavoritesOnly,
    setCustomRecipeFilter,
    setSharedRecipeView,
    setSharedRecipeSource,
    setIsSharedRecipeModalOpen,
    setDetailView,
    setIsDetailOpen,
    setIsFiltersSidebarCollapsed,
    getFilmById,
    getDeveloperById,
  };

  const urlStateAppliedRef = useRef(false);

  // Effect 1: Apply filter state from URL (film, developer, filters).
  // Depends only on isLoaded and the stable initialUrlState reference.
  // biome-ignore lint/correctness/useExhaustiveDependencies: settersRef is stable by design; initialUrlState is stable after load
  useEffect(() => {
    if (!isLoaded || !initialUrlState.fromUrl || urlStateAppliedRef.current) {
      return;
    }

    const s = settersRef.current;

    if (initialUrlState.selectedFilm) {
      s.setSelectedFilm(initialUrlState.selectedFilm);
    }
    if (initialUrlState.selectedDeveloper) {
      s.setSelectedDeveloper(initialUrlState.selectedDeveloper);
    }
    if (initialUrlState.dilutionFilter) {
      s.setDilutionFilter(initialUrlState.dilutionFilter);
    }
    if (initialUrlState.isoFilter) {
      s.setIsoFilter(initialUrlState.isoFilter);
    }
    if (initialUrlState.developerTypeFilter) {
      s.setDeveloperTypeFilter(initialUrlState.developerTypeFilter);
    }
    if (initialUrlState.favoritesOnly) {
      s.setFavoritesOnly(true);
    }
    if (initialUrlState.customRecipeFilter) {
      s.setCustomRecipeFilter(
        initialUrlState.customRecipeFilter as
          | 'all'
          | 'hide-custom'
          | 'only-custom'
          | 'official'
      );
    }
  }, [isLoaded, initialUrlState]);

  // Effect 2: Handle shared custom recipe from URL.
  // Runs after Effect 1 has had a chance to set filters; marks applied only
  // when a shared custom recipe is present (early-exit path).
  // biome-ignore lint/correctness/useExhaustiveDependencies: settersRef is stable by design
  useEffect(() => {
    if (!isLoaded || !initialUrlState.fromUrl || urlStateAppliedRef.current) {
      return;
    }
    if (!sharedCustomRecipeView) {
      return;
    }

    const s = settersRef.current;
    s.setSharedRecipeView(sharedCustomRecipeView);
    s.setSharedRecipeSource('custom');
    s.setIsSharedRecipeModalOpen(true);
    urlStateAppliedRef.current = true;
  }, [isLoaded, initialUrlState, sharedCustomRecipeView]);

  // Effect 3: Handle API recipe lookup from URL (requires recipesByUuid to be populated).
  // Depends on recipesByUuid so it retries after data loads.
  // biome-ignore lint/correctness/useExhaustiveDependencies: settersRef is stable by design
  useEffect(() => {
    if (!isLoaded || !initialUrlState.fromUrl || urlStateAppliedRef.current) {
      return;
    }
    // Shared custom recipe path is handled by Effect 2 — don't double-apply.
    if (sharedCustomRecipeView) {
      return;
    }
    if (!initialUrlState.recipeId) {
      // No recipe to open; mark as applied so we don't retry.
      urlStateAppliedRef.current = true;
      return;
    }

    const recipe = recipesByUuid.get(initialUrlState.recipeId);
    if (!recipe) {
      // recipesByUuid not yet populated — wait for next render.
      return;
    }

    const s = settersRef.current;
    const recipeView: DevelopmentCombinationView = {
      combination: recipe,
      film: s.getFilmById(recipe.filmStockId),
      developer: s.getDeveloperById(recipe.developerId),
      source: 'api',
      canShare: true,
    };

    if (initialUrlState.isDirectSelection) {
      s.setDetailView(recipeView);
      s.setIsDetailOpen(true);
      s.setIsFiltersSidebarCollapsed?.(true);
    } else if (initialUrlState.isSharedApiRecipe) {
      s.setDetailView(recipeView);
      s.setIsDetailOpen(true);
      s.setIsFiltersSidebarCollapsed?.(true);
    } else {
      s.setSharedRecipeView(recipeView);
      s.setSharedRecipeSource('shared');
      s.setIsSharedRecipeModalOpen(true);
    }

    urlStateAppliedRef.current = true;
  }, [isLoaded, initialUrlState, sharedCustomRecipeView, recipesByUuid]);
}
