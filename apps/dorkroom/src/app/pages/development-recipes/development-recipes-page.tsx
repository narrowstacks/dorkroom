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
  createCombinationFromCustomRecipe,
  type CustomRecipeFormData,
  isFilmdevInput,
  extractRecipeId,
  fetchFilmdevRecipe,
  mapFilmdevRecipe,
  FilmdevApiError,
} from '@dorkroom/logic';
import { useRecipeModals } from './hooks/useRecipeModals';
import {
  CUSTOM_RECIPE_FORM_DEFAULT,
  convertRecipeToFormData,
  getCombinationIdentifier,
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

  const handleOpenDetail = useCallback((view: DevelopmentCombinationView) => {
    setDetailView(view);
    setIsDetailOpen(true);
  }, []);

  // Helper function to execute sharing action and show appropriate toast
  const executeRecipeShare = useCallback(
    async (view: DevelopmentCombinationView, shareMethod: 'share' | 'copy') => {
      const combinationId = String(
        view.combination.uuid || view.combination.id
      );

      let result;
      if (view.source === 'custom') {
        const recipe = customRecipes.find((item) => item.id === combinationId);
        if (!recipe) {
          return;
        }

        result =
          shareMethod === 'share'
            ? await shareCustomRecipe({ recipe })
            : await copyCustomRecipeToClipboard({ recipe });
      } else {
        // Share or copy regular recipe
        const recipeOptions = {
          recipeId: combinationId,
          recipeName: view.combination.name,
          filmSlug: view.film?.slug,
          developerSlug: view.developer?.slug,
        };

        result =
          shareMethod === 'share'
            ? await shareRegularRecipe(recipeOptions)
            : await copyRegularRecipeToClipboard(recipeOptions);
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
      shareCustomRecipe,
      copyCustomRecipeToClipboard,
      shareRegularRecipe,
      copyRegularRecipeToClipboard,
      showToast,
    ]
  );

  const handleShareCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      await executeRecipeShare(view, 'share');
    },
    [executeRecipeShare]
  );

  const handleCopyCombination = useCallback(
    async (view: DevelopmentCombinationView) => {
      await executeRecipeShare(view, 'copy');
    },
    [executeRecipeShare]
  );

  const handleCustomRecipeSubmit = useCallback(
    async (data: CustomRecipeFormData) => {
      setIsSubmittingRecipe(true);
      try {
        if (editingRecipe) {
          // Update existing recipe
          const editingId = getCombinationIdentifier(editingRecipe.combination);
          const customRecipe = customRecipes.find((r) => r.id === editingId);
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
      const recipeId = getCombinationIdentifier(view.combination);
      const customRecipe = customRecipes.find((r) => r.id === recipeId);
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
        const recipeId = getCombinationIdentifier(view.combination);
        await deleteCustomRecipe(recipeId);
        await refreshCustomRecipes();

        // Close detail modal if it's showing the deleted recipe
        if (getCombinationIdentifier(detailView?.combination) === recipeId) {
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

        // Validate film data if it's a custom film
        if (
          isCustomFilm &&
          (!sharedRecipeView.film ||
            !sharedRecipeView.film.brand ||
            !sharedRecipeView.film.name ||
            typeof sharedRecipeView.film.isoSpeed !== 'number')
        ) {
          throw new Error(
            'Invalid film data in shared recipe. Missing required fields.'
          );
        }

        // Validate developer data if it's a custom developer
        if (
          isCustomDeveloper &&
          (!sharedRecipeView.developer ||
            !sharedRecipeView.developer.manufacturer ||
            !sharedRecipeView.developer.name ||
            !sharedRecipeView.developer.type ||
            !Array.isArray(sharedRecipeView.developer.dilutions))
        ) {
          throw new Error(
            'Invalid developer data in shared recipe. Missing required fields.'
          );
        }

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
                  colorType:
                    sharedRecipeView.film.colorType === 'color' ||
                    sharedRecipeView.film.colorType === 'slide'
                      ? sharedRecipeView.film.colorType
                      : 'bw',
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

      // Provide specific error message based on error type
      let errorMessage = 'Failed to add recipe. Please try again.';
      if (error instanceof Error) {
        // Extract meaningful error messages
        if (
          error.message.includes('duplicate') ||
          error.message.includes('already exists')
        ) {
          errorMessage = 'This recipe already exists in your collection.';
        } else if (
          error.message.includes('film') ||
          error.message.includes('Film')
        ) {
          errorMessage = 'Invalid film data. Please check the recipe details.';
        } else if (
          error.message.includes('developer') ||
          error.message.includes('Developer')
        ) {
          errorMessage =
            'Invalid developer data. Please check the recipe details.';
        } else if (
          error.message.includes('storage') ||
          error.message.includes('quota')
        ) {
          errorMessage =
            'Storage limit reached. Please delete some recipes to make room.';
        } else if (error.message) {
          // Use the error message if it's descriptive enough
          errorMessage =
            error.message.length > 10 && error.message.length < 100
              ? error.message
              : 'Failed to add recipe. Please try again.';
        }
      }

      showToast(errorMessage, 'error');
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
