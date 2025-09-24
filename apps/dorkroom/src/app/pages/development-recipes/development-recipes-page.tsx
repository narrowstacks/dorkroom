import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  useCustomRecipes,
  useDevelopmentRecipes,
  useRecipeSharing,
  useRecipeUrlState,
  usePagination,
  useFeatureFlags,
  useViewPreference,
  getCustomRecipeFilm,
  getCustomRecipeDeveloper,
  type CustomRecipeFormData,
} from '@dorkroom/logic';
import {
  CalculatorPageHeader,
  FilmDeveloperSelection,
  CollapsibleFilters,
  DevelopmentResultsTable,
  DevelopmentResultsCards,
  DevelopmentRecipeDetail,
  DevelopmentActionsBar,
  CustomRecipeForm,
  ImportRecipeForm,
  SharedRecipeModal,
  Modal,
  Drawer,
  DrawerContent,
  DrawerBody,
  TemperatureProvider,
  SkeletonCard,
  SkeletonTableRow,
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

const convertRecipeToFormData = (
  view: DevelopmentCombinationView
): CustomRecipeFormData => {
  const combination = view.combination;

  return {
    name: combination.name || '',
    useExistingFilm: !combination.filmStockId.startsWith('custom_film_'),
    selectedFilmId: combination.filmStockId.startsWith('custom_film_')
      ? ''
      : combination.filmStockId,
    customFilm: combination.filmStockId.startsWith('custom_film_')
      ? {
          brand: view.film?.brand || '',
          name: view.film?.name || '',
          isoSpeed: view.film?.isoSpeed || 400,
          colorType:
            view.film?.colorType === 'color' || view.film?.colorType === 'slide'
              ? view.film.colorType
              : 'bw',
          grainStructure: view.film?.grainStructure || '',
          description: view.film?.description || '',
        }
      : undefined,
    useExistingDeveloper: !combination.developerId.startsWith('custom_dev_'),
    selectedDeveloperId: combination.developerId.startsWith('custom_dev_')
      ? ''
      : combination.developerId,
    customDeveloper: combination.developerId.startsWith('custom_dev_')
      ? {
          manufacturer: view.developer?.manufacturer || '',
          name: view.developer?.name || '',
          type: view.developer?.type || 'powder',
          filmOrPaper: 'film', // Default to film since API only provides boolean
          workingLifeHours: undefined, // Developer type doesn't have this field
          stockLifeMonths: undefined, // Developer type doesn't have this field
          notes: view.developer?.notes || '',
          mixingInstructions: '', // Developer type doesn't have this field
          safetyNotes: '', // Developer type doesn't have this field
          dilutions: view.developer?.dilutions || [
            { name: 'Stock', dilution: 'Stock' },
          ],
        }
      : undefined,
    temperatureF: combination.temperatureF,
    timeMinutes: combination.timeMinutes,
    shootingIso: combination.shootingIso,
    pushPull: combination.pushPull || 0,
    agitationSchedule: combination.agitationSchedule || '',
    notes: combination.notes || '',
    customDilution: combination.customDilution || '',
    isPublic: false, // Default to false for editing
  };
};

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
    handleSort,
    loadData,
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
  const isMobile = useIsMobile();
  const { viewMode, setViewMode } = useViewPreference();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [detailView, setDetailView] =
    useState<DevelopmentCombinationView | null>(null);
  const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSharedRecipeModalOpen, setIsSharedRecipeModalOpen] = useState(false);
  const [sharedRecipeView, setSharedRecipeView] =
    useState<DevelopmentCombinationView | null>(null);
  const [sharedRecipeSource, setSharedRecipeSource] = useState<
    'shared' | 'custom'
  >('shared');
  const [isAddingSharedRecipe, setIsAddingSharedRecipe] = useState(false);
  const [editingRecipe, setEditingRecipe] =
    useState<DevelopmentCombinationView | null>(null);

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
        filmSlug: recipe.filmId,
        developerId: recipe.developerId,
        developerSlug: recipe.developerId,
        temperatureF: recipe.temperatureF,
        temperatureC: ((recipe.temperatureF - 32) * 5) / 9,
        timeMinutes: recipe.timeMinutes,
        shootingIso: recipe.shootingIso,
        pushPull: recipe.pushPull,
        agitationSchedule: recipe.agitationSchedule,
        notes: recipe.notes,
        customDilution: recipe.customDilution,
        dilutionId: recipe.dilutionId,
        dateAdded: recipe.dateCreated,
        tags: ['custom'],
        infoSource: null,
      } as unknown as Combination);
    });
    return map;
  }, [filteredCombinations, customRecipes]);

  const { initialUrlState, isLoadingSharedRecipe, sharedRecipeError } =
    useRecipeUrlState(
      allFilms,
      allDevelopers,
      {
        selectedFilm,
        selectedDeveloper,
        dilutionFilter,
        isoFilter,
      },
      recipesByUuid
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

    // Check for shared recipe in URL
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

        setSharedRecipeView(recipeView);
        setSharedRecipeSource('shared');
        setIsSharedRecipeModalOpen(true);
      }
    }

    urlStateAppliedRef.current = true;
  }, [
    isLoaded,
    initialUrlState,
    setSelectedFilm,
    setSelectedDeveloper,
    setDilutionFilter,
    setIsoFilter,
    getFilmById,
    getDeveloperById,
    recipesByUuid,
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
        filmSlug: recipe.filmId,
        developerId: recipe.developerId,
        developerSlug: recipe.developerId,
        temperatureF: recipe.temperatureF,
        temperatureC: ((recipe.temperatureF - 32) * 5) / 9,
        timeMinutes: recipe.timeMinutes,
        shootingIso: recipe.shootingIso,
        pushPull: recipe.pushPull,
        agitationSchedule: recipe.agitationSchedule,
        notes: recipe.notes,
        customDilution: recipe.customDilution,
        dilutionId: recipe.dilutionId,
        dateAdded: recipe.dateCreated,
        tags: ['custom'],
        infoSource: null,
      } as unknown as Combination;

      return {
        combination,
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
  }, [
    apiCombinationViews,
    filteredCustomViews,
    sortBy,
    sortDirection,
    customRecipeFilter,
    tagFilter,
  ]);

  const pagination = usePagination(combinedRows, 24);
  const paginatedRows = pagination.paginatedItems;

  const handleOpenDetail = useCallback((view: DevelopmentCombinationView) => {
    setDetailView(view);
    setIsDetailOpen(true);
  }, []);

  const handleShareCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      const combinationId = String(
        view.combination.uuid || view.combination.id
      );

      if (view.source === 'custom') {
        const recipe = customRecipes.find((item) => item.id === combinationId);
        if (!recipe) {
          return;
        }
        await shareCustomRecipe({ recipe });
      } else {
        // Share regular recipe
        await shareRegularRecipe({
          recipeId: combinationId,
          recipeName: view.combination.name,
        });
      }
    },
    [customRecipes, shareCustomRecipe, shareRegularRecipe]
  );

  const handleCopyCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      const combinationId = String(
        view.combination.uuid || view.combination.id
      );

      if (view.source === 'custom') {
        const recipe = customRecipes.find((item) => item.id === combinationId);
        if (!recipe) {
          return;
        }
        await copyCustomRecipeToClipboard({ recipe });
      } else {
        // Copy regular recipe link
        await copyRegularRecipeToClipboard({
          recipeId: combinationId,
          recipeName: view.combination.name,
        });
      }
    },
    [customRecipes, copyCustomRecipeToClipboard, copyRegularRecipeToClipboard]
  );

  const handleCustomRecipeSubmit = useCallback(
    async (data: CustomRecipeFormData) => {
      setIsSubmittingRecipe(true);
      try {
        if (editingRecipe) {
          // Update existing recipe
          const customRecipe = customRecipes.find(
            (r) => r.id === String(editingRecipe.combination.id)
          );
          if (customRecipe) {
            await updateCustomRecipe(customRecipe.id, data);
          }
        } else {
          // Add new recipe
          await addCustomRecipe(data);
        }
        await refreshCustomRecipes();
        setIsCustomModalOpen(false);
        setEditingRecipe(null);
      } finally {
        setIsSubmittingRecipe(false);
      }
    },
    [
      addCustomRecipe,
      updateCustomRecipe,
      refreshCustomRecipes,
      editingRecipe,
      customRecipes,
    ]
  );

  const handleEditCustomRecipe = useCallback(
    (view: DevelopmentCombinationView) => {
      const customRecipe = customRecipes.find(
        (r) => r.id === String(view.combination.id)
      );
      if (customRecipe) {
        setEditingRecipe(view);
        setIsCustomModalOpen(true);
      }
    },
    [customRecipes]
  );

  const handleDeleteCustomRecipe = useCallback(
    async (view: DevelopmentCombinationView) => {
      if (
        !window.confirm(
          'Are you sure you want to delete this custom recipe? This action cannot be undone.'
        )
      ) {
        return;
      }
      try {
        await deleteCustomRecipe(String(view.combination.id));
        await refreshCustomRecipes();

        // Close detail modal if it's showing the deleted recipe
        if (
          String(detailView?.combination.id) === String(view.combination.id)
        ) {
          setIsDetailOpen(false);
          setDetailView(null);
        }
      } catch (error) {
        console.error('Failed to delete custom recipe:', error);
        window.alert('Failed to delete the recipe. Please try again.');
      }
    },
    [deleteCustomRecipe, refreshCustomRecipes, detailView]
  );

  const handleAcceptSharedRecipe = useCallback(async () => {
    if (!sharedRecipeView) return;

    setIsAddingSharedRecipe(true);
    try {
      if (sharedRecipeSource === 'custom') {
        // Handle custom recipe sharing - this would come from URL
        // For now, we'll focus on the modal display
      } else {
        // Handle regular recipe - add to custom recipes
        const combination = sharedRecipeView.combination;
        const formData: CustomRecipeFormData = {
          name: combination.name || `Shared Recipe - ${combination.id}`,
          useExistingFilm: true,
          selectedFilmId: combination.filmStockId,
          useExistingDeveloper: true,
          selectedDeveloperId: combination.developerId,
          temperatureF: combination.temperatureF,
          timeMinutes: combination.timeMinutes,
          shootingIso: combination.shootingIso,
          pushPull: combination.pushPull || 0,
          agitationSchedule: combination.agitationSchedule || '',
          notes: combination.notes || 'Imported from shared recipe',
          customDilution: combination.customDilution || '',
          isPublic: false,
        };

        await addCustomRecipe(formData);
        await refreshCustomRecipes();
      }

      setIsSharedRecipeModalOpen(false);
      setSharedRecipeView(null);
    } finally {
      setIsAddingSharedRecipe(false);
    }
  }, [
    sharedRecipeView,
    sharedRecipeSource,
    addCustomRecipe,
    refreshCustomRecipes,
  ]);

  const handleDeclineSharedRecipe = useCallback(() => {
    setIsSharedRecipeModalOpen(false);
    setSharedRecipeView(null);
  }, []);

  const handleImportRecipe = useCallback(
    async (encoded: string) => {
      setImportError(null);
      setIsImporting(true);

      try {
        const imported = decodeSharedCustomRecipe(encoded);
        if (!imported || !imported.isValid) {
          setImportError(
            'Unable to decode this recipe. Please check the link.'
          );
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
                manufacturer:
                  importedRecipe.customDeveloper?.manufacturer || '',
                name: importedRecipe.customDeveloper?.name || '',
                type: importedRecipe.customDeveloper?.type || 'powder',
                filmOrPaper:
                  importedRecipe.customDeveloper?.filmOrPaper || 'film',
                workingLifeHours:
                  importedRecipe.customDeveloper?.workingLifeHours,
                stockLifeMonths:
                  importedRecipe.customDeveloper?.stockLifeMonths,
                notes: importedRecipe.customDeveloper?.notes,
                mixingInstructions:
                  importedRecipe.customDeveloper?.mixingInstructions,
                safetyNotes: importedRecipe.customDeveloper?.safetyNotes,
                dilutions: importedRecipe.customDeveloper?.dilutions || [
                  { name: 'Stock', dilution: 'Stock' },
                ],
              }
            : undefined,
        };

        await addCustomRecipe(formData);
        await refreshCustomRecipes();
        setIsImportModalOpen(false);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'Failed to import recipe'
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
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([forceRefresh(), refreshCustomRecipes()]);
  }, [forceRefresh, refreshCustomRecipes]);

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
      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
        <CalculatorPageHeader
          title="Development Recipes"
          description="Browse proven film and developer combinations with timing, temperature, and agitation guidance. Bring your own recipes into the mix, and share favorites with friends."
        ></CalculatorPageHeader>

        {error && (
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              borderWidth: 1,
              borderColor:
                'color-mix(in oklab, var(--color-accent) 30%, transparent)',
              backgroundColor:
                'color-mix(in oklab, var(--color-accent) 10%, transparent)',
              color:
                'color-mix(in oklab, var(--color-accent) 85%, var(--color-text-primary))',
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
          isRefreshing={isLoading}
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
          defaultCollapsed={true}
        />

        <div className="transition-all duration-500 ease-in-out">
          {isLoading && (
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

          {!isLoading && (
            <div
              key={`results-${isLoaded}-${combinedRows.length}`}
              className="animate-slide-fade-top"
            >
              {isMobile || viewMode === 'grid' ? (
                <DevelopmentResultsCards
                  rows={paginatedRows}
                  onSelectCombination={handleOpenDetail}
                  onShareCombination={handleShareCombination}
                  onCopyCombination={handleCopyCombination}
                  onEditCustomRecipe={handleEditCustomRecipe}
                  onDeleteCustomRecipe={handleDeleteCustomRecipe}
                  isMobile={isMobile}
                />
              ) : (
                <DevelopmentResultsTable
                  rows={paginatedRows}
                  onSelectCombination={handleOpenDetail}
                  onShareCombination={handleShareCombination}
                  onCopyCombination={handleCopyCombination}
                  onEditCustomRecipe={handleEditCustomRecipe}
                  onDeleteCustomRecipe={handleDeleteCustomRecipe}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              )}
            </div>
          )}
        </div>

        {!isLoading && (
          <div className="animate-slide-fade-top animate-delay-300">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onNext={pagination.goToNext}
              onPrevious={pagination.goToPrevious}
            />
          </div>
        )}

        {isMobile ? (
          <Drawer
            isOpen={isDetailOpen && !!detailView}
            onClose={() => setIsDetailOpen(false)}
            size="lg"
            anchor="bottom"
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
                  />
                )}
                {detailView?.source === 'custom' &&
                  flags.CUSTOM_RECIPE_SHARING && (
                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() =>
                          detailView && handleShareCombination(detailView)
                        }
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
                        onClick={() =>
                          detailView && handleCopyCombination(detailView)
                        }
                        className="w-full rounded-full px-4 py-2 text-sm font-medium transition"
                        style={{
                          color:
                            'color-mix(in oklab, var(--color-text-primary) 80%, transparent)',
                          borderColor: 'var(--color-border-secondary)',
                          borderWidth: 1,
                        }}
                      >
                        Copy link
                      </button>
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
              />
            )}
            {detailView?.source === 'custom' && flags.CUSTOM_RECIPE_SHARING && (
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    detailView && handleShareCombination(detailView)
                  }
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
                  onClick={() =>
                    detailView && handleCopyCombination(detailView)
                  }
                  className="flex-1 rounded-full px-4 py-2 text-sm font-medium transition"
                  style={{
                    color:
                      'color-mix(in oklab, var(--color-text-primary) 80%, transparent)',
                    borderColor: 'var(--color-border-secondary)',
                    borderWidth: 1,
                  }}
                >
                  Copy link
                </button>
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
          >
            <DrawerContent className="h-full max-h-[90vh] bg-[color:var(--color-surface)]">
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
              <DrawerBody className="px-4 pb-6 pt-4">
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
          currentPage === 1 && 'cursor-not-allowed opacity-50'
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
          currentPage === totalPages && 'cursor-not-allowed opacity-50'
        )}
      >
        Next
      </button>
    </div>
  );
}

function useIsMobile(maxWidth = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [maxWidth]);

  return isMobile;
}
