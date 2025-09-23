import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useCustomRecipes,
  useDevelopmentRecipes,
  useCustomRecipeSharing,
  useRecipeUrlState,
  usePagination,
  useFeatureFlags,
  getCustomRecipeFilm,
  getCustomRecipeDeveloper,
  type CustomRecipeFormData,
} from '@dorkroom/logic';
import {
  CalculatorPageHeader,
  CalculatorStat,
  DevelopmentFiltersPanel,
  DevelopmentResultsTable,
  DevelopmentResultsCards,
  DevelopmentRecipeDetail,
  DevelopmentActionsBar,
  CustomRecipeForm,
  ImportRecipeForm,
  Modal,
  type DevelopmentCombinationView,
  cn,
} from '@dorkroom/ui';
import type { Combination, Film, Developer } from '@dorkroom/api';

const CUSTOM_RECIPE_FORM_DEFAULT: CustomRecipeFormData = {
  name: '',
  useExistingFilm: true,
  selectedFilmId: '',
  customFilm: undefined,
  useExistingDeveloper: true,
  selectedDeveloperId: '',
  customDeveloper: undefined,
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '30s initial, 10s every minute',
  notes: '',
  customDilution: '',
  isPublic: false,
};

export default function DevelopmentRecipesPage() {
  const {
    filmSearch,
    developerSearch,
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
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
    setFilmSearch,
    setDeveloperSearch,
    setDeveloperTypeFilter,
    setDilutionFilter,
    setIsoFilter,
    setSelectedFilm,
    setSelectedDeveloper,
    handleSort,
    loadData,
    forceRefresh,
    clearFilters,
    getFilmById,
    getDeveloperById,
    getAvailableDilutions,
    getAvailableISOs,
  } = useDevelopmentRecipes();

  const {
    customRecipes,
    addCustomRecipe,
    forceRefresh: refreshCustomRecipes,
  } = useCustomRecipes();

  const {
    shareCustomRecipe,
    copyCustomRecipeToClipboard,
    decodeSharedCustomRecipe,
    isCustomRecipeUrl,
  } = useCustomRecipeSharing();

  const { flags } = useFeatureFlags();

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [detailView, setDetailView] = useState<DevelopmentCombinationView | null>(null);
  const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const recipesByUuid = useMemo(() => {
    const map = new Map<string, Combination>();
    filteredCombinations.forEach((combo) => {
      if (combo.uuid) {
        map.set(combo.uuid, combo);
      }
    });
    customRecipes.forEach((recipe) => {
      map.set(recipe.id, {
        id: recipe.id,
        uuid: recipe.id,
        slug: recipe.id,
        name: recipe.name,
        filmStockId: recipe.filmId,
        developerId: recipe.developerId,
        temperatureF: recipe.temperatureF,
        timeMinutes: recipe.timeMinutes,
        shootingIso: recipe.shootingIso,
        pushPull: recipe.pushPull,
        agitationSchedule: recipe.agitationSchedule,
        notes: recipe.notes,
        customDilution: recipe.customDilution,
        dilutionId: recipe.dilutionId,
        dateAdded: recipe.dateCreated,
      } as Combination);
    });
    return map;
  }, [filteredCombinations, customRecipes]);

  const {
    initialUrlState,
    hasUrlState,
    sharedRecipe,
    sharedCustomRecipe,
    isLoadingSharedRecipe,
    sharedRecipeError,
    hasSharedRecipe,
    hasSharedCustomRecipe,
  } = useRecipeUrlState(
    allFilms,
    allDevelopers,
    {
      selectedFilm,
      selectedDeveloper,
      dilutionFilter,
      isoFilter,
    },
    recipesByUuid,
  );

  const urlStateAppliedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !initialUrlState.fromUrl || urlStateAppliedRef.current) {
      return;
    }

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

    urlStateAppliedRef.current = true;
  }, [
    isLoaded,
    initialUrlState,
    setSelectedFilm,
    setSelectedDeveloper,
    setDilutionFilter,
    setIsoFilter,
  ]);

  const customCombinationViews = useMemo<DevelopmentCombinationView[]>(() => {
    if (!customRecipes.length) {
      return [];
    }

    return customRecipes.map((recipe) => {
      const combination: Combination = {
        id: recipe.id,
        uuid: recipe.id,
        slug: recipe.id,
        name: recipe.name,
        filmStockId: recipe.filmId,
        developerId: recipe.developerId,
        temperatureF: recipe.temperatureF,
        timeMinutes: recipe.timeMinutes,
        shootingIso: recipe.shootingIso,
        pushPull: recipe.pushPull,
        agitationSchedule: recipe.agitationSchedule,
        notes: recipe.notes,
        customDilution: recipe.customDilution,
        dilutionId: recipe.dilutionId,
        dateAdded: recipe.dateCreated,
      } as Combination;

      return {
        combination,
        film: getCustomRecipeFilm(recipe.id, customRecipes, getFilmById),
        developer: getCustomRecipeDeveloper(recipe.id, customRecipes, getDeveloperById),
        source: 'custom',
        canShare: flags.CUSTOM_RECIPE_SHARING,
      } satisfies DevelopmentCombinationView;
    });
  }, [customRecipes, getDeveloperById, getFilmById, flags.CUSTOM_RECIPE_SHARING]);

  const apiCombinationViews = useMemo<DevelopmentCombinationView[]>(() => {
    return filteredCombinations.map((combination) => ({
      combination,
      film: getFilmById(combination.filmStockId),
      developer: getDeveloperById(combination.developerId),
      source: 'api',
      canShare: false,
    }));
  }, [filteredCombinations, getFilmById, getDeveloperById]);

  const filteredCustomViews = useMemo(() => {
    if (!customCombinationViews.length) {
      return [];
    }

    return customCombinationViews.filter((view) => {
      const { combination, film, developer } = view;

      if (selectedFilm && combination.filmStockId !== selectedFilm.uuid) {
        return false;
      }

      if (selectedDeveloper && combination.developerId !== selectedDeveloper.uuid) {
        return false;
      }

      if (!selectedFilm && filmSearch.trim()) {
        const haystack = `${film?.brand ?? ''} ${film?.name ?? ''}`.toLowerCase();
        if (!haystack.includes(filmSearch.toLowerCase())) {
          return false;
        }
      }

      if (!selectedDeveloper && developerSearch.trim()) {
        const haystack = `${developer?.manufacturer ?? ''} ${developer?.name ?? ''}`.toLowerCase();
        if (!haystack.includes(developerSearch.toLowerCase())) {
          return false;
        }
      }

      if (developerTypeFilter && developer?.type !== developerTypeFilter) {
        return false;
      }

      if (dilutionFilter && combination.customDilution?.toLowerCase() !== dilutionFilter.toLowerCase()) {
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
    filmSearch,
    developerSearch,
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
  ]);

  const combinedRows = useMemo<DevelopmentCombinationView[]>(() => {
    const rows = [...apiCombinationViews, ...filteredCustomViews];

    return rows.sort((a, b) => {
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
  }, [apiCombinationViews, filteredCustomViews, sortBy, sortDirection]);

  const pagination = usePagination(combinedRows, 25);
  const paginatedRows = pagination.paginatedItems;

  const handleOpenDetail = useCallback((view: DevelopmentCombinationView) => {
    setDetailView(view);
    setIsDetailOpen(true);
  }, []);

  const handleShareCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      const combinationId = view.combination.uuid || view.combination.id;
      const recipe = customRecipes.find((item) => item.id === combinationId);
      if (!recipe) {
        return;
      }

      await shareCustomRecipe({ recipe });
    },
    [customRecipes, shareCustomRecipe],
  );

  const handleCopyCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      const combinationId = view.combination.uuid || view.combination.id;
      const recipe = customRecipes.find((item) => item.id === combinationId);
      if (!recipe) {
        return;
      }

      await copyCustomRecipeToClipboard({ recipe });
    },
    [customRecipes, copyCustomRecipeToClipboard],
  );

  const handleCustomRecipeSubmit = useCallback(
    async (data: CustomRecipeFormData) => {
      setIsSubmittingRecipe(true);
      try {
        await addCustomRecipe(data);
        await refreshCustomRecipes();
        setIsCustomModalOpen(false);
      } finally {
        setIsSubmittingRecipe(false);
      }
    },
    [addCustomRecipe, refreshCustomRecipes],
  );

  const handleImportRecipe = useCallback(
    async (encoded: string) => {
      setImportError(null);
      setIsImporting(true);

      try {
        const imported = decodeSharedCustomRecipe(encoded);
        if (!imported || !imported.isValid) {
          setImportError('Unable to decode this recipe. Please check the link.');
          return;
        }

        const importedRecipe = imported.recipe;

        const formData: CustomRecipeFormData = {
          ...CUSTOM_RECIPE_FORM_DEFAULT,
          name: importedRecipe.name,
          temperatureF: importedRecipe.temperatureF,
          timeMinutes: importedRecipe.timeMinutes,
          shootingIso: importedRecipe.shootingIso,
          pushPull: importedRecipe.pushPull,
          agitationSchedule: importedRecipe.agitationSchedule || '',
          notes: importedRecipe.notes || '',
          customDilution: importedRecipe.customDilution || '',
          isPublic: importedRecipe.isPublic ?? false,
          useExistingFilm: !!getFilmById(importedRecipe.filmId),
          selectedFilmId: getFilmById(importedRecipe.filmId)?.uuid || '',
          customFilm: importedRecipe.isCustomFilm
            ? {
                brand: importedRecipe.customFilm?.brand || '',
                name: importedRecipe.customFilm?.name || '',
                isoSpeed: importedRecipe.customFilm?.isoSpeed || 400,
                colorType: importedRecipe.customFilm?.colorType || 'bw',
                description: importedRecipe.customFilm?.description,
                grainStructure: importedRecipe.customFilm?.grainStructure,
              }
            : undefined,
          useExistingDeveloper: !!getDeveloperById(importedRecipe.developerId),
          selectedDeveloperId:
            getDeveloperById(importedRecipe.developerId)?.uuid || '',
          customDeveloper: importedRecipe.isCustomDeveloper
            ? {
                manufacturer: importedRecipe.customDeveloper?.manufacturer || '',
                name: importedRecipe.customDeveloper?.name || '',
                type: importedRecipe.customDeveloper?.type || 'powder',
                filmOrPaper: importedRecipe.customDeveloper?.filmOrPaper || 'film',
                workingLifeHours: importedRecipe.customDeveloper?.workingLifeHours,
                stockLifeMonths: importedRecipe.customDeveloper?.stockLifeMonths,
                notes: importedRecipe.customDeveloper?.notes,
                mixingInstructions:
                  importedRecipe.customDeveloper?.mixingInstructions,
                safetyNotes: importedRecipe.customDeveloper?.safetyNotes,
                dilutions:
                  importedRecipe.customDeveloper?.dilutions ||
                  [{ name: 'Stock', dilution: 'Stock' }],
              }
            : undefined,
        };

        await addCustomRecipe(formData);
        await refreshCustomRecipes();
        setIsImportModalOpen(false);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'Failed to import recipe',
        );
      } finally {
        setIsImporting(false);
      }
    },
    [
      addCustomRecipe,
      refreshCustomRecipes,
      decodeSharedCustomRecipe,
      getDeveloperById,
      getFilmById,
    ],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([forceRefresh(), refreshCustomRecipes()]);
  }, [forceRefresh, refreshCustomRecipes]);

  const filmOptions = useMemo(() => {
    return [{ label: 'Select film', value: '' }, ...allFilms.map((film) => ({
      label: `${film.brand} ${film.name}`,
      value: film.uuid,
    }))];
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
    <div className="space-y-6">
      <CalculatorPageHeader
        title="Development Recipes"
        description="Browse proven film and developer combinations with timing, temperature, and agitation guidance. Bring your own recipes into the mix, and share favorites with friends."
      >
        <CalculatorStat label="Combinations" value={combinedRows.length} />
        <CalculatorStat
          label="Custom recipes"
          value={customRecipes.length}
        />
        {hasSharedRecipe && (
          <CalculatorStat label="Shared recipe" value="Loaded" />
        )}
        {hasSharedCustomRecipe && (
          <CalculatorStat label="Custom share" value="Loaded" />
        )}
      </CalculatorPageHeader>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <DevelopmentActionsBar
        totalResults={combinedRows.length}
        viewMode={viewMode === 'table' ? 'table' : 'grid'}
        onViewModeChange={(mode) => setViewMode(mode === 'table' ? 'table' : 'grid')}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenCustomRecipeModal={() => {
          setIsCustomModalOpen(true);
        }}
        onRefresh={handleRefreshAll}
        isRefreshing={isLoading}
        showImportButton={flags.RECIPE_IMPORT}
      />

      <DevelopmentFiltersPanel
        filmSearch={filmSearch}
        onFilmSearchChange={setFilmSearch}
        developerSearch={developerSearch}
        onDeveloperSearchChange={setDeveloperSearch}
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
        onClearFilters={clearFilters}
      />

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Refreshing recipes…
        </div>
      )}

      {viewMode === 'table' ? (
        <DevelopmentResultsTable
          rows={paginatedRows}
          onSelectCombination={handleOpenDetail}
          onShareCombination={flags.CUSTOM_RECIPE_SHARING ? handleShareCombination : undefined}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      ) : (
        <DevelopmentResultsCards
          rows={paginatedRows}
          onSelectCombination={handleOpenDetail}
          onShareCombination={flags.CUSTOM_RECIPE_SHARING ? handleShareCombination : undefined}
        />
      )}

      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onNext={pagination.goToNext}
        onPrevious={pagination.goToPrevious}
      />

      <Modal
        isOpen={isDetailOpen && !!detailView}
        onClose={() => setIsDetailOpen(false)}
        title="Recipe details"
        size="lg"
      >
        {detailView && <DevelopmentRecipeDetail view={detailView} />}
        {detailView?.source === 'custom' && flags.CUSTOM_RECIPE_SHARING && (
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => detailView && handleShareCombination(detailView)}
              className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Share recipe
            </button>
            <button
              type="button"
              onClick={() => detailView && handleCopyCombination(detailView)}
              className="flex-1 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Copy link
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="Add custom recipe"
        size="lg"
      >
        <CustomRecipeForm
          initialValue={CUSTOM_RECIPE_FORM_DEFAULT}
          onSubmit={handleCustomRecipeSubmit}
          onCancel={() => setIsCustomModalOpen(false)}
          filmOptions={filmOptions}
          developerOptions={developerOptions}
          isSubmitting={isSubmittingRecipe}
        />
      </Modal>

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

      {(isLoadingSharedRecipe || sharedRecipeError) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {isLoadingSharedRecipe && 'Loading shared recipe…'}
          {sharedRecipeError && <span>{sharedRecipeError}</span>}
        </div>
      )}
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onNext,
  onPrevious,
}: {
  currentPage: number;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 text-sm text-white/70">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage === 1}
        className={cn(
          'rounded-full border border-white/20 px-3 py-1.5 transition hover:border-white/40 hover:text-white',
          currentPage === 1 && 'cursor-not-allowed opacity-50',
        )}
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages}
        className={cn(
          'rounded-full border border-white/20 px-3 py-1.5 transition hover:border-white/40 hover:text-white',
          currentPage === totalPages && 'cursor-not-allowed opacity-50',
        )}
      >
        Next
      </button>
    </div>
  );
}
