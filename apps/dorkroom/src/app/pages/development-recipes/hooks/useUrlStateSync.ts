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
    view?: string;
    recipeId?: string;
    isSharedApiRecipe?: boolean;
  };
  sharedCustomRecipeView: DevelopmentCombinationView | null;
  recipesByUuid: Map<string, Combination>;
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
  setSelectedFilm: (film: Film | null) => void;
  setSelectedDeveloper: (developer: Developer | null) => void;
  setDilutionFilter: (filter: string) => void;
  setIsoFilter: (filter: string) => void;
  setFavoritesOnly: Dispatch<SetStateAction<boolean>>;
  setCustomRecipeFilter: (
    filter: 'all' | 'hide-custom' | 'only-custom'
  ) => void;
  setSharedRecipeView: Dispatch<
    SetStateAction<DevelopmentCombinationView | null>
  >;
  setSharedRecipeSource: Dispatch<SetStateAction<'shared' | 'custom'>>;
  setIsSharedRecipeModalOpen: Dispatch<SetStateAction<boolean>>;
  setDetailView: Dispatch<SetStateAction<DevelopmentCombinationView | null>>;
  setIsDetailOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * Hook that synchronizes URL state with component state on initial load
 * Handles shared recipes from URL and applies filters/selections from URL parameters
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
    setFavoritesOnly,
    setCustomRecipeFilter,
    setSharedRecipeView,
    setSharedRecipeSource,
    setIsSharedRecipeModalOpen,
    setDetailView,
    setIsDetailOpen,
  } = props;

  const urlStateAppliedRef = useRef(false);
  const isApplyingUrlStateRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !initialUrlState.fromUrl || urlStateAppliedRef.current) {
      return;
    }

    // Prevent re-entry while applying URL state
    if (isApplyingUrlStateRef.current) {
      return;
    }

    isApplyingUrlStateRef.current = true;

    if (initialUrlState.selectedFilm) {
      setSelectedFilm(initialUrlState.selectedFilm);
    }
    if (initialUrlState.selectedDeveloper) {
      setSelectedDeveloper(initialUrlState.selectedDeveloper);
    }
    if (initialUrlState.dilutionFilter) {
      setDilutionFilter(initialUrlState.dilutionFilter);
    }
    if (initialUrlState.isoFilter) {
      setIsoFilter(initialUrlState.isoFilter);
    }
    if (initialUrlState.view === 'favorites') {
      setFavoritesOnly(true);
    } else if (initialUrlState.view === 'custom') {
      setCustomRecipeFilter('only-custom');
    }

    // Check for shared custom recipe from URL
    if (sharedCustomRecipeView) {
      setSharedRecipeView(sharedCustomRecipeView);
      setSharedRecipeSource('custom');
      setIsSharedRecipeModalOpen(true);
      urlStateAppliedRef.current = true;
      isApplyingUrlStateRef.current = false;
      return;
    }

    // Check for shared API recipe in URL
    if (initialUrlState.recipeId) {
      const recipe = recipesByUuid.get(initialUrlState.recipeId);
      if (recipe) {
        const recipeView: DevelopmentCombinationView = {
          combination: recipe,
          film: getFilmById(recipe.filmStockId),
          developer: getDeveloperById(recipe.developerId),
          source: 'api', // Assume shared recipes are from API unless proven otherwise
          canShare: true,
        };

        // If this is a shared API recipe (has film/developer URL params), open detail directly
        if (initialUrlState.isSharedApiRecipe) {
          setDetailView(recipeView);
          setIsDetailOpen(true);
        } else {
          // Otherwise, show the shared recipe modal for potential import
          setSharedRecipeView(recipeView);
          setSharedRecipeSource('shared');
          setIsSharedRecipeModalOpen(true);
        }
      }
    }

    urlStateAppliedRef.current = true;
    isApplyingUrlStateRef.current = false;
  }, [
    isLoaded,
    initialUrlState,
    sharedCustomRecipeView,
    setSelectedFilm,
    setSelectedDeveloper,
    setDilutionFilter,
    setIsoFilter,
    setCustomRecipeFilter,
    setFavoritesOnly,
    getFilmById,
    getDeveloperById,
    recipesByUuid,
    setSharedRecipeView,
    setSharedRecipeSource,
    setIsSharedRecipeModalOpen,
    setDetailView,
    setIsDetailOpen,
  ]);
}
