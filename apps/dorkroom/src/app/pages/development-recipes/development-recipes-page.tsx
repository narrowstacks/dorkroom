import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { SortingState } from '@tanstack/react-table';
import {
  useCustomRecipes,
  useDevelopmentRecipes,
  useRecipeSharing,
  useRecipeUrlState,
  useDevelopmentTable,
  useFeatureFlags,
  useViewPreference,
  useFavorites,
  getCustomRecipeFilm,
  getCustomRecipeDeveloper,
  createCombinationFromCustomRecipe,
} from '@dorkroom/logic';
import { useRecipeModals } from './hooks/useRecipeModals';
import { useRecipeActions } from './hooks/useRecipeActions';
import {
  CUSTOM_RECIPE_FORM_DEFAULT,
  convertRecipeToFormData,
} from './utils/recipeUtils';
import {
  FilmDeveloperSelection,
  CollapsibleFilters,
  DevelopmentResultsTable,
  DevelopmentResultsCards,
  DevelopmentRecipeDetail,
  DevelopmentActionsBar,
  CustomRecipeForm,
  ImportRecipeForm,
  SharedRecipeModal,
  FilmdevPreviewModal,
  Modal,
  Drawer,
  DrawerContent,
  DrawerBody,
  TemperatureProvider,
  SkeletonCard,
  SkeletonTableRow,
  createTableColumns,
  PaginationControls,
  type DevelopmentCombinationView,
  cn,
  useToast,
  useIsMobile,
} from '@dorkroom/ui';
import type { Combination, Film, Developer } from '@dorkroom/api';
import { useTheme } from '@dorkroom/ui';

export default function DevelopmentRecipesPage() {
  const {
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
    customRecipeFilter,
    tagFilter,
    sortBy,
    sortDirection,
    selectedFilm,
    selectedDeveloper,
    isLoading,
    isLoaded,
    error,
    allFilms,
    allDevelopers,
    filteredCombinations,
    setDeveloperTypeFilter,
    setDilutionFilter,
    setIsoFilter,
    setCustomRecipeFilter,
    setTagFilter,
    setSelectedFilm,
    setSelectedDeveloper,
    forceRefresh,
    clearFilters,
    getFilmById,
    getDeveloperById,
    getAvailableDilutions,
    getAvailableISOs,
    getAvailableTags,
  } = useDevelopmentRecipes();

  const {
    customRecipes,
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
    forceRefresh: refreshCustomRecipes,
  } = useCustomRecipes();

  const {
    shareCustomRecipe,
    copyCustomRecipeToClipboard,
    shareRegularRecipe,
    copyRegularRecipeToClipboard,
    decodeSharedCustomRecipe,
  } = useRecipeSharing();

  const { flags } = useFeatureFlags();
  const { isFavorite, toggleFavorite, addFavorite } = useFavorites();
  const isMobile = useIsMobile();
  const { viewMode, setViewMode } = useViewPreference();
  const { showToast } = useToast();

  // Modal state management - extracted to custom hook
  // This centralizes all modal-related state that was previously scattered across 14+ useState declarations
  const {
    isDetailOpen,
    setIsDetailOpen,
    detailView,
    setDetailView,
    isCustomModalOpen,
    setIsCustomModalOpen,
    editingRecipe,
    setEditingRecipe,
    isSubmittingRecipe,
    setIsSubmittingRecipe,
    isImportModalOpen,
    setIsImportModalOpen,
    importError,
    isImporting,
    setImportError,
    setIsImporting,
    isFilmdevPreviewOpen,
    setIsFilmdevPreviewOpen,
    filmdevPreviewData,
    setFilmdevPreviewData,
    filmdevPreviewRecipe,
    setFilmdevPreviewRecipe,
    isSharedRecipeModalOpen,
    setIsSharedRecipeModalOpen,
    sharedRecipeView,
    sharedRecipeSource,
    isAddingSharedRecipe,
    setIsAddingSharedRecipe,
    setSharedRecipeView,
    setSharedRecipeSource,
  } = useRecipeModals();

  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'film', desc: false },
  ]);
  const [pageIndex, setPageIndex] = useState(0);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const { animationsEnabled } = useTheme();
  const [favoriteTransitions, setFavoriteTransitions] = useState<
    Map<string, 'adding' | 'removing'>
  >(new Map());

  // Action handlers - extracted to custom hook
  // This centralizes all handler functions that were previously scattered throughout the component
  const {
    handleOpenDetail,
    handleShareCombination,
    handleCopyCombination,
    handleCustomRecipeSubmit,
    handleEditCustomRecipe,
    handleDeleteCustomRecipe,
    handleCheckFavorite,
    handleToggleFavorite,
    handleAcceptSharedRecipe,
    handleDeclineSharedRecipe,
    handleCloseFilmdevPreview,
    handleConfirmFilmdevImport,
    handleImportRecipe,
    handleRefreshAll,
  } = useRecipeActions({
    customRecipes,
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
    refreshCustomRecipes,
    shareCustomRecipe,
    copyCustomRecipeToClipboard,
    shareRegularRecipe,
    copyRegularRecipeToClipboard,
    decodeSharedCustomRecipe,
    isFavorite,
    toggleFavorite,
    addFavorite,
    showToast,
    animationsEnabled,
    pageIndex,
    setIsDetailOpen,
    setDetailView,
    setIsCustomModalOpen,
    setEditingRecipe,
    setIsSubmittingRecipe,
    setIsSharedRecipeModalOpen,
    setSharedRecipeView,
    setIsAddingSharedRecipe,
    setIsFilmdevPreviewOpen,
    setFilmdevPreviewData,
    setFilmdevPreviewRecipe,
    setIsImportModalOpen,
    setIsImporting,
    setImportError,
    editingRecipe,
    detailView,
    sharedRecipeView,
    sharedRecipeSource,
    filmdevPreviewData,
    favoriteTransitions,
    setFavoriteTransitions,
    forceRefresh,
    setIsRefreshingData,
    getFilmById,
    getDeveloperById,
    allFilms,
    allDevelopers,
  });

  // Scroll to top of results when page changes, accounting for floating navbar
  useEffect(() => {
    if (resultsContainerRef.current) {
      const element = resultsContainerRef.current;
      const elementPosition =
        element.getBoundingClientRect().top + window.scrollY;
      const navbarHeight = 80; // Approximate navbar height + extra buffer
      const targetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });
    }
  }, [pageIndex]);

  // Prevent page index reset during favorite transitions
  const prevPageIndexRef = useRef(pageIndex);
  useEffect(() => {
    const hasActiveTransitions = favoriteTransitions.size > 0;
    if (
      hasActiveTransitions &&
      pageIndex === 0 &&
      prevPageIndexRef.current > 0
    ) {
      // TanStack Table tried to reset to page 0, revert it
      setPageIndex(prevPageIndexRef.current);
    } else {
      prevPageIndexRef.current = pageIndex;
    }
  }, [pageIndex, favoriteTransitions]);

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

  const {
    initialUrlState,
    isLoadingSharedRecipe,
    sharedRecipeError,
    sharedCustomRecipe,
  } = useRecipeUrlState(
    allFilms,
    allDevelopers,
    {
      selectedFilm,
      selectedDeveloper,
      dilutionFilter,
      isoFilter,
      favoritesOnly,
      customRecipeFilter,
    },
    recipesByUuid
  );

  const urlStateAppliedRef = useRef(false);
  const isApplyingUrlStateRef = useRef(false);

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
    let film = null;
    let developer = null;

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
          (d, index) => ({
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
      setSelectedFilm(initialUrlState.selectedFilm as Film);
    }
    if (initialUrlState.selectedDeveloper) {
      setSelectedDeveloper(initialUrlState.selectedDeveloper as Developer);
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
    getFilmById,
    getDeveloperById,
    recipesByUuid,
  ]);

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

    const sorted = rows.sort((a, b) => {
      if (sortBy === 'timeMinutes') {
        return sortDirection === 'asc'
          ? a.combination.timeMinutes - b.combination.timeMinutes
          : b.combination.timeMinutes - a.combination.timeMinutes;
      }
      if (sortBy === 'temperatureF') {
        return sortDirection === 'asc'
          ? a.combination.temperatureF - b.combination.temperatureF
          : b.combination.temperatureF - a.combination.temperatureF;
      }
      if (sortBy === 'shootingIso') {
        return sortDirection === 'asc'
          ? a.combination.shootingIso - b.combination.shootingIso
          : b.combination.shootingIso - a.combination.shootingIso;
      }
      if (sortBy === 'developerName') {
        const nameA = a.developer
          ? `${a.developer.manufacturer} ${a.developer.name}`
          : '';
        const nameB = b.developer
          ? `${b.developer.manufacturer} ${b.developer.name}`
          : '';
        return sortDirection === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      const nameA = a.film ? `${a.film.brand} ${a.film.name}` : '';
      const nameB = b.film ? `${b.film.brand} ${b.film.name}` : '';
      return sortDirection === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
    // Stable partition: favorites first, then others, keeping relative order
    const fav: DevelopmentCombinationView[] = [];
    const nonFav: DevelopmentCombinationView[] = [];
    for (const r of sorted) {
      const id = String(r.combination.uuid || r.combination.id);
      if (isFavorite(id)) {
        fav.push(r);
      } else {
        nonFav.push(r);
      }
    }
    return [...fav, ...nonFav];
  }, [
    apiCombinationViews,
    filteredCustomViews,
    sortBy,
    sortDirection,
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

  // Create table columns with context handlers
  const columns = useMemo(
    () =>
      createTableColumns({
        isFavorite: handleCheckFavorite,
        onToggleFavorite: handleToggleFavorite,
        onEditCustomRecipe: handleEditCustomRecipe,
        onDeleteCustomRecipe: handleDeleteCustomRecipe,
        onShareCombination: handleShareCombination,
      }),
    [
      handleCheckFavorite,
      handleToggleFavorite,
      handleEditCustomRecipe,
      handleDeleteCustomRecipe,
      handleShareCombination,
    ]
  );

  // Create TanStack table instance
  const table = useDevelopmentTable({
    rows: combinedRows,
    columns,
    sorting,
    onSortingChange: setSorting,
    pageIndex,
    onPageIndexChange: setPageIndex,
    isFavorite: memoizedIsFavorite,
  });


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

  return (
    <TemperatureProvider>
      <div className="mx-auto max-w-7xl space-y-6 py-6 px-4 pb-12 sm:px-6 lg:px-8">
        {error && (
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              borderWidth: 1,
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-border-muted)',
              color: 'var(--color-text-primary)',
            }}
          >
            {error}
          </div>
        )}

        <DevelopmentActionsBar
          totalResults={combinedRows.length}
          viewMode={isMobile ? 'grid' : viewMode}
          onViewModeChange={(mode) => {
            if (!isMobile) {
              setViewMode(mode);
            }
          }}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenCustomRecipeModal={() => {
            setEditingRecipe(null);
            setIsCustomModalOpen(true);
          }}
          onRefresh={handleRefreshAll}
          isRefreshing={isRefreshingData}
          showImportButton={flags.RECIPE_IMPORT}
          isMobile={isMobile}
        />

        <FilmDeveloperSelection
          selectedFilm={selectedFilm?.uuid || ''}
          onFilmChange={(value) => {
            const film = allFilms.find((f) => f.uuid === value);
            setSelectedFilm(film || null);
          }}
          filmOptions={filmOptions}
          selectedDeveloper={selectedDeveloper?.uuid || ''}
          onDeveloperChange={(value) => {
            const developer = allDevelopers.find((d) => d.uuid === value);
            setSelectedDeveloper(developer || null);
          }}
          developerOptions={developerOptions}
        />

        <CollapsibleFilters
          developerTypeFilter={developerTypeFilter}
          onDeveloperTypeFilterChange={setDeveloperTypeFilter}
          developerTypeOptions={[
            { label: 'All developers', value: '' },
            { label: 'Powder', value: 'powder' },
            { label: 'Concentrate', value: 'concentrate' },
          ]}
          dilutionFilter={dilutionFilter}
          onDilutionFilterChange={setDilutionFilter}
          dilutionOptions={getAvailableDilutions()}
          isoFilter={isoFilter}
          onIsoFilterChange={setIsoFilter}
          isoOptions={getAvailableISOs()}
          customRecipeFilter={customRecipeFilter}
          onCustomRecipeFilterChange={setCustomRecipeFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          tagOptions={getAvailableTags()}
          onClearFilters={clearFilters}
          showDeveloperTypeFilter={!selectedDeveloper}
          showDilutionFilter={!!selectedDeveloper}
          defaultCollapsed={true}
          favoritesOnly={favoritesOnly}
          onFavoritesOnlyChange={setFavoritesOnly}
        />

        <div className="transition-all duration-500 ease-in-out">
          {(isLoading || isRefreshingData) && (
            <div className="space-y-4 animate-slide-fade-top">
              <div
                className="flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm"
                style={{
                  borderWidth: 1,
                  borderColor: 'var(--color-border-secondary)',
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Loader2 className="h-5 w-5 animate-spin" />
                <div>
                  <div className="font-medium text-[color:var(--color-text-primary)]">
                    {!isLoaded
                      ? 'Loading development recipes...'
                      : 'Refreshing recipes...'}
                  </div>
                  <div className="text-xs text-[color:var(--color-text-tertiary)]">
                    {!isLoaded
                      ? 'Fetching films, developers, and combinations'
                      : 'Updating data from server'}
                  </div>
                </div>
              </div>

              {isMobile || viewMode === 'grid' ? (
                <div
                  className={cn(
                    'grid gap-4',
                    isMobile
                      ? 'grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  )}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div
                  className="overflow-hidden rounded-2xl border"
                  style={{
                    borderColor: 'var(--color-border-secondary)',
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
                  }}
                >
                  <table className="w-full">
                    <thead
                      className="border-b"
                      style={{
                        borderColor: 'var(--color-border-secondary)',
                        backgroundColor:
                          'rgba(var(--color-background-rgb), 0.05)',
                      }}
                    >
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                          Film
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                          Developer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                          ISO
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                          Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                          Temperature
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--color-text-tertiary)]">
                          Dilution
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonTableRow key={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!isLoading && !isRefreshingData && (
            <div
              ref={resultsContainerRef}
              key={`results-${isLoaded}-${combinedRows.length}`}
              className="animate-slide-fade-top"
            >
              {isMobile || viewMode === 'grid' ? (
                <DevelopmentResultsCards
                  table={table}
                  onSelectCombination={handleOpenDetail}
                  isMobile={isMobile}
                  isFavorite={handleCheckFavorite}
                  onToggleFavorite={handleToggleFavorite}
                  onShareCombination={handleShareCombination}
                  onCopyCombination={handleCopyCombination}
                  onEditCustomRecipe={handleEditCustomRecipe}
                  onDeleteCustomRecipe={handleDeleteCustomRecipe}
                  favoriteTransitions={favoriteTransitions}
                />
              ) : (
                <DevelopmentResultsTable
                  table={table}
                  onSelectCombination={handleOpenDetail}
                  favoriteTransitions={favoriteTransitions}
                />
              )}
            </div>
          )}
        </div>

        {!isLoading && !isRefreshingData && (
          <div className="animate-slide-fade-top animate-delay-300">
            <PaginationControls table={table} />
          </div>
        )}

        {isMobile ? (
          <Drawer
            isOpen={isDetailOpen && !!detailView}
            onClose={() => setIsDetailOpen(false)}
            size="lg"
            anchor="bottom"
            enableBackgroundBlur={true}
          >
            <DrawerContent className="h-full max-h-[85vh] bg-[color:var(--color-surface)]">
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: 'var(--color-border-secondary)' }}
              >
                <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">
                  Recipe details
                </h2>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-full p-2 transition"
                  style={{
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border-secondary)',
                    borderWidth: 1,
                  }}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <DrawerBody className="space-y-4 px-4 pb-6 pt-4">
                {detailView && (
                  <DevelopmentRecipeDetail
                    view={detailView}
                    onEditCustomRecipe={handleEditCustomRecipe}
                    onDeleteCustomRecipe={handleDeleteCustomRecipe}
                    isFavorite={(view) =>
                      isFavorite(
                        String(view.combination.uuid || view.combination.id)
                      )
                    }
                    onToggleFavorite={(view) =>
                      toggleFavorite(
                        String(view.combination.uuid || view.combination.id)
                      )
                    }
                    onShareRecipe={handleShareCombination}
                  />
                )}
                {detailView && (
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        toggleFavorite(
                          String(
                            detailView.combination.uuid ||
                              detailView.combination.id
                          )
                        )
                      }
                      className="w-full rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-105"
                      style={{
                        backgroundColor: 'var(--color-text-primary)',
                        color: 'var(--color-background)',
                      }}
                    >
                      {isFavorite(
                        String(
                          detailView.combination.uuid ||
                            detailView.combination.id
                        )
                      )
                        ? 'Remove from favorites'
                        : 'Add to favorites'}
                    </button>
                    {detailView.source === 'custom' &&
                      flags.CUSTOM_RECIPE_SHARING && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleShareCombination(detailView)}
                            className="w-full rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-105"
                            style={{
                              backgroundColor: 'var(--color-text-primary)',
                              color: 'var(--color-background)',
                            }}
                          >
                            Share recipe
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyCombination(detailView)}
                            className="w-full rounded-full px-4 py-2 text-sm font-medium transition"
                            style={{
                              color: 'var(--color-text-secondary)',
                              borderColor: 'var(--color-border-secondary)',
                              borderWidth: 1,
                            }}
                          >
                            Copy link
                          </button>
                        </>
                      )}
                  </div>
                )}
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        ) : (
          <Modal
            isOpen={isDetailOpen && !!detailView}
            onClose={() => setIsDetailOpen(false)}
            title="Recipe details"
            size="lg"
          >
            {detailView && (
              <DevelopmentRecipeDetail
                view={detailView}
                onEditCustomRecipe={handleEditCustomRecipe}
                onDeleteCustomRecipe={handleDeleteCustomRecipe}
                isFavorite={(view) =>
                  isFavorite(
                    String(view.combination.uuid || view.combination.id)
                  )
                }
                onToggleFavorite={(view) =>
                  toggleFavorite(
                    String(view.combination.uuid || view.combination.id)
                  )
                }
                onShareRecipe={handleShareCombination}
              />
            )}
            {detailView && (
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    toggleFavorite(
                      String(
                        detailView.combination.uuid || detailView.combination.id
                      )
                    )
                  }
                  className="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-105"
                  style={{
                    backgroundColor: 'var(--color-text-primary)',
                    color: 'var(--color-background)',
                  }}
                >
                  {isFavorite(
                    String(
                      detailView.combination.uuid || detailView.combination.id
                    )
                  )
                    ? 'Remove from favorites'
                    : 'Add to favorites'}
                </button>
                {detailView.source === 'custom' &&
                  flags.CUSTOM_RECIPE_SHARING && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleShareCombination(detailView)}
                        className="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-105"
                        style={{
                          backgroundColor: 'var(--color-text-primary)',
                          color: 'var(--color-background)',
                        }}
                      >
                        Share recipe
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyCombination(detailView)}
                        className="flex-1 rounded-full px-4 py-2 text-sm font-medium transition"
                        style={{
                          color: 'var(--color-text-secondary)',
                          borderColor: 'var(--color-border-secondary)',
                          borderWidth: 1,
                        }}
                      >
                        Copy link
                      </button>
                    </>
                  )}
              </div>
            )}
          </Modal>
        )}

        {isMobile ? (
          <Drawer
            isOpen={isCustomModalOpen}
            onClose={() => {
              setIsCustomModalOpen(false);
              setEditingRecipe(null);
            }}
            size="lg"
            anchor="bottom"
            enableBackgroundBlur={true}
            className="max-h-[100dvh]"
          >
            <DrawerContent className="h-full max-h-[100dvh] bg-[color:var(--color-surface)]">
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: 'var(--color-border-secondary)' }}
              >
                <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">
                  {editingRecipe ? 'Edit custom recipe' : 'Add custom recipe'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomModalOpen(false);
                    setEditingRecipe(null);
                  }}
                  className="rounded-full p-2 transition"
                  style={{
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border-secondary)',
                    borderWidth: 1,
                  }}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <DrawerBody className="px-4 pb-24 pt-4">
                <CustomRecipeForm
                  initialValue={
                    editingRecipe
                      ? convertRecipeToFormData(editingRecipe)
                      : CUSTOM_RECIPE_FORM_DEFAULT
                  }
                  onSubmit={handleCustomRecipeSubmit}
                  onCancel={() => {
                    setIsCustomModalOpen(false);
                    setEditingRecipe(null);
                  }}
                  filmOptions={filmOptions}
                  developerOptions={developerOptions}
                  isSubmitting={isSubmittingRecipe}
                />
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        ) : (
          <Modal
            isOpen={isCustomModalOpen}
            onClose={() => {
              setIsCustomModalOpen(false);
              setEditingRecipe(null);
            }}
            title={editingRecipe ? 'Edit custom recipe' : 'Add custom recipe'}
            size="lg"
          >
            <CustomRecipeForm
              initialValue={
                editingRecipe
                  ? convertRecipeToFormData(editingRecipe)
                  : CUSTOM_RECIPE_FORM_DEFAULT
              }
              onSubmit={handleCustomRecipeSubmit}
              onCancel={() => {
                setIsCustomModalOpen(false);
                setEditingRecipe(null);
              }}
              filmOptions={filmOptions}
              developerOptions={developerOptions}
              isSubmitting={isSubmittingRecipe}
            />
          </Modal>
        )}

        {isMobile ? (
          <Drawer
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            size="md"
            anchor="bottom"
            enableBackgroundBlur={true}
          >
            <DrawerContent className="h-full max-h-[70vh] bg-[color:var(--color-surface)]">
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: 'var(--color-border-secondary)' }}
              >
                <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">
                  Import shared recipe
                </h2>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-full p-2 transition"
                  style={{
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border-secondary)',
                    borderWidth: 1,
                  }}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <DrawerBody className="px-4 pb-6 pt-4">
                <ImportRecipeForm
                  onImport={handleImportRecipe}
                  onCancel={() => setIsImportModalOpen(false)}
                  isProcessing={isImporting}
                  error={importError}
                />
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        ) : (
          <Modal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            title="Import shared recipe"
            size="sm"
          >
            <ImportRecipeForm
              onImport={handleImportRecipe}
              onCancel={() => setIsImportModalOpen(false)}
              isProcessing={isImporting}
              error={importError}
            />
          </Modal>
        )}

        <SharedRecipeModal
          isOpen={isSharedRecipeModalOpen}
          onClose={handleDeclineSharedRecipe}
          recipe={sharedRecipeView}
          onAddToCollection={handleAcceptSharedRecipe}
          isProcessing={isAddingSharedRecipe}
          recipeSource={sharedRecipeSource}
          variant={isMobile ? 'drawer' : 'modal'}
          hideAddToCollection={false}
          isFavorite={(view) =>
            isFavorite(String(view.combination.uuid || view.combination.id))
          }
          onToggleFavorite={(view) =>
            toggleFavorite(String(view.combination.uuid || view.combination.id))
          }
        />

        <FilmdevPreviewModal
          isOpen={isFilmdevPreviewOpen}
          onClose={handleCloseFilmdevPreview}
          onConfirm={handleConfirmFilmdevImport}
          mappingResult={filmdevPreviewData}
          previewRecipe={filmdevPreviewRecipe}
          isProcessing={isImporting}
          variant={isMobile ? 'drawer' : 'modal'}
        />

        {(isLoadingSharedRecipe || sharedRecipeError) && (
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              borderWidth: 1,
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {isLoadingSharedRecipe && 'Loading shared recipe…'}
            {sharedRecipeError && <span>{sharedRecipeError}</span>}
          </div>
        )}
      </div>
    </TemperatureProvider>
  );
}
