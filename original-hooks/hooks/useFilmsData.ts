import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Film } from '@/api/dorkroom/types';
import { DorkroomClient } from '@/api/dorkroom/client';
import { fuzzySearchFilms } from '@/utils/fuzzySearch';

export interface FilmsDataState {
  films: Film[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  searchQuery: string;
  brandFilter: string;
  typeFilter: string;
  sortBy: 'name' | 'brand' | 'iso' | 'dateAdded';
  sortDirection: 'asc' | 'desc';
}

export interface FilmsDataActions {
  setSearchQuery: (query: string) => void;
  setBrandFilter: (brand: string) => void;
  setTypeFilter: (type: string) => void;
  setSortBy: (sortBy: FilmsDataState['sortBy']) => void;
  setSortDirection: (direction: FilmsDataState['sortDirection']) => void;
  handleSort: (field: FilmsDataState['sortBy']) => void;
  clearFilters: () => void;
  refetch: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export interface UseFilmsDataReturn extends FilmsDataState, FilmsDataActions {
  filteredFilms: Film[];
  totalFilms: number;
  availableBrands: string[];
  availableTypes: string[];
  getFilmById: (id: string) => Film | undefined;
}

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for managing films data with search, filtering, and sorting
 */
export function useFilmsData(): UseFilmsDataReturn {
  const [state, setState] = useState<FilmsDataState>({
    films: [],
    isLoading: false,
    isLoaded: false,
    error: null,
    searchQuery: '',
    brandFilter: '',
    typeFilter: '',
    sortBy: 'name',
    sortDirection: 'asc',
  });

  const cacheRef = useRef<{ data: Film[]; timestamp: number } | null>(null);
  const clientRef = useRef<DorkroomClient>(new DorkroomClient());

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  /**
   * Fetch films data using DorkroomClient
   */
  const fetchFilms = useCallback(
    async (forceRefresh = false) => {
      const client = clientRef.current;

      // Check client cache first if not forcing refresh
      if (!forceRefresh && client.isLoaded() && !client.isDataExpired()) {
        const filmsData = client.getAllFilms();

        // Update our local cache
        cacheRef.current = {
          data: filmsData,
          timestamp: Date.now(),
        };

        setState((prev) => ({
          ...prev,
          films: filmsData,
          isLoading: false,
          isLoaded: true,
          error: null,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        // Load data through DorkroomClient (includes manufacturer notes parsing)
        if (forceRefresh) {
          await client.forceReload();
        } else {
          await client.loadAll();
        }

        const filmsData = client.getAllFilms();

        // Update cache
        cacheRef.current = {
          data: filmsData,
          timestamp: Date.now(),
        };

        setState((prev) => ({
          ...prev,
          films: filmsData,
          isLoading: false,
          isLoaded: true,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [] // No dependencies since we're using DorkroomClient's internal caching
  );

  /**
   * Initial data fetch
   */
  useEffect(() => {
    fetchFilms();
  }, [fetchFilms]);

  /**
   * Filter and sort films based on current state
   */
  const filteredFilms = useMemo(() => {
    let filtered = [...state.films];

    // Apply search filter using fuzzy search
    if (debouncedSearchQuery.trim()) {
      filtered = fuzzySearchFilms(filtered, debouncedSearchQuery);
    }

    // Apply brand filter
    if (state.brandFilter) {
      filtered = filtered.filter(
        (film) => film.brand.toLowerCase() === state.brandFilter.toLowerCase()
      );
    }

    // Apply type filter
    if (state.typeFilter) {
      filtered = filtered.filter(
        (film) =>
          film.colorType.toLowerCase() === state.typeFilter.toLowerCase()
      );
    }

    // Apply sorting (only if no search query, since fuzzy search already provides relevance ordering)
    if (!debouncedSearchQuery.trim()) {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (state.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'brand':
            comparison = a.brand.localeCompare(b.brand);
            break;
          case 'iso':
            comparison = a.isoSpeed - b.isoSpeed;
            break;
          case 'dateAdded':
            comparison =
              new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
            break;
          default:
            comparison = 0;
        }

        return state.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [
    state.films,
    debouncedSearchQuery,
    state.brandFilter,
    state.typeFilter,
    state.sortBy,
    state.sortDirection,
  ]);

  /**
   * Get available filter options
   */
  const availableBrands = useMemo(() => {
    const brands = [...new Set(state.films.map((film) => film.brand))];
    return brands.sort();
  }, [state.films]);

  const availableTypes = useMemo(() => {
    const types = [...new Set(state.films.map((film) => film.colorType))];
    return types.sort();
  }, [state.films]);

  /**
   * Get film by ID
   */
  const getFilmById = useCallback(
    (id: string): Film | undefined => {
      return state.films.find((film) => film.id === id || film.uuid === id);
    },
    [state.films]
  );

  /**
   * Update search query
   */
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  /**
   * Update brand filter
   */
  const setBrandFilter = useCallback((brand: string) => {
    setState((prev) => ({ ...prev, brandFilter: brand }));
  }, []);

  /**
   * Update type filter
   */
  const setTypeFilter = useCallback((type: string) => {
    setState((prev) => ({ ...prev, typeFilter: type }));
  }, []);

  /**
   * Update sort field
   */
  const setSortBy = useCallback((sortBy: FilmsDataState['sortBy']) => {
    setState((prev) => ({ ...prev, sortBy }));
  }, []);

  /**
   * Update sort direction
   */
  const setSortDirection = useCallback(
    (direction: FilmsDataState['sortDirection']) => {
      setState((prev) => ({ ...prev, sortDirection: direction }));
    },
    []
  );

  /**
   * Handle sort with automatic direction toggle
   */
  const handleSort = useCallback((field: FilmsDataState['sortBy']) => {
    setState((prev) => ({
      ...prev,
      sortBy: field,
      sortDirection:
        prev.sortBy === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      searchQuery: '',
      brandFilter: '',
      typeFilter: '',
    }));
  }, []);

  /**
   * Refetch data (respects cache)
   */
  const refetch = useCallback(async () => {
    await fetchFilms(false);
  }, [fetchFilms]);

  /**
   * Force refresh (ignores cache)
   */
  const forceRefresh = useCallback(async () => {
    await fetchFilms(true);
  }, [fetchFilms]);

  // No cleanup needed for DorkroomClient

  return {
    ...state,
    filteredFilms,
    totalFilms: state.films.length,
    availableBrands,
    availableTypes,
    getFilmById,
    setSearchQuery,
    setBrandFilter,
    setTypeFilter,
    setSortBy,
    setSortDirection,
    handleSort,
    clearFilters,
    refetch,
    forceRefresh,
  };
}
