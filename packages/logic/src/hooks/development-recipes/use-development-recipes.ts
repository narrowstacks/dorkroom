import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type Film,
  type Developer,
  type Combination,
  type Dilution,
} from '@dorkroom/api';
import { useFilms } from '../api/use-films';
import { useDevelopers } from '../api/use-developers';
import { useCombinations } from '../api/use-combinations';
import { queryKeys } from '../../queries/query-keys';
import { debugError } from '../../utils/debug-logger';
import type { InitialUrlState } from '../../types/development-recipes-url';

export type CustomRecipeFilter = 'all' | 'hide-custom' | 'only-custom';

export interface DevelopmentRecipesState {
  developerTypeFilter: string;
  dilutionFilter: string;
  isoFilter: string;
  customRecipeFilter: CustomRecipeFilter;
  tagFilter: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  selectedFilm: Film | null;
  selectedDeveloper: Developer | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  allFilms: Film[];
  allDevelopers: Developer[];
  filteredCombinations: Combination[];
}

export interface DevelopmentRecipesActions {
  setDeveloperTypeFilter: (filter: string) => void;
  setDilutionFilter: (filter: string) => void;
  setIsoFilter: (filter: string) => void;
  setCustomRecipeFilter: (filter: CustomRecipeFilter) => void;
  setTagFilter: (filter: string) => void;
  setSortBy: (sort: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  handleSort: (sortKey: string) => void;
  setSelectedFilm: (film: Film | null) => void;
  setSelectedDeveloper: (developer: Developer | null) => void;
  forceRefresh: () => Promise<void>;
  clearFilters: () => void;
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
  getCombinationsForFilm: (filmId: string) => Combination[];
  getCombinationsForDeveloper: (developerId: string) => Combination[];
  getAvailableDilutions: () => { label: string; value: string }[];
  getAvailableISOs: () => { label: string; value: string }[];
  getAvailableTags: () => { label: string; value: string }[];
}

/**
 * Main hook for managing film development recipes data and state.
 * Uses TanStack Query for API data management and provides comprehensive
 * functionality for filtering, sorting, and managing film development combinations.
 *
 * @param initialUrlState - Optional initial state from URL parameters
 * @returns Complete development recipes state and action functions
 *
 * @example
 * ```typescript
 * const {
 *   isLoading,
 *   allFilms,
 *   allDevelopers,
 *   filteredCombinations,
 *   setSelectedFilm,
 *   setSelectedDeveloper,
 *   setDilutionFilter,
 *   clearFilters
 * } = useDevelopmentRecipes();
 *
 * // Select a film to see its development options
 * setSelectedFilm(films[0]);
 *
 * // Filter by dilution
 * setDilutionFilter('1+1');
 * ```
 */
export const useDevelopmentRecipes = (
  initialUrlState?: InitialUrlState
): DevelopmentRecipesState & DevelopmentRecipesActions => {
  // Fetch API data using TanStack Query
  const filmsQuery = useFilms();
  const developersQuery = useDevelopers();
  const combinationsQuery = useCombinations();
  const queryClient = useQueryClient();

  // Filter and sort API data
  const allFilms = useMemo(() => {
    if (!filmsQuery.data) return [];

    // Filter for black & white films only
    const films = filmsQuery.data.filter((film: Film) => {
      if (!film.colorType) return false;
      const ct = film.colorType.toLowerCase();
      return ct === 'bw' || ct === 'b&w' || ct === 'b & w';
    });

    // Sort by brand and name
    return films.slice().sort(
      (a: Film, b: Film) =>
        a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)
    );
  }, [filmsQuery.data]);

  const allDevelopers = useMemo(() => {
    if (!developersQuery.data) return [];

    // Filter for film developers only (filmOrPaper: true = film, false = paper)
    const developers = developersQuery.data.filter(
      (developer: Developer) => developer.filmOrPaper === true
    );

    // Sort by manufacturer and name
    return developers.slice().sort(
      (a: Developer, b: Developer) =>
        a.manufacturer.localeCompare(b.manufacturer) ||
        a.name.localeCompare(b.name)
    );
  }, [developersQuery.data]);

  const allCombinations = combinationsQuery.data || [];

  // UI state
  const [developerTypeFilter, setDeveloperTypeFilter] = useState('');
  const [dilutionFilter, setDilutionFilter] = useState(
    initialUrlState?.dilutionFilter || ''
  );
  const [isoFilter, setIsoFilter] = useState(initialUrlState?.isoFilter || '');
  const [customRecipeFilter, setCustomRecipeFilter] =
    useState<CustomRecipeFilter>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState('filmName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [selectedFilm, setSelectedFilmState] = useState<Film | null>(
    (initialUrlState?.selectedFilm as Film | undefined) || null
  );
  const [selectedDeveloper, setSelectedDeveloperState] =
    useState<Developer | null>(
      (initialUrlState?.selectedDeveloper as Developer | undefined) || null
    );

  const setSelectedFilm = useCallback((film: Film | null) => {
    setSelectedFilmState(film);
    setIsoFilter('');
  }, []);

  const setSelectedDeveloper = useCallback((developer: Developer | null) => {
    setSelectedDeveloperState(developer);
    setDilutionFilter('');
  }, []);

  // Combined loading and error states
  const isLoading = filmsQuery.isPending ||
    developersQuery.isPending ||
    combinationsQuery.isPending;
  const isLoaded = filmsQuery.isSuccess &&
    developersQuery.isSuccess &&
    combinationsQuery.isSuccess;
  const error = filmsQuery.error?.message ||
    developersQuery.error?.message ||
    combinationsQuery.error?.message ||
    null;

  // Force refresh via TanStack Query refetch
  const forceRefresh = useCallback(async () => {
    console.log('🔄 forceRefresh() called');
    console.log('Query keys to refetch:', {
      films: queryKeys.films.list(),
      developers: queryKeys.developers.list(),
      combinations: queryKeys.combinations.list(),
    });
    try {
      // Refetch all queries to ensure fresh data
      // Use exact query keys from queryKeys factory to match the queries created by the hooks
      console.log('Starting refetch for all queries...');
      const results = await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.films.list() }),
        queryClient.refetchQueries({ queryKey: queryKeys.developers.list() }),
        queryClient.refetchQueries({ queryKey: queryKeys.combinations.list() }),
      ]);
      console.log('✅ Refetch completed successfully', results);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to refresh development data';
      console.error('❌ Refetch failed:', errorMessage, err);
      debugError('Failed to refresh development recipes data:', err);
      throw errorMessage;
    }
  }, [queryClient]);

  const getFilmById = useCallback(
    (id?: string | null): Film | undefined => {
      if (!id) return undefined;
      const key = String(id);
      return allFilms.find(
        (film) =>
          film.id.toString() === key || film.uuid === key || film.slug === key
      );
    },
    [allFilms]
  );

  const getDeveloperById = useCallback(
    (id?: string | null): Developer | undefined => {
      if (!id) return undefined;
      const key = String(id);
      return allDevelopers.find(
        (dev) =>
          dev.id.toString() === key || dev.uuid === key || dev.slug === key
      );
    },
    [allDevelopers]
  );

  const getCombinationsForFilm = useCallback(
    (filmId: string): Combination[] => {
      return allCombinations.filter(
        (combo) => combo.filmStockId === filmId || combo.filmSlug === filmId
      );
    },
    [allCombinations]
  );

  const getCombinationsForDeveloper = useCallback(
    (developerId: string): Combination[] => {
      return allCombinations.filter(
        (combo) =>
          combo.developerId === developerId ||
          combo.developerSlug === developerId
      );
    },
    [allCombinations]
  );

  const getAvailableDilutions = useCallback((): {
    label: string;
    value: string;
  }[] => {
    if (!selectedDeveloper) return [];

    const dilutions = [{ label: 'All Dilutions', value: '' }];
    const dilutionSet = new Set<string>();

    const combinations = allCombinations.filter(
      (combo) =>
        combo.developerId === selectedDeveloper.uuid ||
        combo.developerSlug === selectedDeveloper.slug
    );

    combinations.forEach((combo) => {
      // Handle null/undefined dilutionId by using null-safe lookup
      const foundDilution = combo.dilutionId
        ? selectedDeveloper.dilutions?.find((d: Dilution) => d.id === combo.dilutionId)
        : null;

      // Priority: customDilution > developer dilution lookup > fallback to 'Stock'
      const dilutionInfo =
        combo.customDilution?.trim() ||
        foundDilution?.dilution?.trim() ||
        'Stock';

      if (dilutionInfo) {
        dilutionSet.add(dilutionInfo);
      }
    });

    const sortedDilutions = Array.from(dilutionSet).sort();

    // Summary log for easy debugging
    if (sortedDilutions.length > 1) {
      // More than just "Stock"
      console.log(
        `✅ Successfully found ${sortedDilutions.length} dilutions for ${
          selectedDeveloper.name
        }: ${sortedDilutions.join(', ')}`
      );
    } else {
      console.warn(
        `⚠️ Only found ${sortedDilutions.length} dilution(s) for ${selectedDeveloper.name}. Check if developer has dilution data or combinations.`
      );
    }

    sortedDilutions.forEach((dilution) => {
      dilutions.push({ label: dilution, value: dilution });
    });

    return dilutions;
  }, [selectedDeveloper, allCombinations]);

  const getAvailableISOs = useCallback((): {
    label: string;
    value: string;
  }[] => {
    if (!selectedFilm) return [];

    const isos = [{ label: 'All ISOs', value: '' }];
    const isoSet = new Set<number>();

    const combinations = allCombinations.filter(
      (combo) =>
        combo.filmStockId === selectedFilm.uuid ||
        combo.filmSlug === selectedFilm.slug
    );

    combinations.forEach((combo) => {
      isoSet.add(combo.shootingIso);
    });

    Array.from(isoSet)
      .sort((a, b) => a - b)
      .forEach((iso) => {
        isos.push({ label: iso.toString(), value: iso.toString() });
      });

    return isos;
  }, [selectedFilm, allCombinations]);

  const getAvailableTags = useCallback((): {
    label: string;
    value: string;
  }[] => {
    const tags = [{ label: 'All tags', value: '' }];
    const tagSet = new Set<string>();

    // Collect tags from all combinations
    allCombinations.forEach((combo) => {
      if (combo.tags && combo.tags.length > 0) {
        combo.tags.forEach((tag: string) => {
          tagSet.add(tag);
        });
      }
    });

    // Add 'custom' tag for custom recipes
    tagSet.add('custom');

    Array.from(tagSet)
      .sort()
      .forEach((tag) => {
        tags.push({ label: tag, value: tag });
      });

    return tags;
  }, [allCombinations]);

  const handleSort = useCallback(
    (sortKey: string) => {
      if (sortBy === sortKey) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(sortKey);
        setSortDirection('asc');
      }
    },
    [sortBy, sortDirection]
  );

  const clearFilters = useCallback(() => {
    setDeveloperTypeFilter('');
    setDilutionFilter('');
    setIsoFilter('');
    setCustomRecipeFilter('all');
    setTagFilter('');
    setSelectedFilm(null);
    setSelectedDeveloper(null);
    setSortBy('filmName');
    setSortDirection('asc');
  }, [setSelectedFilm, setSelectedDeveloper]);

  const filteredCombinations = useMemo(() => {
    let combinations = [...allCombinations];

    // Filter by selected film
    if (selectedFilm) {
      combinations = combinations.filter(
        (combo) =>
          combo.filmStockId === selectedFilm.uuid ||
          combo.filmSlug === selectedFilm.slug
      );
    }

    // Filter by selected developer
    if (selectedDeveloper) {
      combinations = combinations.filter(
        (combo) =>
          combo.developerId === selectedDeveloper.uuid ||
          combo.developerSlug === selectedDeveloper.slug
      );
    }

    // Filter by developer type
    if (developerTypeFilter) {
      const matchingDevelopers = allDevelopers.filter(
        (dev) => dev.type === developerTypeFilter
      );
      const developerKeys = matchingDevelopers
        .flatMap((dev) => [dev.uuid, dev.slug])
        .filter(Boolean);
      combinations = combinations.filter(
        (combo) =>
          developerKeys.includes(combo.developerId) ||
          developerKeys.includes(combo.developerSlug)
      );
    }

    // Filter by dilution
    if (dilutionFilter && selectedDeveloper) {
      combinations = combinations.filter((combo) => {
        // Handle null/undefined dilutionId by using null-safe lookup
        const foundDilution = combo.dilutionId
          ? selectedDeveloper.dilutions?.find((d: Dilution) => d.id === combo.dilutionId)
          : null;

        // Priority: customDilution > developer dilution lookup > fallback to 'Stock'
        const dilutionInfo =
          combo.customDilution?.trim() ||
          foundDilution?.dilution?.trim() ||
          'Stock';

        return dilutionInfo.toLowerCase() === dilutionFilter.toLowerCase();
      });

      // Summary log for filtering results
      if (combinations.length > 0) {
        console.log(
          `✅ Successfully filtered to ${combinations.length} combinations for dilution "${dilutionFilter}"`
        );
      } else {
        console.warn(
          `⚠️ No combinations found for dilution "${dilutionFilter}" with developer ${selectedDeveloper.name}. Check dilution name or availability.`
        );
      }
    }

    // Filter by ISO
    if (isoFilter && selectedFilm) {
      combinations = combinations.filter(
        (combo) => combo.shootingIso.toString() === isoFilter
      );
    }

    // Sort combinations
    combinations.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'filmName': {
          const filmA = getFilmById(a.filmStockId);
          const filmB = getFilmById(b.filmStockId);
          const nameA = filmA ? `${filmA.brand} ${filmA.name}` : '';
          const nameB = filmB ? `${filmB.brand} ${filmB.name}` : '';
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'developerName': {
          const devA = getDeveloperById(a.developerId);
          const devB = getDeveloperById(b.developerId);
          const nameA = devA ? `${devA.manufacturer} ${devA.name}` : '';
          const nameB = devB ? `${devB.manufacturer} ${devB.name}` : '';
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'timeMinutes':
          comparison = a.timeMinutes - b.timeMinutes;
          break;
        case 'temperatureF':
          comparison = a.temperatureF - b.temperatureF;
          break;
        case 'shootingIso':
          comparison = a.shootingIso - b.shootingIso;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return combinations;
  }, [
    allCombinations,
    allDevelopers,
    developerTypeFilter,
    dilutionFilter,
    isoFilter,
    selectedFilm,
    selectedDeveloper,
    sortBy,
    sortDirection,
    getFilmById,
    getDeveloperById,
  ]);

  return {
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
    setSortBy,
    setSortDirection,
    handleSort,
    setSelectedFilm,
    setSelectedDeveloper,
    forceRefresh,
    clearFilters,
    getFilmById,
    getDeveloperById,
    getCombinationsForFilm,
    getCombinationsForDeveloper,
    getAvailableDilutions,
    getAvailableISOs,
    getAvailableTags,
  };
};
