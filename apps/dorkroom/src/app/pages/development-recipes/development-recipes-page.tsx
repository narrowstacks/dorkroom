import { useRef, useState, useMemo } from 'react';
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
} from '@dorkroom/logic';
import { useRecipeModals } from './hooks/useRecipeModals';
import { useRecipeActions } from './hooks/useRecipeActions';
import { useRecipeData } from './hooks/useRecipeData';
import { useUrlStateSync } from './hooks/useUrlStateSync';
import { useResultsPagination } from './hooks/useResultsPagination';
import { RecipeModals } from './components/recipe-modals';
import { RecipeResultsSection } from './components/recipe-results-section';
import {
  FilmDeveloperSelection,
  CollapsibleFilters,
  FiltersSidebar,
  MobileSortingControls,
  DevelopmentActionsBar,
  TemperatureProvider,
  PaginationControls,
  createTableColumns,
  useToast,
  useIsMobile,
} from '@dorkroom/ui';
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

  // Data processing and derived state
  const {
    recipesByUuid,
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
    customRecipeFilter,
    tagFilter,
    favoritesOnly,
    sortBy,
    sortDirection,
    sharedCustomRecipe: null, // Computed internally by useRecipeData from URL state
    flags,
    isFavorite,
    getFilmById,
    getDeveloperById,
  });

  const { initialUrlState, isLoadingSharedRecipe, sharedRecipeError } =
    useRecipeUrlState(
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

  // Action handlers
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
    setFavoritesOnly,
    setCustomRecipeFilter,
    setSharedRecipeView,
    setSharedRecipeSource,
    setIsSharedRecipeModalOpen,
    setDetailView,
    setIsDetailOpen,
  });

  // Pagination and scroll management
  useResultsPagination({
    pageIndex,
    setPageIndex,
    favoriteTransitions,
    resultsContainerRef,
  });

  // Create table columns with action handlers
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

  const clearSelections = () => {
    setSelectedFilm(null);
    setSelectedDeveloper(null);
  };

  return (
    <TemperatureProvider>
      <div className="mx-auto max-w-[1920px] space-y-6 py-6 px-4 pb-12 sm:px-6 lg:px-8">
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

        {isMobile ? (
          <>
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

            <MobileSortingControls
              sorting={sorting}
              onSortingChange={setSorting}
            />

            <RecipeResultsSection
              isLoading={isLoading}
              isRefreshingData={isRefreshingData}
              isLoaded={isLoaded}
              isMobile={isMobile}
              viewMode={viewMode}
              table={table}
              resultsContainerRef={resultsContainerRef}
              favoriteTransitions={favoriteTransitions}
              onSelectCombination={handleOpenDetail}
              onToggleFavorite={handleToggleFavorite}
              onShareCombination={handleShareCombination}
              onCopyCombination={handleCopyCombination}
              onEditCustomRecipe={handleEditCustomRecipe}
              onDeleteCustomRecipe={handleDeleteCustomRecipe}
              isFavorite={handleCheckFavorite}
            />

            {!isLoading && !isRefreshingData && (
              <div className="animate-slide-fade-top animate-delay-300">
                <PaginationControls table={table} />
              </div>
            )}
          </>
        ) : (
          <div className="flex gap-6">
            <aside className="w-80 flex-shrink-0">
              <FiltersSidebar
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
                favoritesOnly={favoritesOnly}
                onFavoritesOnlyChange={setFavoritesOnly}
                sorting={sorting}
                onSortingChange={setSorting}
                showSortingControls={viewMode === 'grid'}
                onClearFilters={clearFilters}
                onClearSelections={clearSelections}
                showDeveloperTypeFilter={!selectedDeveloper}
                showDilutionFilter={!!selectedDeveloper}
              />
            </aside>

            <main className="flex-1 min-w-0 space-y-6">
              <RecipeResultsSection
                isLoading={isLoading}
                isRefreshingData={isRefreshingData}
                isLoaded={isLoaded}
                isMobile={isMobile}
                viewMode={viewMode}
                table={table}
                resultsContainerRef={resultsContainerRef}
                favoriteTransitions={favoriteTransitions}
                onSelectCombination={handleOpenDetail}
                onToggleFavorite={handleToggleFavorite}
                onShareCombination={handleShareCombination}
                onCopyCombination={handleCopyCombination}
                onEditCustomRecipe={handleEditCustomRecipe}
                onDeleteCustomRecipe={handleDeleteCustomRecipe}
                isFavorite={handleCheckFavorite}
              />

              {!isLoading && !isRefreshingData && (
                <div className="animate-slide-fade-top animate-delay-300">
                  <PaginationControls table={table} />
                </div>
              )}
            </main>
          </div>
        )}

        <RecipeModals
          isMobile={isMobile}
          isDetailOpen={isDetailOpen}
          detailView={detailView}
          onCloseDetail={() => setIsDetailOpen(false)}
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
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          onEditCustomRecipe={handleEditCustomRecipe}
          onDeleteCustomRecipe={handleDeleteCustomRecipe}
          onShareRecipe={handleShareCombination}
          onCopyRecipe={handleCopyCombination}
          customRecipeSharingEnabled={flags.CUSTOM_RECIPE_SHARING}
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
