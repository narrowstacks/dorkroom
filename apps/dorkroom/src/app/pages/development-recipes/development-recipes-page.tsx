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
  debugLog,
  debugError,
  type CustomRecipeFormData,
  isFilmdevInput,
  extractRecipeId,
  fetchFilmdevRecipe,
  mapFilmdevRecipe,
  FilmdevApiError,
  type FilmdevMappingResult,
} from '@dorkroom/logic';
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
} from '@dorkroom/ui';
import type { Combination, Film, Developer } from '@dorkroom/api';
import { useTheme } from '@dorkroom/ui';

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
  isFavorite: false,
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
    isFavorite: false,
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [detailView, setDetailView] =
    useState<DevelopmentCombinationView | null>(null);
  const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isFilmdevPreviewOpen, setIsFilmdevPreviewOpen] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [filmdevPreviewData, setFilmdevPreviewData] =
    useState<FilmdevMappingResult | null>(null);
  const [filmdevPreviewRecipe, setFilmdevPreviewRecipe] =
    useState<DevelopmentCombinationView | null>(null);
  const [isSharedRecipeModalOpen, setIsSharedRecipeModalOpen] = useState(false);
  const [sharedRecipeView, setSharedRecipeView] =
    useState<DevelopmentCombinationView | null>(null);
  const [sharedRecipeSource, setSharedRecipeSource] = useState<
    'shared' | 'custom'
  >('shared');
  const [isAddingSharedRecipe, setIsAddingSharedRecipe] = useState(false);
  const [editingRecipe, setEditingRecipe] =
    useState<DevelopmentCombinationView | null>(null);
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
  const transitionTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
    if (initialUrlState.view === 'favorites') {
      setFavoritesOnly(true);
    } else if (initialUrlState.view === 'custom') {
      setCustomRecipeFilter('only-custom');
    }

    // Check for shared custom recipe from URL
    if (sharedCustomRecipe) {
      // Convert CustomRecipe to DevelopmentCombinationView
      const combination: Combination = {
        id: 'shared-custom',
        uuid: 'shared-custom',
        slug: 'shared-custom',
        name: sharedCustomRecipe.name,
        filmStockId: sharedCustomRecipe.filmId,
        filmSlug: sharedCustomRecipe.filmId,
        developerId: sharedCustomRecipe.developerId,
        developerSlug: sharedCustomRecipe.developerId,
        temperatureF: sharedCustomRecipe.temperatureF,
        temperatureC: ((sharedCustomRecipe.temperatureF - 32) * 5) / 9,
        timeMinutes: sharedCustomRecipe.timeMinutes,
        shootingIso: sharedCustomRecipe.shootingIso,
        pushPull: sharedCustomRecipe.pushPull,
        agitationSchedule: sharedCustomRecipe.agitationSchedule || '',
        notes: sharedCustomRecipe.notes || '',
        customDilution: sharedCustomRecipe.customDilution || '',
        dilutionId: sharedCustomRecipe.dilutionId || null,
        dateAdded: new Date().toISOString(),
        tags: sharedCustomRecipe.tags || ['custom'],
        infoSource: null,
      } as unknown as Combination;

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

      setSharedRecipeView(recipeView);
      setSharedRecipeSource('custom');
      setIsSharedRecipeModalOpen(true);
      urlStateAppliedRef.current = true;
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
  }, [
    isLoaded,
    initialUrlState,
    sharedCustomRecipe,
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

  const handleOpenDetail = useCallback((view: DevelopmentCombinationView) => {
    setDetailView(view);
    setIsDetailOpen(true);
  }, []);

  const handleShareCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      const combinationId = String(
        view.combination.uuid || view.combination.id
      );

      let result;
      if (view.source === 'custom') {
        const recipe = customRecipes.find((item) => item.id === combinationId);
        if (!recipe) {
          return;
        }
        result = await shareCustomRecipe({ recipe });
      } else {
        // Share regular recipe
        result = await shareRegularRecipe({
          recipeId: combinationId,
          recipeName: view.combination.name,
          filmSlug: view.film?.slug,
          developerSlug: view.developer?.slug,
        });
      }

      // Show toast if the result indicates we should
      if (result?.showToast) {
        if (result.success && result.method === 'clipboard') {
          showToast('Link copied to clipboard!', 'success');
        } else if (!result.success && result.error) {
          showToast(result.error, 'error');
        }
      }
    },
    [customRecipes, shareCustomRecipe, shareRegularRecipe, showToast]
  );

  const handleCopyCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      const combinationId = String(
        view.combination.uuid || view.combination.id
      );

      let result;
      if (view.source === 'custom') {
        const recipe = customRecipes.find((item) => item.id === combinationId);
        if (!recipe) {
          return;
        }
        result = await copyCustomRecipeToClipboard({ recipe });
      } else {
        // Copy regular recipe link
        result = await copyRegularRecipeToClipboard({
          recipeId: combinationId,
          recipeName: view.combination.name,
          filmSlug: view.film?.slug,
          developerSlug: view.developer?.slug,
        });
      }

      // Show toast if the result indicates we should
      if (result?.showToast) {
        if (result.success && result.method === 'clipboard') {
          showToast('Link copied to clipboard!', 'success');
        } else if (!result.success && result.error) {
          showToast(result.error, 'error');
        }
      }
    },
    [
      customRecipes,
      copyCustomRecipeToClipboard,
      copyRegularRecipeToClipboard,
      showToast,
    ]
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
          const newId = await addCustomRecipe(data);
          if (data.isFavorite) {
            addFavorite(newId);
          }
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
      addFavorite,
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
        debugError('Failed to delete custom recipe:', error);
        window.alert('Failed to delete the recipe. Please try again.');
      }
    },
    [deleteCustomRecipe, refreshCustomRecipes, detailView]
  );

  // Memoize favorite callbacks to prevent column recreation on every render
  const handleCheckFavorite = useCallback(
    (view: DevelopmentCombinationView) =>
      isFavorite(String(view.combination.uuid || view.combination.id)),
    [isFavorite]
  );

  const handleToggleFavorite = useCallback(
    (view: DevelopmentCombinationView) => {
      const id = String(view.combination.uuid || view.combination.id);

      if (!animationsEnabled) {
        toggleFavorite(id);
        return;
      }

      // Determine if adding or removing favorite
      const isCurrentlyFavorite = isFavorite(id);
      const transitionType = isCurrentlyFavorite ? 'removing' : 'adding';

      // Add to transition state
      setFavoriteTransitions((prev) => new Map(prev).set(id, transitionType));

      // Clear any existing timeout for this ID
      const existingTimeout = transitionTimeoutRefs.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set timeout for skeleton animation duration (500ms)
      const timeout = setTimeout(() => {
        toggleFavorite(id);

        // For off-page items, show message skeleton for 2 seconds after toggle
        if (transitionType === 'adding' && pageIndex > 0) {
          const messageTimeout = setTimeout(() => {
            setFavoriteTransitions((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            transitionTimeoutRefs.current.delete(id);
          }, 2000);
          transitionTimeoutRefs.current.set(id, messageTimeout);
        } else {
          // Remove from transition state after animation completes
          setFavoriteTransitions((prev) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
          transitionTimeoutRefs.current.delete(id);
        }
      }, 500);

      transitionTimeoutRefs.current.set(id, timeout);
    },
    [toggleFavorite, isFavorite, animationsEnabled, pageIndex]
  );

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

  const handleAcceptSharedRecipe = useCallback(async () => {
    if (!sharedRecipeView) return;

    setIsAddingSharedRecipe(true);
    try {
      const combination = sharedRecipeView.combination;

      if (sharedRecipeSource === 'custom') {
        // Handle custom recipe sharing from URL
        // Check if it uses custom film/developer or existing ones
        const isCustomFilm =
          combination.filmStockId === 'custom_film_temp' ||
          combination.filmStockId.startsWith('custom_film_');
        const isCustomDeveloper =
          combination.developerId === 'custom_dev_temp' ||
          combination.developerId.startsWith('custom_dev_');

        const formData: CustomRecipeFormData = {
          name: combination.name || 'Shared Custom Recipe',
          useExistingFilm: !isCustomFilm,
          selectedFilmId: isCustomFilm ? '' : combination.filmStockId,
          customFilm:
            isCustomFilm && sharedRecipeView.film
              ? {
                  brand: sharedRecipeView.film.brand,
                  name: sharedRecipeView.film.name,
                  isoSpeed: sharedRecipeView.film.isoSpeed,
                  colorType: (sharedRecipeView.film.colorType === 'color' ||
                  sharedRecipeView.film.colorType === 'slide'
                    ? sharedRecipeView.film.colorType
                    : 'bw') as 'bw' | 'color' | 'slide',
                  grainStructure: sharedRecipeView.film.grainStructure || '',
                  description: sharedRecipeView.film.description || '',
                }
              : undefined,
          useExistingDeveloper: !isCustomDeveloper,
          selectedDeveloperId: isCustomDeveloper ? '' : combination.developerId,
          customDeveloper:
            isCustomDeveloper && sharedRecipeView.developer
              ? {
                  manufacturer: sharedRecipeView.developer.manufacturer,
                  name: sharedRecipeView.developer.name,
                  type: sharedRecipeView.developer.type,
                  filmOrPaper: sharedRecipeView.developer.filmOrPaper
                    ? 'film'
                    : 'paper',
                  dilutions: sharedRecipeView.developer.dilutions.map((d) => ({
                    name: d.name,
                    dilution: d.dilution,
                  })),
                  notes: sharedRecipeView.developer.notes || '',
                  mixingInstructions:
                    sharedRecipeView.developer.mixingInstructions || '',
                  safetyNotes: sharedRecipeView.developer.safetyNotes || '',
                }
              : undefined,
          temperatureF: combination.temperatureF,
          timeMinutes: combination.timeMinutes,
          shootingIso: combination.shootingIso,
          pushPull: combination.pushPull || 0,
          agitationSchedule: combination.agitationSchedule || '',
          notes: combination.notes || 'Imported from shared custom recipe',
          customDilution: combination.customDilution || '',
          isPublic: false,
        };

        await addCustomRecipe(formData);
        await refreshCustomRecipes();
        showToast('Custom recipe added to your collection!', 'success');
      } else {
        // Handle regular API recipe - add to custom recipes
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
        showToast('Recipe added to your collection!', 'success');
      }

      setIsSharedRecipeModalOpen(false);
      setSharedRecipeView(null);
    } catch (error) {
      debugError('Failed to add shared recipe:', error);
      showToast('Failed to add recipe. Please try again.', 'error');
    } finally {
      setIsAddingSharedRecipe(false);
    }
  }, [
    sharedRecipeView,
    sharedRecipeSource,
    addCustomRecipe,
    refreshCustomRecipes,
    showToast,
  ]);

  const handleDeclineSharedRecipe = useCallback(() => {
    setIsSharedRecipeModalOpen(false);
    setSharedRecipeView(null);
  }, []);

  const handleCloseFilmdevPreview = useCallback(() => {
    setIsFilmdevPreviewOpen(false);
    setFilmdevPreviewData(null);
    setFilmdevPreviewRecipe(null);
    setIsImporting(false);
    setImportError(null);
  }, []);

  const handleConfirmFilmdevImport = useCallback(async () => {
    if (!filmdevPreviewData) return;

    setIsImporting(true);
    try {
      await addCustomRecipe(filmdevPreviewData.formData);
      await refreshCustomRecipes();
      setIsImportModalOpen(false);
      handleCloseFilmdevPreview();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Failed to import recipe'
      );
    } finally {
      setIsImporting(false);
    }
  }, [
    filmdevPreviewData,
    addCustomRecipe,
    refreshCustomRecipes,
    handleCloseFilmdevPreview,
  ]);

  const handleImportRecipe = useCallback(
    async (input: string) => {
      setImportError(null);
      setIsImporting(true);

      try {
        let formData: CustomRecipeFormData;

        // Check if input is a filmdev.org URL/ID
        if (isFilmdevInput(input)) {
          const recipeId = extractRecipeId(input);
          if (!recipeId) {
            setImportError(
              'Unable to extract recipe ID from filmdev.org URL. Please check the URL format.'
            );
            return;
          }

          // Fetch recipe from filmdev.org
          const filmdevRecipe = await fetchFilmdevRecipe(recipeId);

          // Map filmdev recipe to form data with film/developer matching
          const mappingResult = mapFilmdevRecipe(
            filmdevRecipe,
            allFilms || [],
            allDevelopers || []
          );

          // Add information about matches in notes
          let matchInfo = '';
          if (mappingResult.isFilmCustom && mappingResult.isDeveloperCustom) {
            matchInfo =
              '\n\nNote: Both film and developer were added as custom entries since no matches were found in our database.';
          } else if (mappingResult.isFilmCustom) {
            matchInfo =
              '\n\nNote: Film was added as a custom entry since no match was found in our database.';
          } else if (mappingResult.isDeveloperCustom) {
            matchInfo =
              '\n\nNote: Developer was added as a custom entry since no match was found in our database.';
          } else {
            matchInfo = '. Imported from FilmDev.org.';
          }

          mappingResult.formData.notes =
            (mappingResult.formData.notes || '') + matchInfo;

          // Create a preview recipe view for the modal
          const previewRecipe: DevelopmentCombinationView = {
            combination: {
              id: 0, // Temporary ID for preview
              uuid: 'preview',
              name: mappingResult.formData.name,
              filmStockId:
                mappingResult.formData.selectedFilmId || 'custom_film_temp',
              filmSlug: 'preview',
              developerId:
                mappingResult.formData.selectedDeveloperId || 'custom_dev_temp',
              developerSlug: 'preview',
              shootingIso: mappingResult.formData.shootingIso,
              dilutionId: null,
              customDilution: mappingResult.formData.customDilution,
              temperatureC: Math.round(
                ((mappingResult.formData.temperatureF - 32) * 5) / 9
              ),
              temperatureF: mappingResult.formData.temperatureF,
              timeMinutes: mappingResult.formData.timeMinutes,
              agitationMethod: 'Standard',
              agitationSchedule: mappingResult.formData.agitationSchedule,
              pushPull: mappingResult.formData.pushPull,
              tags: mappingResult.formData.tags || null,
              notes: mappingResult.formData.notes,
              infoSource: 'filmdev.org',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            film:
              mappingResult.matchedFilm ??
              (mappingResult.formData.customFilm
                ? {
                    id: 0,
                    uuid: 'custom_film_temp',
                    slug: 'custom-film',
                    brand: mappingResult.formData.customFilm.brand,
                    name: mappingResult.formData.customFilm.name,
                    colorType: mappingResult.formData.customFilm.colorType,
                    isoSpeed: mappingResult.formData.customFilm.isoSpeed,
                    grainStructure:
                      mappingResult.formData.customFilm.grainStructure || null,
                    description:
                      mappingResult.formData.customFilm.description || '',
                    manufacturerNotes: null,
                    reciprocityFailure: null,
                    discontinued: false,
                    staticImageUrl: null,
                    dateAdded: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : undefined),
            developer:
              mappingResult.matchedDeveloper ??
              (mappingResult.formData.customDeveloper
                ? {
                    id: 0,
                    uuid: 'custom_dev_temp',
                    slug: 'custom-developer',
                    name: mappingResult.formData.customDeveloper.name,
                    manufacturer:
                      mappingResult.formData.customDeveloper.manufacturer,
                    type: mappingResult.formData.customDeveloper.type,
                    description: '',
                    filmOrPaper:
                      mappingResult.formData.customDeveloper.filmOrPaper ===
                        'film' ||
                      mappingResult.formData.customDeveloper.filmOrPaper ===
                        'both',
                    dilutions:
                      mappingResult.formData.customDeveloper.dilutions.map(
                        (d, index) => ({
                          id: String(index),
                          name: d.name,
                          dilution: d.dilution,
                        })
                      ),
                    mixingInstructions:
                      mappingResult.formData.customDeveloper
                        .mixingInstructions || null,
                    storageRequirements: null,
                    safetyNotes:
                      mappingResult.formData.customDeveloper.safetyNotes ||
                      null,
                    notes: mappingResult.formData.customDeveloper.notes || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : undefined),
          };

          // Set preview data and open the preview modal
          setFilmdevPreviewData(mappingResult);
          setFilmdevPreviewRecipe(previewRecipe);
          setIsFilmdevPreviewOpen(true);
          setIsImporting(false);
          return; // Don't continue with the regular import flow
        } else {
          // Try to decode as shared recipe
          const imported = decodeSharedCustomRecipe(input);
          if (!imported || !imported.isValid) {
            setImportError(
              'Unable to decode this recipe. Please check if you have a valid filmdev.org URL (e.g., filmdev.org/recipe/123) or shared recipe code.'
            );
            return;
          }

          const importedRecipe = imported.recipe;

          formData = {
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
            useExistingDeveloper: !!getDeveloperById(
              importedRecipe.developerId
            ),
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
        }

        await addCustomRecipe(formData);
        await refreshCustomRecipes();
        setIsImportModalOpen(false);
      } catch (err) {
        if (err instanceof FilmdevApiError) {
          setImportError(err.message);
        } else {
          setImportError(
            err instanceof Error ? err.message : 'Failed to import recipe'
          );
        }
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
      allFilms,
      allDevelopers,
    ]
  );

  // Data loading is handled automatically by TanStack Query hooks
  // No manual loadData() call needed - it fetches on component mount

  const handleRefreshAll = useCallback(async () => {
    debugLog('🎯 handleRefreshAll() triggered from Refresh button');
    setIsRefreshingData(true);
    try {
      debugLog('Calling forceRefresh() and refreshCustomRecipes()...');
      await Promise.all([forceRefresh(), refreshCustomRecipes()]);
      debugLog('✅ All refreshes completed');
    } catch (error) {
      debugError('❌ handleRefreshAll error:', error);
    } finally {
      setIsRefreshingData(false);
    }
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
