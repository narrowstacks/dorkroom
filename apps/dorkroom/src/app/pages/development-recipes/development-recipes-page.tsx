import type { CustomRecipeFilter } from '@dorkroom/logic';
import {
  readRecipeUrlSearchQuery,
  useCustomRecipes,
  useDevelopmentRecipes,
  useDevelopmentTable,
  useFavorites,
  useRecipeSharing,
  useRecipeUrlState,
  useViewPreference,
} from '@dorkroom/logic';
import {
  ConfirmModal,
  TemperatureProvider,
  useIsMobile,
  useTheme,
  useToast,
} from '@dorkroom/ui';
import {
  CollapsibleFilters,
  createTableColumns,
  DevelopmentActionsBar,
  type DevelopmentCombinationView,
  FilmDeveloperSelection,
  FiltersSidebar,
  MobileSortingControls,
  PaginationControls,
  RecipeDetailPanel,
  type TableColumnContext,
} from '@dorkroom/ui/development-recipes';
import type { SortingState } from '@tanstack/react-table';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type DevelopmentFilter,
  trackEvent,
} from '../../lib/analytics/tracked-events';
import { useSearchDeadEndAnalytics } from '../../lib/analytics/use-search-analytics';
import { RecipeModals } from './components/recipe-modals';
import { RecipeResultsSection } from './components/recipe-results-section';
import { SharedRecipeNotice } from './components/shared-recipe-notice';
import { useClearFilters } from './hooks/useClearFilters';
import { useRecipeActions } from './hooks/useRecipeActions';
import { useRecipeData, useRecipesByUuid } from './hooks/useRecipeData';
import { useRecipeModals } from './hooks/useRecipeModals';
import { useResultsPagination } from './hooks/useResultsPagination';
import { useUrlStateSync } from './hooks/useUrlStateSync';

const DEVELOPER_TYPE_OPTIONS = [
  { label: 'All developers', value: '' },
  { label: 'Powder', value: 'powder' },
  { label: 'Concentrate', value: 'concentrate' },
];

// eslint-disable-next-line react-doctor/no-giant-component, react-doctor/prefer-useReducer -- top-level page that wires together many independent feature hooks; splitting/reducer-izing was attempted but regressed behavior, so it is kept as the composition root (tracked as follow-up)
export default function DevelopmentRecipesPage() {
  const {
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
    customRecipeFilter,
    searchQuery,
    debouncedSearchQuery,
    selectedFilm,
    selectedDeveloper,
    isLoading,
    isLoaded,
    error,
    allFilms,
    allDevelopers,
    allCombinations,
    filteredCombinations,
    setDeveloperTypeFilter,
    setDilutionFilter,
    setIsoFilter,
    setCustomRecipeFilter,
    setSearchQuery,
    setSelectedFilm,
    setSelectedDeveloper,
    forceRefresh,
    clearFilters,
    getFilmById,
    getDeveloperById,
    getAvailableDilutions,
    getAvailableISOs,
    // `q` is the one URL param that needs no catalogue data, so it seeds the
    // search state at mount; useRecipeUrlState below writes it back.
  } = useDevelopmentRecipes({ searchQuery: readRecipeUrlSearchQuery() });

  const {
    customRecipes,
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
  } = useCustomRecipes();

  const {
    shareCustomRecipe,
    copyCustomRecipeToClipboard,
    shareRegularRecipe,
    copyRegularRecipeToClipboard,
    decodeSharedCustomRecipe,
  } = useRecipeSharing();

  const { isFavorite, toggleFavorite, addFavorite } = useFavorites();
  const isMobile = useIsMobile();
  const { viewMode, setViewMode } = useViewPreference();
  const { showToast } = useToast();

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
    isDeleteConfirmOpen,
    deleteConfirmRecipe,
    isDeleting,
    openDeleteConfirm,
    closeDeleteConfirm,
    setIsDeleting,
  } = useRecipeModals();

  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'film', desc: false },
  ]);
  const [pageIndex, setPageIndex] = useState(0);
  const [isFiltersSidebarCollapsed, setIsFiltersSidebarCollapsed] =
    useState(false);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const virtualScrollContainerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const [mainContentHeight, setMainContentHeight] = useState<
    number | undefined
  >(undefined);
  const { animationsEnabled } = useTheme();
  const [favoriteTransitions, setFavoriteTransitions] = useState<
    Map<string, 'adding' | 'removing'>
  >(new Map());

  const recipesByUuid = useRecipesByUuid(allCombinations, customRecipes);

  // Get the selected recipe ID for URL syncing
  // Only sync API recipes to URL (not custom recipes which use encoded sharing)
  const selectedRecipeId =
    isDetailOpen && detailView?.source === 'api'
      ? String(detailView.combination.uuid || detailView.combination.id)
      : null;

  const {
    initialUrlState,
    isLoadingSharedRecipe,
    sharedRecipeError,
    dismissSharedRecipeError,
    sharedCustomRecipe,
  } = useRecipeUrlState(
    allFilms,
    allDevelopers,
    {
      searchQuery,
      selectedFilm,
      selectedDeveloper,
      dilutionFilter,
      isoFilter,
      developerTypeFilter,
      customRecipeFilter,
      favoritesOnly,
      selectedRecipeId,
    },
    recipesByUuid
  );

  // Data processing and derived state
  const {
    combinedRows,
    sharedCustomRecipeView,
    filmOptions,
    developerOptions,
    memoizedIsFavorite,
  } = useRecipeData({
    filteredCombinations,
    customRecipes,
    allFilms,
    allDevelopers,
    selectedFilm,
    selectedDeveloper,
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
    searchQuery: debouncedSearchQuery,
    customRecipeFilter,
    favoritesOnly,
    sharedCustomRecipe,
    isFavorite,
    getFilmById,
    getDeveloperById,
  });

  // Defer expensive combined-row re-computation so filter interactions remain
  // responsive. The table renders with the previous rows until React has idle
  // time to commit the new filtered set, keeping INP low on filter changes.
  const deferredCombinedRows = useDeferredValue(combinedRows);

  // Action handlers
  const {
    handleOpenDetail,
    handleShareCombination,
    handleCopyCombination,
    handleCustomRecipeSubmit,
    handleEditCustomRecipe,
    handleDeleteCustomRecipe,
    confirmDeleteCustomRecipe,
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
    deleteConfirmRecipe,
    openDeleteConfirm,
    closeDeleteConfirm,
    setIsDeleting,
    editingRecipe,
    detailView,
    sharedRecipeView,
    sharedRecipeSource,
    filmdevPreviewData,
    favoriteTransitions,
    setFavoriteTransitions,
    forceRefresh,
    setIsRefreshingData,
    setIsFiltersSidebarCollapsed,
    getFilmById,
    getDeveloperById,
    allFilms,
    allDevelopers,
  });

  // URL state synchronization
  useUrlStateSync({
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
  });

  // Pagination and scroll management
  useResultsPagination({
    pageIndex,
    setPageIndex,
    favoriteTransitions,
    resultsContainerRef,
    virtualScrollContainerRef,
  });

  // Use refs to store handlers so columns can stay stable
  // This prevents table cell re-renders when handlers change (e.g., after navigation)
  const columnHandlersRef = useRef<TableColumnContext>({
    isFavorite: handleCheckFavorite,
    onToggleFavorite: handleToggleFavorite,
    onEditCustomRecipe: handleEditCustomRecipe,
    onDeleteCustomRecipe: handleDeleteCustomRecipe,
    onShareCombination: handleShareCombination,
  });

  // Update ref after each commit to keep handlers current. This runs in an
  // effect rather than during render because render must stay pure — the
  // column wrappers below only read columnHandlersRef.current from event
  // handlers (post-render), so a same-tick effect assignment is equivalent.
  useEffect(() => {
    columnHandlersRef.current = {
      isFavorite: handleCheckFavorite,
      onToggleFavorite: handleToggleFavorite,
      onEditCustomRecipe: handleEditCustomRecipe,
      onDeleteCustomRecipe: handleDeleteCustomRecipe,
      onShareCombination: handleShareCombination,
    };
  });

  // Create stable columns - wrapper functions read from ref at call time
  const columns = useMemo(
    () =>
      createTableColumns({
        isFavorite: (view) =>
          columnHandlersRef.current.isFavorite?.(view) ?? false,
        onToggleFavorite: (view) =>
          columnHandlersRef.current.onToggleFavorite?.(view),
        onEditCustomRecipe: (view) =>
          columnHandlersRef.current.onEditCustomRecipe?.(view),
        onDeleteCustomRecipe: (view) =>
          columnHandlersRef.current.onDeleteCustomRecipe?.(view),
        onShareCombination: (view) =>
          columnHandlersRef.current.onShareCombination?.(view),
      }),
    []
  );

  // Create TanStack table instance — uses deferred rows to avoid blocking
  // the main thread while filter memoization catches up
  const table = useDevelopmentTable({
    rows: deferredCombinedRows,
    columns,
    sorting,
    onSortingChange: setSorting,
    pageIndex,
    onPageIndexChange: setPageIndex,
    isFavorite: memoizedIsFavorite,
  });

  // Reset to first page when sorting changes
  // Memoize the stringified sorting to avoid recreating on every render
  const sortingKey = useMemo(() => JSON.stringify(sorting), [sorting]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sortingKey is intentionally used to trigger page reset when sorting changes
  // eslint-disable-next-line react-doctor/no-derived-state-effect -- intentional "reset page index when sorting changes" side effect, not derived state
  useEffect(() => {
    // eslint-disable-next-line react-doctor/no-chain-state-updates -- intentional "reset page index when sorting changes" side effect; sorting originates inside the TanStack table, not a single event handler we own
    setPageIndex(0);
  }, [sortingKey]);

  // Track main content height so the detail panel can match it.
  // RAF-debounced to avoid triggering setState on every layout shift during
  // resize, which would cause unnecessary re-renders on the main thread.
  useEffect(() => {
    const el = mainContentRef.current;
    if (!el) return;

    let rafId: number | undefined;

    const observer = new ResizeObserver((entries) => {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = undefined;
        for (const entry of entries) {
          setMainContentHeight(entry.contentRect.height);
        }
      });
    });
    // eslint-disable-next-line react-doctor/no-initialize-state -- ResizeObserver measurement: the height is read from the live DOM after mount and on every resize, not knowable at useState() init time
    observer.observe(el);
    return () => {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
      observer.disconnect();
    };
  }, []);

  // The debounced query paired with the rows it actually produced. Using the
  // live query would report a dead end on every keystroke, and
  // `deferredCombinedRows` deliberately lags a further render, so both of the
  // page's stale reads are avoided here.
  useSearchDeadEndAnalytics({
    tool: 'development',
    query: debouncedSearchQuery,
    resultCount: combinedRows.length,
    activeFilterCount: [
      developerTypeFilter,
      dilutionFilter,
      isoFilter,
      customRecipeFilter !== 'all' ? customRecipeFilter : '',
      favoritesOnly ? 'favorites' : '',
    ].filter(Boolean).length,
    isLoading,
  });

  // Wrapping only what the filter UI calls. `useUrlStateSync` writes the same
  // state through the raw setters, so restoring a bookmarked or shared filter
  // is not counted as someone reaching for the control.
  const trackFilter = useCallback((filter: DevelopmentFilter) => {
    trackEvent('filter_applied', { tool: 'development', filter });
  }, []);

  const handleDeveloperTypeFilterChange = useCallback(
    (value: string) => {
      if (value) trackFilter('developer_type');
      setDeveloperTypeFilter(value);
    },
    [trackFilter, setDeveloperTypeFilter]
  );

  const handleDilutionFilterChange = useCallback(
    (value: string) => {
      if (value) trackFilter('dilution');
      setDilutionFilter(value);
    },
    [trackFilter, setDilutionFilter]
  );

  const handleIsoFilterChange = useCallback(
    (value: string) => {
      if (value) trackFilter('iso');
      setIsoFilter(value);
    },
    [trackFilter, setIsoFilter]
  );

  const handleCustomRecipeFilterChange = useCallback(
    (value: CustomRecipeFilter) => {
      if (value !== 'all') trackFilter('recipe_type');
      setCustomRecipeFilter(value);
    },
    [trackFilter, setCustomRecipeFilter]
  );

  const handleFavoritesOnlyChange = useCallback(
    (value: boolean) => {
      if (value) trackFilter('favorites');
      setFavoritesOnly(value);
    },
    [trackFilter, setFavoritesOnly]
  );

  const clearSelections = () => {
    setSelectedFilm(null);
    setSelectedDeveloper(null);
  };

  const handleClearFilters = useClearFilters({
    clearFilters,
    setFavoritesOnly,
  });

  // Raw toggle for the detail panel and the shared recipe preview: it skips the
  // list's fade animation and its favorite_toggled event, as both always did.
  const handleToggleViewFavorite = (view: DevelopmentCombinationView) =>
    toggleFavorite(String(view.combination.uuid || view.combination.id));

  // One props object for whichever filter module the breakpoint mounts.
  const filterProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    developerTypeFilter,
    onDeveloperTypeFilterChange: handleDeveloperTypeFilterChange,
    developerTypeOptions: DEVELOPER_TYPE_OPTIONS,
    dilutionFilter,
    onDilutionFilterChange: handleDilutionFilterChange,
    dilutionOptions: getAvailableDilutions(),
    isoFilter,
    onIsoFilterChange: handleIsoFilterChange,
    isoOptions: getAvailableISOs(),
    customRecipeFilter,
    onCustomRecipeFilterChange: handleCustomRecipeFilterChange,
    favoritesOnly,
    onFavoritesOnlyChange: handleFavoritesOnlyChange,
    onClearFilters: handleClearFilters,
    showDeveloperTypeFilter: !selectedDeveloper,
    showDilutionFilter: !!selectedDeveloper,
  };

  const filmDeveloperProps = {
    selectedFilm: selectedFilm?.uuid || '',
    onFilmChange: (value: string) => {
      const film = allFilms.find((f) => f.uuid === value);
      setSelectedFilm(film || null);
    },
    filmOptions,
    selectedDeveloper: selectedDeveloper?.uuid || '',
    onDeveloperChange: (value: string) => {
      const developer = allDevelopers.find((d) => d.uuid === value);
      setSelectedDeveloper(developer || null);
    },
    developerOptions,
  };

  const resultsSection = (
    <RecipeResultsSection
      isLoading={isLoading}
      isRefreshingData={isRefreshingData}
      isLoaded={isLoaded}
      isMobile={isMobile}
      viewMode={viewMode}
      table={table}
      resultsContainerRef={resultsContainerRef}
      virtualScrollContainerRef={virtualScrollContainerRef}
      favoriteTransitions={favoriteTransitions}
      onSelectCombination={handleOpenDetail}
      onToggleFavorite={handleToggleFavorite}
      onShareCombination={handleShareCombination}
      onCopyCombination={handleCopyCombination}
      onEditCustomRecipe={handleEditCustomRecipe}
      onDeleteCustomRecipe={handleDeleteCustomRecipe}
      isFavorite={handleCheckFavorite}
      selectedRecipeId={selectedRecipeId}
    />
  );

  const pagination = !isLoading && !isRefreshingData && (
    <div className="animate-slide-fade-top animate-delay-300">
      <PaginationControls table={table} />
    </div>
  );

  // One detail panel for both breakpoints: it renders the sidebar or the
  // bottom drawer itself through `isMobile`. Keyed by breakpoint so crossing
  // it starts the panel fresh (an expanded desktop modal drops back to the
  // drawer instead of carrying its state over).
  const detailPanel = (
    <RecipeDetailPanel
      key={isMobile ? 'mobile' : 'desktop'}
      view={detailView}
      // On mobile the drawer is portaled above the form drawers (z-[100] vs
      // z-50), so it steps aside while the custom recipe form is open and
      // returns, showing the saved recipe, when the form closes.
      isOpen={isDetailOpen && !(isMobile && isCustomModalOpen)}
      onClose={() => setIsDetailOpen(false)}
      isMobile={isMobile}
      isFavorite={handleCheckFavorite}
      onToggleFavorite={handleToggleViewFavorite}
      onEditCustomRecipe={handleEditCustomRecipe}
      onDeleteCustomRecipe={handleDeleteCustomRecipe}
      onShareRecipe={handleShareCombination}
      onCopyRecipe={handleCopyCombination}
      maxHeight={isMobile ? undefined : mainContentHeight}
    />
  );

  return (
    <TemperatureProvider>
      {/* Max-width of 1920px accommodates wider displays while maintaining content readability */}
      <div className="mx-auto max-w-[1920px] space-y-3 py-3 px-4 pb-4 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-2xl border border-secondary bg-border-muted px-4 py-3 text-sm text-primary">
            {error}
          </div>
        )}

        <SharedRecipeNotice
          isLoading={isLoadingSharedRecipe}
          message={sharedRecipeError}
          onDismiss={dismissSharedRecipeError}
        />

        <DevelopmentActionsBar
          totalResults={deferredCombinedRows.length}
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
          isLoading={isLoading}
          isMobile={isMobile}
        />

        {isMobile ? (
          <>
            <FilmDeveloperSelection
              selectedFilm={filmDeveloperProps.selectedFilm}
              onFilmChange={filmDeveloperProps.onFilmChange}
              filmOptions={filmOptions}
              selectedDeveloper={filmDeveloperProps.selectedDeveloper}
              onDeveloperChange={filmDeveloperProps.onDeveloperChange}
              developerOptions={developerOptions}
            />

            <CollapsibleFilters {...filterProps} defaultCollapsed={true} />

            <MobileSortingControls
              sorting={sorting}
              onSortingChange={setSorting}
            />

            {resultsSection}
            {pagination}
            {detailPanel}
          </>
        ) : (
          <div className="flex gap-4">
            <aside
              className="flex-shrink-0 transition-[width] duration-300"
              style={{ width: isFiltersSidebarCollapsed ? '64px' : '304px' }}
            >
              <FiltersSidebar
                {...filterProps}
                {...filmDeveloperProps}
                sorting={sorting}
                onSortingChange={setSorting}
                showSortingControls={viewMode === 'grid'}
                onClearSelections={clearSelections}
                onCollapsedChange={setIsFiltersSidebarCollapsed}
                collapsed={isFiltersSidebarCollapsed}
                defaultCollapsed={false}
              />
            </aside>

            <main ref={mainContentRef} className="flex-1 min-w-0 space-y-3">
              {resultsSection}
              {pagination}
            </main>

            {detailPanel}
          </div>
        )}

        <RecipeModals
          isMobile={isMobile}
          isCustomModalOpen={isCustomModalOpen}
          editingRecipe={editingRecipe}
          isSubmittingRecipe={isSubmittingRecipe}
          onCloseCustomModal={() => {
            setIsCustomModalOpen(false);
            setEditingRecipe(null);
          }}
          onCustomRecipeSubmit={handleCustomRecipeSubmit}
          filmOptions={filmOptions}
          developerOptions={developerOptions}
          allFilms={allFilms}
          allDevelopers={allDevelopers}
          isImportModalOpen={isImportModalOpen}
          onCloseImportModal={() => setIsImportModalOpen(false)}
          isImporting={isImporting}
          importError={importError ?? undefined}
          onImportRecipe={handleImportRecipe}
          isSharedRecipeModalOpen={isSharedRecipeModalOpen}
          sharedRecipeView={sharedRecipeView}
          sharedRecipeSource={sharedRecipeSource}
          isAddingSharedRecipe={isAddingSharedRecipe}
          onAcceptSharedRecipe={handleAcceptSharedRecipe}
          onDeclineSharedRecipe={handleDeclineSharedRecipe}
          isFilmdevPreviewOpen={isFilmdevPreviewOpen}
          filmdevPreviewData={filmdevPreviewData}
          filmdevPreviewRecipe={filmdevPreviewRecipe}
          onCloseFilmdevPreview={handleCloseFilmdevPreview}
          onConfirmFilmdevImport={handleConfirmFilmdevImport}
          isFavorite={handleCheckFavorite}
          onToggleFavorite={handleToggleViewFavorite}
        />

        <ConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDeleteCustomRecipe}
          title="Delete Recipe"
          message="Are you sure you want to delete this custom recipe? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isDestructive
          isProcessing={isDeleting}
        />
      </div>
    </TemperatureProvider>
  );
}
