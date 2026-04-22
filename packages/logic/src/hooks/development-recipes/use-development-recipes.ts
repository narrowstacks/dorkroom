import type { Combination, Developer, Dilution, Film } from '@dorkroom/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { queryKeys } from '../../queries/query-keys';
import type { InitialUrlState } from '../../types/development-recipes-url';
import { debugError, debugLog } from '../../utils/debug-logger';
import {
  buildFilmSlugIndex,
  getAllSlugsForFilm,
} from '../../utils/film-alias-resolver';
import { useCombinations } from '../api/use-combinations';
import { useDevelopers } from '../api/use-developers';
import { useFilms } from '../api/use-films';

export type CustomRecipeFilter =
  | 'all'
  | 'hide-custom'
  | 'only-custom'
  | 'official';

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
  const allFilmsUnfiltered = useMemo(() => {
    if (!filmsQuery.data) return [];

    // Filter for black & white films only
    const films = filmsQuery.data.filter((film: Film) => {
      if (!film.colorType) return false;
      const ct = film.colorType.toLowerCase();
      return ct === 'bw' || ct === 'b&w' || ct === 'b & w';
    });

    // Sort by brand and name
    return films
      .slice()
      .sort(
        (a: Film, b: Film) =>
          a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)
      );
  }, [filmsQuery.data]);

  const allDevelopersUnfiltered = useMemo(() => {
    if (!developersQuery.data) return [];

    // Filter for film developers only (filmOrPaper: true = film, false = paper)
    const developers = developersQuery.data.filter(
      (developer: Developer) => developer.filmOrPaper === true
    );

    // Sort by manufacturer and name
    return developers
      .slice()
      .sort(
        (a: Developer, b: Developer) =>
          a.manufacturer.localeCompare(b.manufacturer) ||
          a.name.localeCompare(b.name)
      );
  }, [developersQuery.data]);

  const allCombinations = useMemo(
    () => combinationsQuery.data || [],
    [combinationsQuery.data]
  );

  // Build slug index for alias-aware film lookups
  const filmSlugIndex = useMemo(
    () => buildFilmSlugIndex(allFilmsUnfiltered),
    [allFilmsUnfiltered]
  );

  // Build sets of film/developer IDs that appear in at least one combination
  // so we can exclude films/developers with no recipes from filter dropdowns.
  // Resolves aliases so renamed films still appear when recipes reference old slugs.
  const filmIdsWithCombinations = useMemo(() => {
    const ids = new Set<string>();
    for (const combo of allCombinations) {
      const slug = combo.filmSlug || combo.filmStockId;
      const film = slug ? filmSlugIndex.get(slug) : undefined;
      if (film) {
        ids.add(film.slug); // Always use canonical slug
      } else {
        if (combo.filmStockId) ids.add(combo.filmStockId);
        if (combo.filmSlug) ids.add(combo.filmSlug);
      }
    }
    return ids;
  }, [allCombinations, filmSlugIndex]);

  const developerIdsWithCombinations = useMemo(() => {
    const ids = new Set<string>();
    for (const combo of allCombinations) {
      if (combo.developerId) ids.add(combo.developerId);
      if (combo.developerSlug) ids.add(combo.developerSlug);
    }
    return ids;
  }, [allCombinations]);

  // Only include films/developers that have at least one combination
  const allFilms = useMemo(
    () =>
      allFilmsUnfiltered.filter(
        (film) =>
          filmIdsWithCombinations.has(film.uuid) ||
          filmIdsWithCombinations.has(film.slug)
      ),
    [allFilmsUnfiltered, filmIdsWithCombinations]
  );

  const allDevelopers = useMemo(
    () =>
      allDevelopersUnfiltered.filter(
        (dev) =>
          developerIdsWithCombinations.has(dev.uuid) ||
          developerIdsWithCombinations.has(dev.slug)
      ),
    [allDevelopersUnfiltered, developerIdsWithCombinations]
  );

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
  const isLoading =
    filmsQuery.isPending ||
    developersQuery.isPending ||
    combinationsQuery.isPending;
  const isLoaded =
    filmsQuery.isSuccess &&
    developersQuery.isSuccess &&
    combinationsQuery.isSuccess;
  const error =
    filmsQuery.error?.message ||
    developersQuery.error?.message ||
    combinationsQuery.error?.message ||
    null;

  // Force refresh via TanStack Query refetch
  const forceRefresh = useCallback(async () => {
    debugLog('🔄 forceRefresh() called');
    debugLog('Query keys to refetch:', {
      films: queryKeys.films.list(),
      developers: queryKeys.developers.list(),
      combinations: queryKeys.combinations.list(),
    });
    try {
      // Refetch all queries to ensure fresh data
      // Use exact query keys from queryKeys factory to match the queries created by the hooks
      debugLog('Starting refetch for all queries...');
      const results = await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.films.list() }),
        queryClient.refetchQueries({ queryKey: queryKeys.developers.list() }),
        queryClient.refetchQueries({ queryKey: queryKeys.combinations.list() }),
      ]);
      debugLog('✅ Refetch completed successfully', results);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to refresh development data';
      debugError('❌ Refetch failed:', errorMessage, err);
      throw new Error(errorMessage);
    }
  }, [queryClient]);

  const getFilmById = useCallback(
    (id?: string | null): Film | undefined => {
      if (!id) return undefined;
      const key = String(id);
      // Check slug index first (covers canonical slugs and aliases)
      const fromIndex = filmSlugIndex.get(key);
      if (fromIndex) return fromIndex;
      // Fallback to id/uuid lookup
      return allFilmsUnfiltered.find(
        (film) => film.id.toString() === key || film.uuid === key
      );
    },
    [allFilmsUnfiltered, filmSlugIndex]
  );

  const getDeveloperById = useCallback(
    (id?: string | null): Developer | undefined => {
      if (!id) return undefined;
      const key = String(id);
      // Use unfiltered list so lookups work for custom recipes referencing any developer
      return allDevelopersUnfiltered.find(
        (dev) =>
          dev.id.toString() === key || dev.uuid === key || dev.slug === key
      );
    },
    [allDevelopersUnfiltered]
  );

  const getCombinationsForFilm = useCallback(
    (filmId: string): Combination[] => {
      const film = filmSlugIndex.get(filmId);
      if (film) {
        const slugSet = new Set(getAllSlugsForFilm(film));
        return allCombinations.filter(
          (combo) =>
            slugSet.has(combo.filmStockId) || slugSet.has(combo.filmSlug)
        );
      }
      // Fallback for custom films or IDs not in the slug index — match directly
      // without alias resolution since we have no Film object to resolve from
      return allCombinations.filter(
        (combo) => combo.filmStockId === filmId || combo.filmSlug === filmId
      );
    },
    [allCombinations, filmSlugIndex]
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
        ? selectedDeveloper.dilutions?.find(
            (d: Dilution) => d.id === combo.dilutionId
          )
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

    const isos = [
      { label: 'All ISOs', value: '' },
      {
        label: `Box speed (${selectedFilm.isoSpeed})`,
        value: 'boxspeed',
      },
    ];
    const isoSet = new Set<number>();

    const slugSet = new Set(getAllSlugsForFilm(selectedFilm));
    const combinations = allCombinations.filter(
      (combo) => slugSet.has(combo.filmStockId) || slugSet.has(combo.filmSlug)
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
  }, []);

  const filteredCombinations = useMemo(() => {
    let combinations = [...allCombinations];

    // Filter by selected film (alias-aware + base film recipe sharing)
    if (selectedFilm) {
      const filmsToMatch = [selectedFilm];
      // Include base film's recipes if this is a rebrand
      if (selectedFilm.baseFilmSlug) {
        const baseFilm = filmSlugIndex.get(selectedFilm.baseFilmSlug);
        if (baseFilm) filmsToMatch.push(baseFilm);
      }
      // Include rebrand recipes that point to this film as base
      const rebrands = allFilmsUnfiltered.filter(
        (f) => f.baseFilmSlug === selectedFilm.slug
      );
      filmsToMatch.push(...rebrands);

      const allMatchSlugs = new Set(
        filmsToMatch.flatMap((f) => getAllSlugsForFilm(f))
      );
      combinations = combinations.filter(
        (combo) =>
          allMatchSlugs.has(combo.filmSlug) ||
          allMatchSlugs.has(combo.filmStockId)
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
          ? selectedDeveloper.dilutions?.find(
              (d: Dilution) => d.id === combo.dilutionId
            )
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
      if (isoFilter === 'boxspeed') {
        combinations = combinations.filter(
          (combo) => combo.shootingIso === selectedFilm.isoSpeed
        );
      } else {
        combinations = combinations.filter(
          (combo) => combo.shootingIso.toString() === isoFilter
        );
      }
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
    allFilmsUnfiltered,
    developerTypeFilter,
    dilutionFilter,
    filmSlugIndex,
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
