import React, { useState, useMemo, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Box, Text, Button, ButtonText, VStack } from '@gluestack-ui/themed';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw } from 'lucide-react-native';

import { CalculatorLayout } from '@/components/ui/layout/CalculatorLayout';
import { FormSection } from '@/components/ui/forms/FormSection';
import {
  InfoSection,
  InfoText,
  InfoSubtitle,
  InfoList,
} from '@/components/ui/calculator/InfoSection';
import { SearchDropdown } from '@/components/ui/search';
import { PaginationControls } from '@/components/ui/pagination';

// Import new componentized parts
import { SearchSection } from '@/components/development-recipes/filters/SearchSection';
import { SelectedItemsDisplay } from '@/components/development-recipes/filters/SelectedItemsDisplay';
import { FiltersSection } from '@/components/development-recipes/filters/FiltersSection';
import { ResultsHeader } from '@/components/development-recipes/results/ResultsHeader';
import { ActionButtons } from '@/components/development-recipes/results/ActionButtons';
import { TableView } from '@/components/development-recipes/results/TableView';
import { CardsView } from '@/components/development-recipes/results/CardsView';
import { RecipeImportModal } from '@/components/development-recipes/modals/RecipeImportModal';
import { ApiRecipeModal } from '@/components/development-recipes/modals/ApiRecipeModal';
import { CustomRecipeModal } from '@/components/development-recipes/modals/CustomRecipeModal';
import { CustomRecipeFormModal } from '@/components/development-recipes/modals/CustomRecipeFormModal';
import { MobileSearchModals } from '@/components/development-recipes/modals/MobileSearchModals';
import {
  getCustomRecipeFilm,
  getCustomRecipeDeveloper,
} from '@/components/development-recipes/utils/RecipeHelpers';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useDevelopmentRecipes } from '@/hooks/useDevelopmentRecipes';
import { useRecipeUrlState } from '@/hooks/useRecipeUrlState';
import { useCustomRecipes } from '@/hooks/useCustomRecipes';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useDebounce } from '@/hooks/useDebounce';
import { usePagination } from '@/hooks/usePagination';
import type { Film, Developer, Combination } from '@/api/dorkroom/types';
import type { CustomRecipe } from '@/types/customRecipeTypes';
import { debugError } from '@/utils/debugLogger';

export default function DevelopmentRecipes() {
  // Get development recipes data (this loads the data and provides films/developers for URL parsing)
  const {
    // State
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

    // Actions
    setFilmSearch,
    setDeveloperSearch,
    setDeveloperTypeFilter,
    setDilutionFilter,
    setIsoFilter,
    handleSort,
    setSelectedFilm,
    setSelectedDeveloper,
    loadData,
    forceRefresh: forceRefreshData,
    clearFilters,
    getFilmById,
    getDeveloperById,
    getAvailableDilutions,
    getAvailableISOs,
  } = useDevelopmentRecipes();

  // Add debouncing to search inputs to prevent excessive filtering operations
  const debouncedFilmSearch = useDebounce(filmSearch, 300);
  const debouncedDeveloperSearch = useDebounce(developerSearch, 300);

  const { customRecipes, forceRefresh, addCustomRecipe } = useCustomRecipes();
  const { isRecipeImportEnabled } = useFeatureFlags();

  // Convert custom recipes to combination-like format for display
  const customRecipesAsCombinations = React.useMemo(() => {
    const combinations = customRecipes.map((recipe): Combination => {
      return {
        id: recipe.id,
        name: recipe.name,
        uuid: recipe.id,
        slug: recipe.id,
        filmStockId: recipe.filmId,
        developerId: recipe.developerId,
        temperatureF: recipe.temperatureF,
        timeMinutes: recipe.timeMinutes,
        shootingIso: recipe.shootingIso,
        pushPull: recipe.pushPull,
        agitationSchedule: recipe.agitationSchedule,
        notes: recipe.notes,
        customDilution: recipe.customDilution,
        dateAdded: recipe.dateCreated,
        // Custom recipe specific handling
        dilutionId: undefined,
      };
    });
    return combinations;
  }, [customRecipes]);

  // Create a recipe lookup map for shared recipe functionality
  const recipesByUuid = useMemo(() => {
    const map = new Map<string, Combination>();

    // Add API recipes
    filteredCombinations.forEach((recipe) => {
      if (recipe.uuid) {
        map.set(recipe.uuid, recipe);
      }
    });

    // Add custom recipes (they use id instead of uuid)
    customRecipesAsCombinations.forEach((recipe) => {
      if (recipe.id) {
        map.set(recipe.id, recipe);
      }
    });

    return map;
  }, [filteredCombinations, customRecipesAsCombinations]);

  // URL state management - syncs current filter state with URL parameters
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
    recipesByUuid // Recipe lookup map for shared recipe functionality
  );

  // URL state management for shared recipes

  // Apply URL state to hook state when data is loaded and URL state is available
  const urlStateAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (
      isLoaded &&
      hasUrlState &&
      initialUrlState.fromUrl &&
      !urlStateAppliedRef.current
    ) {
      if (
        initialUrlState.selectedFilm &&
        initialUrlState.selectedFilm !== selectedFilm
      ) {
        setSelectedFilm(initialUrlState.selectedFilm);
      }
      if (
        initialUrlState.selectedDeveloper &&
        initialUrlState.selectedDeveloper !== selectedDeveloper
      ) {
        setSelectedDeveloper(initialUrlState.selectedDeveloper);
      }
      if (
        initialUrlState.dilutionFilter &&
        initialUrlState.dilutionFilter !== dilutionFilter
      ) {
        setDilutionFilter(initialUrlState.dilutionFilter);
      }
      if (
        initialUrlState.isoFilter &&
        initialUrlState.isoFilter !== isoFilter
      ) {
        setIsoFilter(initialUrlState.isoFilter);
      }
      urlStateAppliedRef.current = true;
    }
  }, [
    isLoaded,
    hasUrlState,
    initialUrlState.fromUrl,
    initialUrlState.selectedFilm,
    initialUrlState.selectedDeveloper,
    initialUrlState.dilutionFilter,
    initialUrlState.isoFilter,
    selectedFilm,
    selectedDeveloper,
    dilutionFilter,
    isoFilter,
    setSelectedFilm,
    setSelectedDeveloper,
    setDilutionFilter,
    setIsoFilter,
  ]);

  // Handle shared recipe - automatically open the recipe detail when a shared recipe is loaded
  React.useEffect(() => {
    if (hasSharedRecipe && sharedRecipe && !isLoadingSharedRecipe) {
      // Check if it's a custom recipe or API recipe
      const isCustomRecipe = customRecipes.some(
        (recipe) => recipe.id === sharedRecipe.id
      );

      if (isCustomRecipe) {
        const customRecipe = customRecipes.find(
          (recipe) => recipe.id === sharedRecipe.id
        );
        if (customRecipe) {
          setSelectedCustomRecipe(customRecipe);
          setSelectedCombination(null);
        }
      } else {
        setSelectedCombination(sharedRecipe);
        setSelectedCustomRecipe(null);
      }
    }
  }, [
    hasSharedRecipe,
    sharedRecipe,
    isLoadingSharedRecipe,
    customRecipes,
    sharedRecipeError,
  ]);

  // Show error message if shared recipe fails to load
  React.useEffect(() => {
    if (sharedRecipeError) {
      // Handle shared recipe error (could show toast notification)
      console.warn('Shared recipe error:', sharedRecipeError);
    }
  }, [sharedRecipeError]);

  const [showFilters, setShowFilters] = useState(false);
  const [showCustomRecipeImportModal, setShowCustomRecipeImportModal] =
    useState(false);

  // Track if we've already shown the import modal for this shared recipe
  const sharedRecipeModalShownRef = useRef<string | null>(null);

  // Show import modal when a shared custom recipe is detected (only if import is enabled)
  React.useEffect(() => {
    if (
      hasSharedCustomRecipe &&
      sharedCustomRecipe &&
      !showCustomRecipeImportModal &&
      !isLoadingSharedRecipe &&
      isRecipeImportEnabled
    ) {
      // Create a unique identifier for this shared recipe
      const recipeKey = `${sharedCustomRecipe.name}_${sharedCustomRecipe.filmId}_${sharedCustomRecipe.developerId}_${sharedCustomRecipe.timeMinutes}`;

      // Only show modal if we haven't already shown it for this specific recipe
      if (sharedRecipeModalShownRef.current !== recipeKey) {
        setShowCustomRecipeImportModal(true);
        sharedRecipeModalShownRef.current = recipeKey;
      }
    }
  }, [
    hasSharedCustomRecipe,
    sharedCustomRecipe,
    showCustomRecipeImportModal,
    isLoadingSharedRecipe,
    isRecipeImportEnabled,
  ]);
  const [selectedCombination, setSelectedCombination] =
    useState<Combination | null>(null);
  const [selectedCustomRecipe, setSelectedCustomRecipe] =
    useState<CustomRecipe | null>(null);
  const [showCustomRecipeForm, setShowCustomRecipeForm] = useState(false);
  const [editingCustomRecipe, setEditingCustomRecipe] = useState<
    CustomRecipe | undefined
  >(undefined);
  const [showCustomRecipes, setShowCustomRecipes] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showMobileFilmModal, setShowMobileFilmModal] = useState(false);
  const [showMobileDeveloperModal, setShowMobileDeveloperModal] =
    useState(false);
  const [isFilmSearchFocused, setIsFilmSearchFocused] = useState(false);
  const [isDeveloperSearchFocused, setIsDeveloperSearchFocused] =
    useState(false);

  // Add refs and position state for dynamic positioning
  const filmSearchRef = React.useRef<any>(null);
  const developerSearchRef = React.useRef<any>(null);
  const [filmSearchPosition, setFilmSearchPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [developerSearchPosition, setDeveloperSearchPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const textColor = useThemeColor({}, 'text');
  const developmentTint = useThemeColor({}, 'developmentRecipesTint');

  // Combined API + custom recipes for display
  const allCombinations = React.useMemo(() => {
    if (!showCustomRecipes) {
      return filteredCombinations;
    }

    // Filter custom recipes based on current filters
    let filteredCustomCombinations = customRecipesAsCombinations.filter(
      (combination) => {
        const recipe = customRecipes.find((r) => r.id === combination.id);
        if (!recipe) return false;

        // Apply film filter
        if (selectedFilm) {
          if (recipe.isCustomFilm) {
            // For custom films, check if the name/brand matches the selected film
            return (
              recipe.customFilm?.brand
                ?.toLowerCase()
                .includes(selectedFilm.brand.toLowerCase()) ||
              recipe.customFilm?.name
                ?.toLowerCase()
                .includes(selectedFilm.name.toLowerCase())
            );
          } else {
            return combination.filmStockId === selectedFilm.uuid;
          }
        } else if (debouncedFilmSearch.trim()) {
          if (recipe.isCustomFilm && recipe.customFilm) {
            const filmMatch =
              recipe.customFilm.brand
                .toLowerCase()
                .includes(debouncedFilmSearch.toLowerCase()) ||
              recipe.customFilm.name
                .toLowerCase()
                .includes(debouncedFilmSearch.toLowerCase());
            return filmMatch;
          } else {
            const film = getFilmById(combination.filmStockId);
            return (
              film &&
              (film.name
                .toLowerCase()
                .includes(debouncedFilmSearch.toLowerCase()) ||
                film.brand
                  .toLowerCase()
                  .includes(debouncedFilmSearch.toLowerCase()))
            );
          }
        }

        // Apply developer filter
        if (selectedDeveloper) {
          if (recipe.isCustomDeveloper) {
            return (
              recipe.customDeveloper?.manufacturer
                ?.toLowerCase()
                .includes(selectedDeveloper.manufacturer.toLowerCase()) ||
              recipe.customDeveloper?.name
                ?.toLowerCase()
                .includes(selectedDeveloper.name.toLowerCase())
            );
          } else {
            return combination.developerId === selectedDeveloper.uuid;
          }
        } else if (debouncedDeveloperSearch.trim()) {
          if (recipe.isCustomDeveloper && recipe.customDeveloper) {
            const devMatch =
              recipe.customDeveloper.manufacturer
                .toLowerCase()
                .includes(debouncedDeveloperSearch.toLowerCase()) ||
              recipe.customDeveloper.name
                .toLowerCase()
                .includes(debouncedDeveloperSearch.toLowerCase());
            return devMatch;
          } else {
            const dev = getDeveloperById(combination.developerId);
            return (
              dev &&
              (dev.name
                .toLowerCase()
                .includes(debouncedDeveloperSearch.toLowerCase()) ||
                dev.manufacturer
                  .toLowerCase()
                  .includes(debouncedDeveloperSearch.toLowerCase()))
            );
          }
        }

        // If no specific filters applied, include all custom recipes
        return true;
      }
    );

    // Sort custom recipes by creation date (newest first) to show recently added ones at the top
    filteredCustomCombinations.sort((a, b) => {
      const recipeA = customRecipes.find((r) => r.id === a.id);
      const recipeB = customRecipes.find((r) => r.id === b.id);
      if (!recipeA || !recipeB) return 0;
      return (
        new Date(recipeB.dateCreated).getTime() -
        new Date(recipeA.dateCreated).getTime()
      );
    });

    // Combine custom recipes (newest first) with API recipes
    const combined = [...filteredCustomCombinations, ...filteredCombinations];
    return combined;
  }, [
    filteredCombinations,
    customRecipesAsCombinations,
    showCustomRecipes,
    selectedFilm,
    selectedDeveloper,
    debouncedFilmSearch,
    debouncedDeveloperSearch,
    getFilmById,
    getDeveloperById,
    customRecipes,
  ]);

  // Pagination logic
  const {
    paginatedItems: paginatedCombinations,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNext,
    hasPrevious,
    goToPage,
    goToNext,
    goToPrevious,
    resetToFirstPage,
  } = usePagination(allCombinations, 50);

  // Custom recipe helpers using imported utilities
  const getCustomRecipeFilmHelper = (recipeId: string): Film | undefined => {
    return getCustomRecipeFilm(recipeId, customRecipes, getFilmById);
  };

  const getCustomRecipeDeveloperHelper = (
    recipeId: string
  ): Developer | undefined => {
    return getCustomRecipeDeveloper(recipeId, customRecipes, getDeveloperById);
  };

  // Get current version of selected custom recipe (to handle updates)
  const currentSelectedCustomRecipe = React.useMemo(() => {
    if (!selectedCustomRecipe) return null;
    // Find the current version from the customRecipes array
    const currentVersion = customRecipes.find(
      (r) => r.id === selectedCustomRecipe.id
    );
    return currentVersion || selectedCustomRecipe; // Fallback to original if not found
  }, [selectedCustomRecipe, customRecipes]);

  const handleCustomRecipePress = (recipe: CustomRecipe) => {
    setSelectedCustomRecipe(recipe);
    setSelectedCombination(null); // Clear API recipe selection
  };

  const handleEditCustomRecipe = (recipe: CustomRecipe) => {
    setEditingCustomRecipe(recipe);
    setShowCustomRecipeForm(true);
  };

  const handleNewCustomRecipe = () => {
    setEditingCustomRecipe(undefined);
    setShowCustomRecipeForm(true);
  };

  const handleImportCustomRecipe = async () => {
    if (!sharedCustomRecipe || !isRecipeImportEnabled) return;

    try {
      // Importing custom recipe

      // Convert the shared custom recipe to the format expected by addCustomRecipe
      const formData = {
        name: sharedCustomRecipe.name,
        useExistingFilm: !sharedCustomRecipe.isCustomFilm,
        selectedFilmId: sharedCustomRecipe.isCustomFilm
          ? undefined
          : sharedCustomRecipe.filmId,
        useExistingDeveloper: !sharedCustomRecipe.isCustomDeveloper,
        selectedDeveloperId: sharedCustomRecipe.isCustomDeveloper
          ? undefined
          : sharedCustomRecipe.developerId,
        temperatureF: sharedCustomRecipe.temperatureF,
        timeMinutes: sharedCustomRecipe.timeMinutes,
        shootingIso: sharedCustomRecipe.shootingIso,
        pushPull: sharedCustomRecipe.pushPull,
        agitationSchedule: sharedCustomRecipe.agitationSchedule || '',
        notes: sharedCustomRecipe.notes || '',
        customDilution: sharedCustomRecipe.customDilution || '',
        customFilm: sharedCustomRecipe.customFilm,
        customDeveloper: sharedCustomRecipe.customDeveloper,
        isPublic: sharedCustomRecipe.isPublic,
      };

      await addCustomRecipe(formData);
      // Successfully imported custom recipe

      // Close the import modal
      setShowCustomRecipeImportModal(false);

      // Clear the URL parameters to prevent the modal from showing again
      router.setParams({ recipe: undefined, source: undefined });

      // Show success message
      // You could add a toast notification here if desired
    } catch (error) {
      debugError('Failed to import custom recipe:', error);
      // You could show an error toast here if desired
    }
  };

  const handleCancelImportCustomRecipe = () => {
    // Close the import modal
    setShowCustomRecipeImportModal(false);

    // Clear the URL parameters to prevent the modal from showing again
    router.setParams({ recipe: undefined, source: undefined });
  };

  const handleForceRefresh = async () => {
    // Handle force refresh
    try {
      await forceRefreshData();
      // Force refresh completed
    } catch (error) {
      debugError('Force refresh failed:', error);
    }
  };

  const handleCustomRecipeFormClose = () => {
    // Handle custom recipe form close

    // Force refresh to ensure any recipe deletions are reflected in the UI
    forceRefresh();

    // Clear any selected custom recipe if it might have been deleted
    setSelectedCustomRecipe(null);

    setShowCustomRecipeForm(false);
    setEditingCustomRecipe(undefined);
  };

  const handleCustomRecipeDelete = () => {
    // Handle custom recipe delete

    // Force refresh to ensure the deletion is reflected in the UI
    forceRefresh();

    // Clear the selected custom recipe since it was deleted
    setSelectedCustomRecipe(null);
  };

  const handleCustomRecipeSave = async (recipeId: string) => {
    // Force immediate refresh to ensure updated data is displayed
    // This is critical for both saves AND deletes
    await forceRefresh();

    // Check if the recipe still exists (it won't if it was deleted)
    const recipeStillExists = customRecipes.some((r) => r.id === recipeId);

    // If recipe was deleted, clear any selections that might reference it
    if (!recipeStillExists) {
      setSelectedCustomRecipe(null);
    }

    // Close the form modal
    setShowCustomRecipeForm(false);
    setEditingCustomRecipe(undefined);
  };

  // Handle duplicating a recipe (either API or custom)
  const handleDuplicateRecipe = (
    combination: Combination,
    isCustom: boolean = false
  ) => {
    const customRecipe = isCustom
      ? customRecipes.find((r) => r.id === combination.id)
      : undefined;
    const film =
      isCustom && customRecipe
        ? getCustomRecipeFilm(customRecipe.id, customRecipes, getFilmById)
        : getFilmById(combination.filmStockId);

    // Create a new custom recipe based on the existing one
    const duplicateRecipe: CustomRecipe = {
      id: `duplicate_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`,
      name: `Copy of ${
        combination.name || (film ? `${film.brand} ${film.name}` : 'Unknown')
      }`,
      filmId:
        isCustom && customRecipe?.isCustomFilm
          ? customRecipe.filmId
          : combination.filmStockId,
      developerId:
        isCustom && customRecipe?.isCustomDeveloper
          ? customRecipe.developerId
          : combination.developerId,
      temperatureF: combination.temperatureF,
      timeMinutes: combination.timeMinutes,
      shootingIso: combination.shootingIso,
      pushPull: combination.pushPull,
      agitationSchedule: combination.agitationSchedule,
      notes: combination.notes,
      customDilution: combination.customDilution || undefined,
      isCustomFilm:
        isCustom && customRecipe ? customRecipe.isCustomFilm : false,
      isCustomDeveloper:
        isCustom && customRecipe ? customRecipe.isCustomDeveloper : false,
      customFilm:
        isCustom && customRecipe ? customRecipe.customFilm : undefined,
      customDeveloper:
        isCustom && customRecipe ? customRecipe.customDeveloper : undefined,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      isPublic: false,
    };

    // Set up editing the duplicated recipe
    setEditingCustomRecipe(duplicateRecipe);
    setShowCustomRecipeForm(true);

    // Close any open recipe details
    setSelectedCombination(null);
    setSelectedCustomRecipe(null);
  };

  // Film and developer lists for desktop search dropdown (debounced + lazy-loaded for performance)
  const filteredFilms = React.useMemo(() => {
    if (!isFilmSearchFocused) return [];

    let filtered = allFilms;
    if (debouncedFilmSearch.trim()) {
      filtered = allFilms.filter(
        (film) =>
          film.name.toLowerCase().includes(debouncedFilmSearch.toLowerCase()) ||
          film.brand.toLowerCase().includes(debouncedFilmSearch.toLowerCase())
      );
    }

    // Limit initial results for better performance - show top 50 results
    return filtered.slice(0, 50);
  }, [allFilms, debouncedFilmSearch, isFilmSearchFocused]);

  const filteredDevelopers = React.useMemo(() => {
    if (!isDeveloperSearchFocused) return [];

    let filtered = allDevelopers;
    if (debouncedDeveloperSearch.trim()) {
      filtered = allDevelopers.filter(
        (dev) =>
          dev.name
            .toLowerCase()
            .includes(debouncedDeveloperSearch.toLowerCase()) ||
          dev.manufacturer
            .toLowerCase()
            .includes(debouncedDeveloperSearch.toLowerCase())
      );
    }

    // Limit initial results for better performance - show top 50 results
    return filtered.slice(0, 50);
  }, [allDevelopers, debouncedDeveloperSearch, isDeveloperSearchFocused]);

  // Convert to SearchDropdownItem format
  const filmDropdownItems = React.useMemo(
    () =>
      filteredFilms.map((film) => ({
        id: film.uuid,
        title: film.name,
        subtitle: film.brand,
      })),
    [filteredFilms]
  );

  const developerDropdownItems = React.useMemo(
    () =>
      filteredDevelopers.map((developer) => ({
        id: developer.uuid,
        title: developer.name,
        subtitle: developer.manufacturer,
      })),
    [filteredDevelopers]
  );

  // Handle dropdown item selection
  const handleFilmDropdownSelect = (item: {
    id: string;
    title: string;
    subtitle: string;
  }) => {
    const film = allFilms.find((f) => f.uuid === item.id);
    if (film) {
      setSelectedFilm(film);
      setFilmSearch('');
      setIsFilmSearchFocused(false);
    }
  };

  const handleDeveloperDropdownSelect = (item: {
    id: string;
    title: string;
    subtitle: string;
  }) => {
    const developer = allDevelopers.find((d) => d.uuid === item.id);
    if (developer) {
      setSelectedDeveloper(developer);
      setDeveloperSearch('');
      setIsDeveloperSearchFocused(false);
    }
  };

  // Add layout handlers for dynamic positioning
  const handleFilmSearchLayout = () => {
    if (filmSearchRef.current && isDesktop) {
      filmSearchRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number
        ) => {
          setFilmSearchPosition({
            top: pageY + height,
            left: pageX,
            width: width,
          });
        }
      );
    }
  };

  const handleDeveloperSearchLayout = () => {
    if (developerSearchRef.current && isDesktop) {
      developerSearchRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number
        ) => {
          setDeveloperSearchPosition({
            top: pageY + height,
            left: pageX,
            width: width,
          });
        }
      );
    }
  };

  const infoSection = (
    <InfoSection title="About Development Recipes">
      <InfoText>
        Browse and search through a comprehensive database of film development
        combinations. Find the optimal development parameters for your film and
        developer combinations.
      </InfoText>

      <InfoSubtitle>How to Use:</InfoSubtitle>
      <InfoList
        items={[
          'Search for films by name or brand',
          'Search for developers by manufacturer or name',
          'Use filters to narrow by film type or developer type',
          'Sort results by film name, developer, time, temperature, or ISO',
          'View detailed development parameters for each combination',
        ]}
      />

      <InfoSubtitle>Development Parameters:</InfoSubtitle>
      <InfoText>
        Each combination shows development time, temperature (in both Fahrenheit
        and Celsius), recommended shooting ISO, dilution ratio, and any
        push/pull processing notes.
      </InfoText>

      <InfoSubtitle>Tips:</InfoSubtitle>
      <InfoList
        items={[
          'Temperature is critical - maintain consistency within ±0.5°F',
          'Agitation schedule affects contrast and grain structure',
          'Push/pull processing changes both time and development characteristics',
          'Always refer to manufacturer data sheets for safety information',
        ]}
      />
    </InfoSection>
  );

  if (error) {
    return (
      <CalculatorLayout title="Development Recipes" infoSection={infoSection}>
        <Box style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>
            Error loading development data: {error}
          </Text>
          <Button onPress={loadData} style={styles.retryButton}>
            <RefreshCw size={16} color="#fff" />
            <ButtonText style={styles.retryButtonText}>Retry</ButtonText>
          </Button>
        </Box>
      </CalculatorLayout>
    );
  }

  if (isLoading || !isLoaded) {
    return (
      <CalculatorLayout title="Development Recipes" infoSection={infoSection}>
        <Box style={styles.loadingContainer}>
          <Spinner
            size="large"
            color={developmentTint}
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.loadingText, { color: textColor }]}>
            Loading development data...
          </Text>
        </Box>
      </CalculatorLayout>
    );
  }

  return (
    <CalculatorLayout title="Development Recipes" infoSection={infoSection}>
      <Box style={styles.mainContainer}>
        {/* Search, Filters, and Results */}
        <Box style={styles.leftPanel}>
          {/* Search and Filter Section */}
          <FormSection>
            <VStack space="md" style={{ overflow: 'visible' }}>
              {/* Search/Selection Fields */}
              <SearchSection
                filmSearch={filmSearch}
                developerSearch={developerSearch}
                selectedFilm={selectedFilm}
                selectedDeveloper={selectedDeveloper}
                onFilmSearchChange={setFilmSearch}
                onDeveloperSearchChange={setDeveloperSearch}
                onFilmClear={() => setFilmSearch('')}
                onDeveloperClear={() => setDeveloperSearch('')}
                onFilmFocus={() => {
                  setIsFilmSearchFocused(true);
                  handleFilmSearchLayout();
                }}
                onFilmBlur={() => {
                  setTimeout(() => setIsFilmSearchFocused(false), 150);
                }}
                onDeveloperFocus={() => {
                  setIsDeveloperSearchFocused(true);
                  handleDeveloperSearchLayout();
                }}
                onDeveloperBlur={() => {
                  setTimeout(() => setIsDeveloperSearchFocused(false), 150);
                }}
                onShowMobileFilmModal={() => setShowMobileFilmModal(true)}
                onShowMobileDeveloperModal={() =>
                  setShowMobileDeveloperModal(true)
                }
                filmSearchRef={filmSearchRef}
                developerSearchRef={developerSearchRef}
                onFilmSearchLayout={handleFilmSearchLayout}
                onDeveloperSearchLayout={handleDeveloperSearchLayout}
              />

              {/* Selected Items Display - Desktop only */}
              {isDesktop && (selectedFilm || selectedDeveloper) && (
                <SelectedItemsDisplay
                  selectedFilm={selectedFilm}
                  selectedDeveloper={selectedDeveloper}
                  onClearAll={clearFilters}
                  onClearFilm={() => setSelectedFilm(null)}
                  onClearDeveloper={() => setSelectedDeveloper(null)}
                />
              )}

              {/* Filters */}
              <FiltersSection
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
                selectedFilm={selectedFilm}
                selectedDeveloper={selectedDeveloper}
                developerTypeFilter={developerTypeFilter}
                dilutionFilter={dilutionFilter}
                isoFilter={isoFilter}
                onDeveloperTypeFilterChange={setDeveloperTypeFilter}
                onDilutionFilterChange={setDilutionFilter}
                onIsoFilterChange={setIsoFilter}
                getAvailableDilutions={getAvailableDilutions}
                getAvailableISOs={getAvailableISOs}
              />
            </VStack>
          </FormSection>

          {/* Results Section */}
          <Box style={styles.resultsSection}>
            {/* Results Header */}
            <ResultsHeader
              totalItems={totalItems}
              currentPage={currentPage}
              totalPages={totalPages}
              customRecipesCount={customRecipes.length}
              showCustomRecipes={showCustomRecipes}
            />

            {/* Action Buttons */}
            <ActionButtons
              isLoading={isLoading}
              customRecipesCount={customRecipes.length}
              showCustomRecipes={showCustomRecipes}
              viewMode={viewMode}
              onRefresh={handleForceRefresh}
              onToggleCustomRecipes={() =>
                setShowCustomRecipes(!showCustomRecipes)
              }
              onNewCustomRecipe={handleNewCustomRecipe}
              onToggleViewMode={() =>
                setViewMode(viewMode === 'cards' ? 'table' : 'cards')
              }
            />

            {allCombinations.length === 0 ? (
              <Box style={styles.noResultsContainer}>
                <Text style={[styles.noResultsText, { color: textColor }]}>
                  No development recipes found.
                </Text>
                <Text style={[styles.noResultsSubtext, { color: textColor }]}>
                  Try adjusting your search terms or filters, or create your own
                  recipe.
                </Text>
              </Box>
            ) : (
              // Cards or Table View
              <>
                {/* Pagination Controls - Top */}
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  goToPage={goToPage}
                  goToNext={goToNext}
                  goToPrevious={goToPrevious}
                  resetToFirstPage={resetToFirstPage}
                />

                {isDesktop && viewMode === 'table' ? (
                  <TableView
                    paginatedCombinations={paginatedCombinations}
                    customRecipes={customRecipes}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    onRowPress={(combination, isCustom) => {
                      if (isCustom) {
                        const customRecipe = customRecipes.find(
                          (r) => r.id === combination.id
                        );
                        if (customRecipe) {
                          handleCustomRecipePress(customRecipe);
                        }
                      } else {
                        setSelectedCombination(combination);
                      }
                    }}
                    getFilmById={getFilmById}
                    getDeveloperById={getDeveloperById}
                    getCustomRecipeFilm={getCustomRecipeFilmHelper}
                    getCustomRecipeDeveloper={getCustomRecipeDeveloperHelper}
                  />
                ) : (
                  <CardsView
                    paginatedCombinations={paginatedCombinations}
                    customRecipes={customRecipes}
                    onCardPress={(combination, isCustom) => {
                      if (isCustom) {
                        const customRecipe = customRecipes.find(
                          (r) => r.id === combination.id
                        );
                        if (customRecipe) {
                          handleCustomRecipePress(customRecipe);
                        }
                      } else {
                        setSelectedCombination(combination);
                      }
                    }}
                    getFilmById={getFilmById}
                    getDeveloperById={getDeveloperById}
                    getCustomRecipeFilm={getCustomRecipeFilmHelper}
                    getCustomRecipeDeveloper={getCustomRecipeDeveloperHelper}
                  />
                )}

                {/* Pagination Controls - Bottom */}
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  goToPage={goToPage}
                  goToNext={goToNext}
                  goToPrevious={goToPrevious}
                  resetToFirstPage={resetToFirstPage}
                />
              </>
            )}
          </Box>
        </Box>

        {/* API Recipe Detail Modal */}
        <ApiRecipeModal
          isOpen={selectedCombination !== null}
          onClose={() => setSelectedCombination(null)}
          selectedCombination={selectedCombination}
          onDuplicate={(combination) =>
            handleDuplicateRecipe(combination, false)
          }
          getFilmById={getFilmById}
          getDeveloperById={getDeveloperById}
          isDesktop={isDesktop}
        />

        {/* Custom Recipe Detail Modal */}
        <CustomRecipeModal
          isOpen={selectedCustomRecipe !== null}
          onClose={() => setSelectedCustomRecipe(null)}
          currentSelectedCustomRecipe={currentSelectedCustomRecipe}
          onEdit={handleEditCustomRecipe}
          onDuplicate={(combination) =>
            handleDuplicateRecipe(combination, true)
          }
          onDelete={handleCustomRecipeDelete}
          getCustomRecipeFilm={getCustomRecipeFilmHelper}
          getCustomRecipeDeveloper={getCustomRecipeDeveloperHelper}
          isDesktop={isDesktop}
        />

        {/* Custom Recipe Form Modal */}
        <CustomRecipeFormModal
          isOpen={showCustomRecipeForm}
          onClose={handleCustomRecipeFormClose}
          editingCustomRecipe={editingCustomRecipe}
          onSave={handleCustomRecipeSave}
          isDesktop={isDesktop}
        />

        {/* Custom Recipe Import Modal */}
        <RecipeImportModal
          isOpen={showCustomRecipeImportModal}
          onClose={handleCancelImportCustomRecipe}
          onImport={handleImportCustomRecipe}
          sharedCustomRecipe={sharedCustomRecipe}
          getFilmById={getFilmById}
          getDeveloperById={getDeveloperById}
        />

        {/* Film Search Dropdown - Desktop only */}
        {isDesktop && (
          <SearchDropdown
            variant="desktop"
            isOpen={isFilmSearchFocused}
            onClose={() => setIsFilmSearchFocused(false)}
            items={filmDropdownItems}
            onItemSelect={handleFilmDropdownSelect}
            position="left"
            dynamicPosition={filmSearchPosition}
          />
        )}

        {/* Developer Search Dropdown - Desktop only */}
        {isDesktop && (
          <SearchDropdown
            variant="desktop"
            isOpen={isDeveloperSearchFocused}
            onClose={() => setIsDeveloperSearchFocused(false)}
            items={developerDropdownItems}
            onItemSelect={handleDeveloperDropdownSelect}
            position="right"
            dynamicPosition={developerSearchPosition}
          />
        )}

        {/* Mobile Selection Modals */}
        {!isDesktop && (
          <MobileSearchModals
            showFilmModal={showMobileFilmModal}
            showDeveloperModal={showMobileDeveloperModal}
            onCloseFilmModal={() => setShowMobileFilmModal(false)}
            onCloseDeveloperModal={() => setShowMobileDeveloperModal(false)}
            allFilms={allFilms}
            allDevelopers={allDevelopers}
            onFilmSelect={setSelectedFilm}
            onDeveloperSelect={setSelectedDeveloper}
          />
        )}
      </Box>
    </CalculatorLayout>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    width: '100%',
    overflow: 'visible',
  },
  leftPanel: {
    flex: 1,
    overflow: 'visible',
  },
  resultsSection: {
    flex: 1,
    marginTop: 16,
    position: 'relative',
  },
  // Loading and Error Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
