import { useState, useCallback, useMemo, useEffect } from 'react';
import { DorkroomClient } from '@/api/dorkroom/client';
import type { Film, Developer, Combination } from '@/api/dorkroom/types';
import { debugLog, debugWarn, debugError } from '@/utils/debugLogger';
import { InitialUrlState } from '@/types/urlTypes';

export interface DevelopmentRecipesState {
  // Search and filter state
  filmSearch: string;
  developerSearch: string;
  developerTypeFilter: string;
  dilutionFilter: string;
  isoFilter: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';

  // Selected items
  selectedFilm: Film | null;
  selectedDeveloper: Developer | null;

  // Loading and error states
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Data
  allFilms: Film[];
  allDevelopers: Developer[];
  filteredCombinations: Combination[];
}

export interface DevelopmentRecipesActions {
  // Search and filter actions
  setFilmSearch: (search: string) => void;
  setDeveloperSearch: (search: string) => void;
  setDeveloperTypeFilter: (filter: string) => void;
  setDilutionFilter: (filter: string) => void;
  setIsoFilter: (filter: string) => void;
  setSortBy: (sort: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  handleSort: (sortKey: string) => void;

  // Selection actions
  setSelectedFilm: (film: Film | null) => void;
  setSelectedDeveloper: (developer: Developer | null) => void;

  // Data actions
  loadData: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  clearFilters: () => void;

  // Helper functions
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
  getCombinationsForFilm: (filmId: string) => Combination[];
  getCombinationsForDeveloper: (developerId: string) => Combination[];
  getAvailableDilutions: () => { label: string; value: string }[];
  getAvailableISOs: () => { label: string; value: string }[];
}

const client = new DorkroomClient();

export const useDevelopmentRecipes = (
  initialUrlState?: InitialUrlState
): DevelopmentRecipesState & DevelopmentRecipesActions => {
  // State - initialize with URL state if provided
  const [filmSearch, setFilmSearch] = useState<string>('');
  const [developerSearch, setDeveloperSearch] = useState<string>('');
  const [developerTypeFilter, setDeveloperTypeFilter] = useState<string>('');
  const [dilutionFilter, setDilutionFilter] = useState<string>(
    initialUrlState?.dilutionFilter || ''
  );
  const [isoFilter, setIsoFilter] = useState<string>(
    initialUrlState?.isoFilter || ''
  );
  const [sortBy, setSortBy] = useState<string>('filmName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [selectedFilm, setSelectedFilm] = useState<Film | null>(
    initialUrlState?.selectedFilm || null
  );
  const [selectedDeveloper, setSelectedDeveloper] = useState<Developer | null>(
    initialUrlState?.selectedDeveloper || null
  );

  // Clear ISO filter when film selection changes
  const setSelectedFilmAndClearISO = useCallback((film: Film | null) => {
    setSelectedFilm(film);
    setIsoFilter('');
  }, []);

  // Clear dilution filter when developer selection changes
  const setSelectedDeveloperAndClearDilution = useCallback(
    (developer: Developer | null) => {
      setSelectedDeveloper(developer);
      setDilutionFilter('');
    },
    []
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [allFilms, setAllFilms] = useState<Film[]>([]);
  const [allDevelopers, setAllDevelopers] = useState<Developer[]>([]);
  const [allCombinations, setAllCombinations] = useState<Combination[]>([]);

  // Load data from API (respects 10-minute cache)
  const loadData = useCallback(async () => {
    if (isLoading) return;
    if (isLoaded && !client.isDataExpired()) return;

    setIsLoading(true);
    setError(null);

    try {
      debugLog('[useDevelopmentRecipes] Starting client.loadAll()...');
      await client.loadAll();

      const allFilmsData = client.getAllFilms();
      const allDevelopersData = client.getAllDevelopers();
      const combinations = client.getAllCombinations();

      debugLog('[useDevelopmentRecipes] Client data retrieved:', {
        allFilmsData: allFilmsData.length,
        allDevelopersData: allDevelopersData.length,
        combinations: combinations.length,
      });

      // Log sample data to check structure
      if (allFilmsData.length > 0) {
        debugLog('[useDevelopmentRecipes] Sample film data:', allFilmsData[0]);
      }
      if (allDevelopersData.length > 0) {
        debugLog(
          '[useDevelopmentRecipes] Sample developer data:',
          allDevelopersData[0]
        );
      }

      // Filter films to only show black-and-white films (case-insensitive, allows "B&W")
      debugLog('[useDevelopmentRecipes] Starting film filtering...');
      const films = allFilmsData.filter((film) => {
        if (!film.colorType) {
          debugLog(
            '[useDevelopmentRecipes] Film rejected (no colorType):',
            film.name
          );
          return false;
        }
        const ct = film.colorType.toLowerCase();
        const isValid = ct === 'bw' || ct === 'b&w' || ct === 'b & w';
        debugLog('[useDevelopmentRecipes] Film filter check:', {
          name: film.name,
          colorType: film.colorType,
          lowerCase: ct,
          isValid,
        });
        return isValid;
      });

      // Filter developers to only show those for film development (not paper) – case-insensitive
      debugLog('[useDevelopmentRecipes] Starting developer filtering...');
      const developers = allDevelopersData.filter((developer) => {
        if (!developer.filmOrPaper) {
          debugLog(
            '[useDevelopmentRecipes] Developer rejected (no filmOrPaper):',
            developer.name
          );
          return false;
        }
        const isValid = developer.filmOrPaper.toLowerCase() === 'film';
        debugLog('[useDevelopmentRecipes] Developer filter check:', {
          name: developer.name,
          filmOrPaper: developer.filmOrPaper,
          isValid,
        });
        return isValid;
      });

      debugLog('[useDevelopmentRecipes] Filtering complete:', {
        originalFilms: allFilmsData.length,
        filteredFilms: films.length,
        originalDevelopers: allDevelopersData.length,
        filteredDevelopers: developers.length,
      });

      // Pre-sort data for better performance (avoid sorting on every render)
      const sortedFilms = films.slice().sort((a, b) => {
        const brandCompare = a.brand.localeCompare(b.brand);
        return brandCompare !== 0 ? brandCompare : a.name.localeCompare(b.name);
      });

      const sortedDevelopers = developers.slice().sort((a, b) => {
        const manufacturerCompare = a.manufacturer.localeCompare(
          b.manufacturer
        );
        return manufacturerCompare !== 0
          ? manufacturerCompare
          : a.name.localeCompare(b.name);
      });

      setAllFilms(sortedFilms);
      setAllDevelopers(sortedDevelopers);
      setAllCombinations(combinations);
      setIsLoaded(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load development data';
      setError(errorMessage);
      debugError('Failed to load development recipes data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isLoading]);

  // Force refresh data bypassing cache
  const forceRefresh = useCallback(async () => {
    if (isLoading) return;

    debugLog('[useDevelopmentRecipes] Force refresh started');
    setIsLoading(true);
    setError(null);

    try {
      // Add minimum loading time to ensure spinner is visible
      const [, allFilmsData, allDevelopersData, combinations] =
        await Promise.all([
          new Promise((resolve) => setTimeout(resolve, 500)), // Minimum 500ms loading
          client.forceReload().then(() => client.getAllFilms()),
          client.getAllDevelopers(),
          client.getAllCombinations(),
        ]);

      // Filter films to only show black-and-white films (case-insensitive, allows "B&W")
      debugLog(
        '[useDevelopmentRecipes] forceRefresh: Starting film filtering...'
      );
      const films = allFilmsData.filter((film) => {
        if (!film.colorType) {
          debugLog(
            '[useDevelopmentRecipes] forceRefresh: Film rejected (no colorType):',
            film.name
          );
          return false;
        }
        const ct = film.colorType.toLowerCase();
        const isValid = ct === 'bw' || ct === 'b&w' || ct === 'b & w';
        debugLog('[useDevelopmentRecipes] forceRefresh: Film filter check:', {
          name: film.name,
          colorType: film.colorType,
          lowerCase: ct,
          isValid,
        });
        return isValid;
      });

      // Filter developers to only show those for film development (not paper) – case-insensitive
      debugLog(
        '[useDevelopmentRecipes] forceRefresh: Starting developer filtering...'
      );
      const developers = allDevelopersData.filter((developer) => {
        if (!developer.filmOrPaper) {
          debugLog(
            '[useDevelopmentRecipes] forceRefresh: Developer rejected (no filmOrPaper):',
            developer.name
          );
          return false;
        }
        const isValid = developer.filmOrPaper.toLowerCase() === 'film';
        debugLog(
          '[useDevelopmentRecipes] forceRefresh: Developer filter check:',
          {
            name: developer.name,
            filmOrPaper: developer.filmOrPaper,
            isValid,
          }
        );
        return isValid;
      });

      debugLog('[useDevelopmentRecipes] Data refreshed:', {
        films: films.length,
        developers: developers.length,
        combinations: combinations.length,
      });

      setAllFilms(films);
      setAllDevelopers(developers);
      setAllCombinations(combinations);
      setIsLoaded(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to refresh development data';
      setError(errorMessage);
      debugError('Failed to refresh development recipes data:', err);
    } finally {
      debugLog('[useDevelopmentRecipes] Force refresh completed');
      setIsLoading(false);
    }
  }, [isLoading]);

  // Auto-load data on first use
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper functions
  const getFilmById = useCallback(
    (id: string): Film | undefined => {
      return allFilms.find(
        (film) => film.id === id || film.uuid === id || film.slug === id
      );
    },
    [allFilms]
  );

  const getDeveloperById = useCallback(
    (id: string): Developer | undefined => {
      return allDevelopers.find(
        (dev) => dev.id === id || dev.uuid === id || dev.slug === id
      );
    },
    [allDevelopers]
  );

  const getCombinationsForFilm = useCallback(
    (filmId: string): Combination[] => {
      return allCombinations.filter((combo) => combo.filmStockId === filmId);
    },
    [allCombinations]
  );

  const getCombinationsForDeveloper = useCallback(
    (developerId: string): Combination[] => {
      return allCombinations.filter(
        (combo) => combo.developerId === developerId
      );
    },
    [allCombinations]
  );

  // Get available dilutions for selected developer
  const getAvailableDilutions = useCallback((): {
    label: string;
    value: string;
  }[] => {
    if (!selectedDeveloper) return [];

    const dilutions = [{ label: 'All Dilutions', value: '' }];
    const dilutionSet = new Set<string>();

    // Get combinations for this developer
    const combinations = allCombinations.filter(
      (combo) => combo.developerId === selectedDeveloper.uuid
    );

    combinations.forEach((combo) => {
      const dilutionInfo =
        combo.customDilution ||
        selectedDeveloper.dilutions.find((d) => d.id === combo.dilutionId)
          ?.dilution ||
        'Stock';
      dilutionSet.add(dilutionInfo);
    });

    Array.from(dilutionSet)
      .sort()
      .forEach((dilution) => {
        dilutions.push({ label: dilution, value: dilution });
      });

    return dilutions;
  }, [selectedDeveloper, allCombinations]);

  // Get available ISOs for selected film
  const getAvailableISOs = useCallback((): {
    label: string;
    value: string;
  }[] => {
    if (!selectedFilm) return [];

    const isos = [{ label: 'All ISOs', value: '' }];
    const isoSet = new Set<number>();

    // Get combinations for this film
    const combinations = allCombinations.filter(
      (combo) => combo.filmStockId === selectedFilm.uuid
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

  // Handle sort with direction toggle
  const handleSort = useCallback(
    (sortKey: string) => {
      if (sortBy === sortKey) {
        // Same column, toggle direction
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        // New column, reset to ascending
        setSortBy(sortKey);
        setSortDirection('asc');
      }
    },
    [sortBy, sortDirection]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilmSearch('');
    setDeveloperSearch('');
    setDeveloperTypeFilter('');
    setDilutionFilter('');
    setIsoFilter('');
    setSelectedFilm(null);
    setSelectedDeveloper(null);
    setSortBy('filmName');
    setSortDirection('asc');
  }, []);

  // Filter and sort combinations based on current state
  const filteredCombinations = useMemo(() => {
    let combinations = [...allCombinations];

    // Filter by selected film
    if (selectedFilm) {
      combinations = combinations.filter(
        (combo) => combo.filmStockId === selectedFilm.uuid
      );
    } else if (filmSearch.trim()) {
      // Filter by film search if no specific film selected
      const matchingFilms = allFilms.filter(
        (film) =>
          film.name.toLowerCase().includes(filmSearch.toLowerCase()) ||
          film.brand.toLowerCase().includes(filmSearch.toLowerCase())
      );
      const filmIds = matchingFilms.map((film) => film.uuid);
      combinations = combinations.filter((combo) =>
        filmIds.includes(combo.filmStockId)
      );
    }

    // Filter by selected developer
    if (selectedDeveloper) {
      combinations = combinations.filter(
        (combo) => combo.developerId === selectedDeveloper.uuid
      );
    } else if (developerSearch.trim()) {
      // Filter by developer search if no specific developer selected
      const matchingDevelopers = allDevelopers.filter(
        (dev) =>
          dev.name.toLowerCase().includes(developerSearch.toLowerCase()) ||
          dev.manufacturer.toLowerCase().includes(developerSearch.toLowerCase())
      );
      const developerIds = matchingDevelopers.map((dev) => dev.uuid);
      combinations = combinations.filter((combo) =>
        developerIds.includes(combo.developerId)
      );
    }

    // Filter by developer type
    if (developerTypeFilter) {
      const matchingDevelopers = allDevelopers.filter(
        (dev) => dev.type === developerTypeFilter
      );
      const developerIds = matchingDevelopers.map((dev) => dev.uuid);
      combinations = combinations.filter((combo) =>
        developerIds.includes(combo.developerId)
      );
    }

    // Filter by dilution (only when specific developer is selected)
    if (dilutionFilter && selectedDeveloper) {
      combinations = combinations.filter((combo) => {
        const dilutionInfo =
          combo.customDilution ||
          selectedDeveloper.dilutions.find((d) => d.id === combo.dilutionId)
            ?.dilution ||
          'Stock';
        return dilutionInfo === dilutionFilter;
      });
    }

    // Filter by shooting ISO (only when specific film is selected)
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

      // Apply sort direction
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return combinations;
  }, [
    allCombinations,
    allFilms,
    allDevelopers,
    filmSearch,
    developerSearch,
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
    setSortBy,
    setSortDirection,
    handleSort,
    setSelectedFilm: setSelectedFilmAndClearISO,
    setSelectedDeveloper: setSelectedDeveloperAndClearDilution,
    loadData,
    forceRefresh,
    clearFilters,
    getFilmById,
    getDeveloperById,
    getCombinationsForFilm,
    getCombinationsForDeveloper,
    getAvailableDilutions,
    getAvailableISOs,
  };
};
