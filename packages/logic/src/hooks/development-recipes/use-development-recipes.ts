import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DorkroomClient,
  type Film,
  type Developer,
  type Combination,
} from '@dorkroom/api';
import { debugError } from '../../utils/debug-logger';
import type { InitialUrlState } from '../../types/development-recipes-url';

export interface DevelopmentRecipesState {
  filmSearch: string;
  developerSearch: string;
  developerTypeFilter: string;
  dilutionFilter: string;
  isoFilter: string;
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
  setFilmSearch: (search: string) => void;
  setDeveloperSearch: (search: string) => void;
  setDeveloperTypeFilter: (filter: string) => void;
  setDilutionFilter: (filter: string) => void;
  setIsoFilter: (filter: string) => void;
  setSortBy: (sort: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  handleSort: (sortKey: string) => void;
  setSelectedFilm: (film: Film | null) => void;
  setSelectedDeveloper: (developer: Developer | null) => void;
  loadData: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  clearFilters: () => void;
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
  getCombinationsForFilm: (filmId: string) => Combination[];
  getCombinationsForDeveloper: (developerId: string) => Combination[];
  getAvailableDilutions: () => { label: string; value: string }[];
  getAvailableISOs: () => { label: string; value: string }[];
}

const client = new DorkroomClient();

export const useDevelopmentRecipes = (
  initialUrlState?: InitialUrlState,
): DevelopmentRecipesState & DevelopmentRecipesActions => {
  const [filmSearch, setFilmSearch] = useState('');
  const [developerSearch, setDeveloperSearch] = useState('');
  const [developerTypeFilter, setDeveloperTypeFilter] = useState('');
  const [dilutionFilter, setDilutionFilter] = useState(
    initialUrlState?.dilutionFilter || '',
  );
  const [isoFilter, setIsoFilter] = useState(initialUrlState?.isoFilter || '');
  const [sortBy, setSortBy] = useState('filmName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [selectedFilm, setSelectedFilmState] = useState<Film | null>(
    (initialUrlState?.selectedFilm as Film | undefined) || null,
  );
  const [selectedDeveloper, setSelectedDeveloperState] =
    useState<Developer | null>(
      (initialUrlState?.selectedDeveloper as Developer | undefined) || null,
    );

  const setSelectedFilm = useCallback((film: Film | null) => {
    setSelectedFilmState(film);
    setIsoFilter('');
  }, []);

  const setSelectedDeveloper = useCallback((developer: Developer | null) => {
    setSelectedDeveloperState(developer);
    setDilutionFilter('');
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allFilms, setAllFilms] = useState<Film[]>([]);
  const [allDevelopers, setAllDevelopers] = useState<Developer[]>([]);
  const [allCombinations, setAllCombinations] = useState<Combination[]>([]);

  const loadData = useCallback(async () => {
    if (isLoading) return;
    if (isLoaded && !client.isDataExpired()) return;

    setIsLoading(true);
    setError(null);

    try {
      await client.loadAll();

      const allFilmsData = client.getAllFilms();
      const allDevelopersData = client.getAllDevelopers();
      const combinations = client.getAllCombinations();

      const films = allFilmsData.filter((film: Film) => {
        if (!film.colorType) {
          return false;
        }
        const ct = film.colorType.toLowerCase();
        return ct === 'bw' || ct === 'b&w' || ct === 'b & w';
      });

      const developers = allDevelopersData.filter((developer: Developer) => {
        if (!developer.filmOrPaper) {
          return false;
        }
        return developer.filmOrPaper.toLowerCase() === 'film';
      });

      const sortedFilms = films
        .slice()
        .sort((a: Film, b: Film) =>
          a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
        );

      const sortedDevelopers = developers
        .slice()
        .sort((a: Developer, b: Developer) =>
          a.manufacturer.localeCompare(b.manufacturer) ||
          a.name.localeCompare(b.name),
        );

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

  const forceRefresh = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 500)),
        client.forceReload(),
      ]);

      const allFilmsData = client.getAllFilms();
      const allDevelopersData = client.getAllDevelopers();
      const combinations = client.getAllCombinations();

      const films = allFilmsData
        .filter((film: Film) => {
          if (!film.colorType) {
            return false;
          }
          const ct = film.colorType.toLowerCase();
          return ct === 'bw' || ct === 'b&w' || ct === 'b & w';
        })
        .sort((a: Film, b: Film) =>
          a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
        );

      const developers = allDevelopersData
        .filter((developer: Developer) => {
          if (!developer.filmOrPaper) {
            return false;
          }
          return developer.filmOrPaper.toLowerCase() === 'film';
        })
        .sort((a: Developer, b: Developer) =>
          a.manufacturer.localeCompare(b.manufacturer) ||
          a.name.localeCompare(b.name),
        );

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
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getFilmById = useCallback(
    (id?: string | null): Film | undefined => {
      if (!id) return undefined;
      const key = String(id);
      return allFilms.find(
        (film) =>
          film.id === key ||
          film.uuid === key ||
          film.slug === key,
      );
    },
    [allFilms],
  );

  const getDeveloperById = useCallback(
    (id?: string | null): Developer | undefined => {
      if (!id) return undefined;
      const key = String(id);
      return allDevelopers.find(
        (dev) =>
          dev.id === key ||
          dev.uuid === key ||
          dev.slug === key,
      );
    },
    [allDevelopers],
  );

  const getCombinationsForFilm = useCallback(
    (filmId: string): Combination[] => {
      return allCombinations.filter(
        (combo) =>
          combo.filmStockId === filmId ||
          combo.filmSlug === filmId,
      );
    },
    [allCombinations],
  );

  const getCombinationsForDeveloper = useCallback(
    (developerId: string): Combination[] => {
      return allCombinations.filter(
        (combo) =>
          combo.developerId === developerId ||
          combo.developerSlug === developerId,
      );
    },
    [allCombinations],
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
        combo.developerSlug === selectedDeveloper.slug,
    );

    combinations.forEach((combo) => {
      const dilutionInfo =
        combo.customDilution ||
        selectedDeveloper.dilutions.find((d: any) => d.id === combo.dilutionId)
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

  const getAvailableISOs = useCallback((): { label: string; value: string }[] => {
    if (!selectedFilm) return [];

    const isos = [{ label: 'All ISOs', value: '' }];
    const isoSet = new Set<number>();

    const combinations = allCombinations.filter(
      (combo) =>
        combo.filmStockId === selectedFilm.uuid ||
        combo.filmSlug === selectedFilm.slug,
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

  const handleSort = useCallback(
    (sortKey: string) => {
      if (sortBy === sortKey) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(sortKey);
        setSortDirection('asc');
      }
    },
    [sortBy, sortDirection],
  );

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
  }, [setSelectedFilm, setSelectedDeveloper]);

  const filteredCombinations = useMemo(() => {
    let combinations = [...allCombinations];

    if (selectedFilm) {
      combinations = combinations.filter(
        (combo) =>
          combo.filmStockId === selectedFilm.uuid ||
          combo.filmSlug === selectedFilm.slug,
      );
    } else if (filmSearch.trim()) {
      const lowerSearch = filmSearch.toLowerCase();
      const matchingFilms = allFilms.filter(
        (film) =>
          film.name.toLowerCase().includes(lowerSearch) ||
          film.brand.toLowerCase().includes(lowerSearch),
      );
      const filmKeys = matchingFilms
        .flatMap((film) => [film.uuid, film.slug])
        .filter(Boolean);
      combinations = combinations.filter((combo) =>
        filmKeys.includes(combo.filmStockId ?? '') ||
        filmKeys.includes(combo.filmSlug ?? ''),
      );
    }

    if (selectedDeveloper) {
      combinations = combinations.filter(
        (combo) =>
          combo.developerId === selectedDeveloper.uuid ||
          combo.developerSlug === selectedDeveloper.slug,
      );
    } else if (developerSearch.trim()) {
      const lowerSearch = developerSearch.toLowerCase();
      const matchingDevelopers = allDevelopers.filter(
        (dev) =>
          dev.name.toLowerCase().includes(lowerSearch) ||
          dev.manufacturer.toLowerCase().includes(lowerSearch),
      );
      const developerKeys = matchingDevelopers
        .flatMap((dev) => [dev.uuid, dev.slug])
        .filter(Boolean);
      combinations = combinations.filter((combo) =>
        developerKeys.includes(combo.developerId ?? '') ||
        developerKeys.includes(combo.developerSlug ?? ''),
      );
    }

    if (developerTypeFilter) {
      const matchingDevelopers = allDevelopers.filter(
        (dev) => dev.type === developerTypeFilter,
      );
      const developerKeys = matchingDevelopers
        .flatMap((dev) => [dev.uuid, dev.slug])
        .filter(Boolean);
      combinations = combinations.filter((combo) =>
        developerKeys.includes(combo.developerId ?? '') ||
        developerKeys.includes(combo.developerSlug ?? ''),
      );
    }

    if (dilutionFilter && selectedDeveloper) {
      combinations = combinations.filter((combo) => {
        const dilutionInfo =
          combo.customDilution ||
          selectedDeveloper.dilutions.find((d: any) => d.id === combo.dilutionId)
            ?.dilution ||
          'Stock';
        return dilutionInfo.toLowerCase() === dilutionFilter.toLowerCase();
      });
    }

    if (isoFilter && selectedFilm) {
      combinations = combinations.filter(
        (combo) => combo.shootingIso.toString() === isoFilter,
      );
    }

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
    setSortBy,
    setSortDirection,
    handleSort,
    setSelectedFilm,
    setSelectedDeveloper,
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
