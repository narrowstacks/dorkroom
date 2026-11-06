import {
  type DevelopmentCombinationView,
  filterRecipesByScope,
  getDeveloperOptions,
  getFilmOptions,
  getRecipeRows,
  getSpeedChoices,
  getTemperatureChoices,
  readRecipeUrlSearchQuery,
  recipeIdOf,
  type RecipeScope,
  recipeScopeToFilters,
  type RecipeSearchHit,
  type RecipeUrlBinding,
  searchRecipes,
  useDebounce,
  useFavorites,
  useRecipeUrlState,
} from '@dorkroom/logic';
import type {
  FilmDeveloperSelectionHandle,
  SavedRecipe,
} from '@dorkroom/ui/development-recipes';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '../../../lib/analytics/tracked-events';
import { useSearchDeadEndAnalytics } from '../../../lib/analytics/use-search-analytics';
import {
  applyScopeChange,
  EMPTY_SELECTION,
  hintNotice,
  openRecipeById,
  promptNote,
  resolveWorkbench,
  seedFromUrl,
  selectPair,
  type WorkbenchSelection,
} from '../utils/workbench-selection';
import { useSharedCustomRecipeView } from './useRecipeData';
import { useWorkbenchCatalog } from './useWorkbenchCatalog';
import { useWorkbenchRecipeActions } from './useWorkbenchRecipeActions';

type FocusTarget = 'heading' | 'film';

/** Params that lead to a filled-in page, so the prompt must not flash first. */
const opensSomething = ({ search }: RecipeUrlBinding) =>
  !!(search.recipe || search.film || search.developer);

/**
 * The state owner of the recipe workbench. Layouts render what it returns; only
 * `useRecipeUrlState` writes the query string, mirroring the resolved state.
 */
export function useRecipeWorkbench(url: RecipeUrlBinding) {
  const catalog = useWorkbenchCatalog();
  const favorites = useFavorites();
  const { index, isLoaded, isLoading, error } = catalog;
  const { isFavorite, favoriteIds } = favorites;

  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [scope, setScope] = useState<RecipeScope>('all');
  // `q` needs no catalogue to resolve, so the box is filled on first paint.
  const [query, setQuery] = useState(() =>
    readRecipeUrlSearchQuery(url.search)
  );
  const [isSeeded, setIsSeeded] = useState(false);
  const [expectsContent] = useState(() => opensSomething(url));
  const [focusRequest, setFocusRequest] = useState<{
    target: FocusTarget;
  } | null>(null);
  const [openedShare, setOpenedShare] = useState<
    'recipe' | 'custom_recipe' | null
  >(null);
  const [isSharedDialogShown, setIsSharedDialogShown] = useState(false);

  /** A user's choice, which also ends any wait to read the link. */
  function applyChoice(next: WorkbenchSelection) {
    setIsSeeded(true);
    setSelection(next);
  }

  const headingRef = useRef<HTMLHeadingElement>(null);
  const pickersRef = useRef<FilmDeveloperSelectionHandle>(null);

  const scoped = useMemo(
    () => filterRecipesByScope(index, scope, isFavorite),
    [index, scope, isFavorite]
  );
  const resolved = useMemo(
    () => resolveWorkbench(selection, index, scoped),
    [selection, index, scoped]
  );
  const { film, developer, pair, openView, boxIso, emptyPair } = resolved;

  const scopeFilters = recipeScopeToFilters(scope);
  const urlState = useRecipeUrlState(
    url,
    catalog.urlFilms,
    catalog.urlDevelopers,
    {
      searchQuery: query,
      // A custom film's slug would fail the URL's own validation.
      selectedFilm: film && !film.isCustom ? film.film : null,
      selectedDeveloper:
        developer && !developer.isCustom ? developer.developer : null,
      dilutionFilter: selection.hint.dilution,
      isoFilter: selection.hint.iso,
      developerTypeFilter: '',
      customRecipeFilter: scopeFilters.customRecipeFilter,
      favoritesOnly: scopeFilters.favoritesOnly,
      selectedRecipeId: openView ? recipeIdOf(openView) : null,
    },
    catalog.urlRecipesByUuid
  );
  const sharedCustomRecipeView = useSharedCustomRecipeView(
    urlState.sharedCustomRecipe,
    catalog.getFilmById,
    catalog.getDeveloperById
  );

  const { actions, modals, isRefreshing } = useWorkbenchRecipeActions({
    customRecipes: catalog.customRecipes,
    addCustomRecipe: catalog.addCustomRecipe,
    updateCustomRecipe: catalog.updateCustomRecipe,
    deleteCustomRecipe: catalog.deleteCustomRecipe,
    favorites,
    openView,
    onRecipeCreated: (id) => {
      applyChoice(openRecipeById(id));
      setFocusRequest({ target: 'heading' });
    },
    forceRefresh: catalog.forceRefresh,
    getFilmById: catalog.getFilmById,
    getDeveloperById: catalog.getDeveloperById,
    catalogFilms: catalog.catalogFilms,
    catalogDevelopers: catalog.catalogDevelopers,
  });

  // Seeded during render, so no commit ever shows the page unseeded. Anything the
  // user did during a slow load counts as seeded and is not overwritten; so does a
  // Retry, which must not read the link a second time.
  const isReady = isLoaded && favorites.isInitialized;
  const { initialUrlState } = urlState;
  if (isReady && !isSeeded && initialUrlState.fromUrl) {
    const seed = seedFromUrl(initialUrlState, index, isFavorite);
    setIsSeeded(true);
    setScope(seed.scope);
    setSelection(seed.selection);
    // Only a link carrying `source=share` is somebody else's share. A bare
    // `recipe=` is the address of a recipe the user opened themselves.
    if (initialUrlState.fromShare && seed.selection.openRecipeId) {
      setOpenedShare('recipe');
    }
  }
  if (isReady && sharedCustomRecipeView && !isSharedDialogShown) {
    setIsSharedDialogShown(true);
    setOpenedShare('custom_recipe');
    modals.setSharedRecipeView(sharedCustomRecipeView);
    modals.setSharedRecipeSource('custom');
    modals.setIsSharedRecipeModalOpen(true);
  }

  useEffect(() => {
    if (openedShare) trackEvent('share_opened', { tool: openedShare });
  }, [openedShare]);

  // After the commit, because a pick from the prompt mounts the heading it aims
  // at. A closing dialog returns focus to its opener first, so this has the last
  // word; a dialog still open leaves the page inert, so this cannot steal focus.
  useEffect(() => {
    if (!focusRequest) return;
    const heading = headingRef.current;
    if (focusRequest.target === 'heading' && heading) heading.focus();
    else pickersRef.current?.focusFilm();
  }, [focusRequest]);

  const deferredQuery = useDeferredValue(query);
  const searchResult = useMemo(
    () => searchRecipes(deferredQuery, scoped),
    [deferredQuery, scoped]
  );
  const settledQuery = useDebounce(query, 300);
  useSearchDeadEndAnalytics({
    tool: 'development',
    // Blank until the deferred results have caught up, so a typed query is never
    // paired with the count of the one before it.
    query: settledQuery === deferredQuery ? settledQuery.trim() : '',
    resultCount: searchResult.total,
    activeFilterCount: scope === 'all' ? 0 : 1,
    isLoading: !isLoaded,
  });

  const openedFromList = () => trackEvent('detail_opened', { type: 'recipe' });

  const choosePair = (filmKey: string | null, developerKey: string | null) => {
    applyChoice(selectPair(selection, filmKey, developerKey, scoped));
    if (
      filmKey &&
      developerKey &&
      scoped.pairs.get(filmKey)?.get(developerKey)
    ) {
      openedFromList();
    }
  };

  const selectFilm = (value: string) => {
    const key = value || null;
    if (key !== (film?.key ?? null)) choosePair(key, developer?.key ?? null);
  };

  const selectDeveloper = (value: string) => {
    const key = value || null;
    if (key !== (developer?.key ?? null)) choosePair(film?.key ?? null, key);
  };

  /** Holds the recipe open by id, so changing it cannot swap it for the default. */
  const openInPair = (
    view: DevelopmentCombinationView,
    { clearHint }: { clearHint: boolean }
  ) =>
    applyChoice({
      ...selection,
      filmKey: film?.key ?? null,
      developerKey: developer?.key ?? null,
      openRecipeId: recipeIdOf(view),
      ...(clearHint && { hintMissing: null, askedHint: null }),
    });

  const pickChoice = (view: DevelopmentCombinationView) =>
    openInPair(view, { clearHint: true });

  const toggleSaved = (view: DevelopmentCombinationView) => {
    openInPair(view, { clearHint: false });
    actions.handleToggleFavorite(view);
  };

  /** A rename, or any edit that moves it out of the pair, must not lose it. */
  const editRecipe = (view: DevelopmentCombinationView) => {
    if (openView && recipeIdOf(view) === recipeIdOf(openView)) {
      openInPair(view, { clearHint: false });
    }
    actions.handleEditCustomRecipe(view);
  };

  const pickRow = (view: DevelopmentCombinationView) => {
    pickChoice(view);
    openedFromList();
  };

  const pickSearchHit = (hit: RecipeSearchHit) => {
    applyChoice(
      openRecipeById(hit.recipeId, {
        filmKey: hit.filmKey,
        developerKey: hit.developerKey,
      })
    );
    setQuery('');
    setFocusRequest({ target: 'heading' });
    openedFromList();
  };

  const pickSaved = ({ view }: SavedRecipe) => {
    applyChoice(openRecipeById(recipeIdOf(view)));
    openedFromList();
  };

  const changeScope = (next: RecipeScope) => {
    if (next === scope) return;
    if (next === 'saved') {
      trackEvent('filter_applied', {
        tool: 'development',
        filter: 'favorites',
      });
    } else if (next !== 'all') {
      trackEvent('filter_applied', {
        tool: 'development',
        filter: 'recipe_type',
      });
    }
    setScope(next);
    applyChoice(
      applyScopeChange(
        selection,
        resolved,
        filterRecipesByScope(index, next, isFavorite)
      )
    );
  };

  /** Everything on the page. C/F and saved recipes are preferences, and stay. */
  const startOver = () => {
    applyChoice(EMPTY_SELECTION);
    setScope('all');
    setQuery('');
    setFocusRequest({ target: 'film' });
  };

  const openCustomForm = () => modals.openCustomRecipeModal();

  /** The panel's film wins, or a shared row's link would name a sibling. */
  const copyLink = () => {
    if (!openView) return;
    void actions.handleCopyCombination(
      film ? { ...openView, film: film.film } : openView
    );
  };

  /** A confirmed delete removes the button that opened the dialog. */
  const confirmDelete = () => {
    const deleted = modals.deleteConfirmRecipe;
    // Keep the pair on screen: it may have been reached only through this recipe.
    if (deleted && openView && recipeIdOf(deleted) === recipeIdOf(openView)) {
      applyChoice({
        ...selection,
        filmKey: film?.key ?? null,
        developerKey: developer?.key ?? null,
        openRecipeId: null,
      });
    }
    void actions.confirmDeleteCustomRecipe();
    setFocusRequest({ target: 'heading' });
  };

  /** Fixing an unresolved recipe removes the row whose Edit opened the form. */
  const submitCustomRecipe: typeof actions.handleCustomRecipeSubmit = async (
    data
  ) => {
    const editingId = modals.editingRecipe
      ? recipeIdOf(modals.editingRecipe)
      : null;
    const wasUnresolved = index.unresolvedCustom.some(
      (view) => recipeIdOf(view) === editingId
    );
    await actions.handleCustomRecipeSubmit(data);
    if (wasUnresolved) setFocusRequest({ target: 'heading' });
  };

  const declineSharedRecipe = () => {
    actions.handleDeclineSharedRecipe();
    setFocusRequest({ target: 'film' });
  };

  const savedRecipes = useMemo<SavedRecipe[]>(
    () =>
      favoriteIds.flatMap((id) => {
        const view = index.viewsById.get(id);
        if (!view) return [];
        const keys = index.keysById.get(id);
        return [{ view, film: keys && index.films.get(keys.filmKey)?.film }];
      }),
    [favoriteIds, index]
  );

  const filmOptions = useMemo(
    () =>
      getFilmOptions(scoped, {
        developerKey: developer?.key,
        selectedFilmKey: film?.key,
      }),
    [scoped, developer?.key, film?.key]
  );
  const developerOptions = useMemo(
    () =>
      getDeveloperOptions(scoped, {
        filmKey: film?.key,
        selectedDeveloperKey: developer?.key,
      }),
    [scoped, film?.key, developer?.key]
  );
  const rows = useMemo(() => getRecipeRows(pair, openView), [pair, openView]);
  const temperatureChoices = useMemo(
    () => getTemperatureChoices(pair, openView),
    [pair, openView]
  );
  const speedChoices = useMemo(
    () => getSpeedChoices(pair, openView, boxIso),
    [pair, openView, boxIso]
  );

  const catalogueIsEmpty =
    isLoaded &&
    (catalog.catalogFilms.length === 0 ||
      catalog.catalogDevelopers.length === 0);

  return {
    film,
    developer,
    openView,
    boxIso,
    rows,
    filmOptions,
    developerOptions,
    temperatureChoices,
    speedChoices,
    needs: !openView
      ? !film
        ? ('film' as const)
        : !developer
          ? ('developer' as const)
          : undefined
      : undefined,
    promptNote:
      isLoaded && !openView
        ? promptNote({
            emptyPair,
            film,
            scope,
            filmOptionCount: filmOptions.length,
            developerOptionCount: developerOptions.length,
          })
        : null,
    hintNote: hintNotice(selection),
    scope,
    query,
    setQuery,
    resultsQuery: isLoaded ? deferredQuery : '',
    searchResult,
    savedRecipes,
    unresolvedCustom: index.unresolvedCustom,
    canStartOver: !!(
      film ||
      developer ||
      openView ||
      query ||
      selection.hint.iso ||
      scope !== 'all'
    ),
    isSaved: openView ? isFavorite(recipeIdOf(openView)) : false,
    // Skeleton rather than a prompt that flashes and then fills itself in.
    showSkeleton: expectsContent && !isSeeded && !error && !catalogueIsEmpty,
    isLoading,
    isLoaded,
    loadFailed: !!error,
    isRefreshing,
    sharedRecipeError: urlState.sharedRecipeError,
    dismissSharedRecipeError: urlState.dismissSharedRecipeError,
    // A share link waits on the catalogue, which may never arrive or be empty.
    isLoadingSharedRecipe: urlState.isLoadingSharedRecipe && isLoading,
    headingRef,
    pickersRef,
    selectFilm,
    selectDeveloper,
    pickChoice,
    pickRow,
    declineSharedRecipe,
    pickSearchHit,
    pickSaved,
    changeScope,
    startOver,
    openCustomForm,
    openImport: () => modals.setIsImportModalOpen(true),
    copyLink,
    retry: actions.handleRefreshAll,
    toggleSaved,
    editRecipe,
    deleteRecipe: actions.handleDeleteCustomRecipe,
    confirmDelete,
    submitCustomRecipe,
    actions,
    modals,
    catalogFilms: catalog.catalogFilms,
    catalogDevelopers: catalog.catalogDevelopers,
    catalogFilmOptions: catalog.catalogFilmOptions,
    catalogDeveloperOptions: catalog.catalogDeveloperOptions,
  };
}

export type RecipeWorkbench = ReturnType<typeof useRecipeWorkbench>;
