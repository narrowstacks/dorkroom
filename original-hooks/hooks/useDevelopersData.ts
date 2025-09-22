import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Developer } from "@/api/dorkroom/types";
import { getApiUrl } from "@/utils/platformDetection";
import { fuzzySearchDevelopers } from "@/utils/fuzzySearch";

export interface DevelopersDataState {
  developers: Developer[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  searchQuery: string;
  manufacturerFilter: string;
  typeFilter: string;
  filmOrPaperFilter: string;
  sortBy: "name" | "manufacturer" | "type" | "dateAdded";
  sortDirection: "asc" | "desc";
}

export interface DevelopersDataActions {
  setSearchQuery: (query: string) => void;
  setManufacturerFilter: (manufacturer: string) => void;
  setTypeFilter: (type: string) => void;
  setFilmOrPaperFilter: (filmOrPaper: string) => void;
  setSortBy: (sortBy: DevelopersDataState["sortBy"]) => void;
  setSortDirection: (direction: DevelopersDataState["sortDirection"]) => void;
  handleSort: (field: DevelopersDataState["sortBy"]) => void;
  clearFilters: () => void;
  refetch: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export interface UseDevelopersDataReturn
  extends DevelopersDataState,
    DevelopersDataActions {
  filteredDevelopers: Developer[];
  totalDevelopers: number;
  availableManufacturers: string[];
  availableTypes: string[];
  availableFilmOrPaper: string[];
  getDeveloperById: (id: string) => Developer | undefined;
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
 * Custom hook for managing developers data with search, filtering, and sorting
 */
export function useDevelopersData(): UseDevelopersDataReturn {
  const [state, setState] = useState<DevelopersDataState>({
    developers: [],
    isLoading: false,
    isLoaded: false,
    error: null,
    searchQuery: "",
    manufacturerFilter: "",
    typeFilter: "",
    filmOrPaperFilter: "",
    sortBy: "name",
    sortDirection: "asc",
  });

  const cacheRef = useRef<{ data: Developer[]; timestamp: number } | null>(
    null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cache TTL: 5 minutes
  const CACHE_TTL = 5 * 60 * 1000;

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  /**
   * Fetch developers data from API
   */
  const fetchDevelopers = useCallback(
    async (forceRefresh = false) => {
      // Check cache first
      if (!forceRefresh && cacheRef.current) {
        const age = Date.now() - cacheRef.current.timestamp;
        if (age < CACHE_TTL) {
          setState((prev) => ({
            ...prev,
            developers: cacheRef.current!.data,
            isLoading: false,
            isLoaded: true,
            error: null,
          }));
          return;
        }
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const params = new URLSearchParams();
        if (debouncedSearchQuery.trim()) {
          params.set("query", debouncedSearchQuery.trim());
          params.set("fuzzy", "true");
        }
        params.set("limit", "1000"); // Get all developers

        const queryString = params.toString();
        const url = getApiUrl(
          `developers${queryString ? `?${queryString}` : ""}`,
        );

        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch developers: ${response.status} ${response.statusText}`,
          );
        }

        const result = await response.json();

        if (!result.data || !Array.isArray(result.data)) {
          throw new Error("Invalid response format from developers API");
        }

        const developersData = result.data as Developer[];

        // Update cache
        cacheRef.current = {
          data: developersData,
          timestamp: Date.now(),
        };

        setState((prev) => ({
          ...prev,
          developers: developersData,
          isLoading: false,
          isLoaded: true,
          error: null,
        }));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return; // Request was cancelled, don't update state
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [debouncedSearchQuery],
  );

  /**
   * Initial data fetch
   */
  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  /**
   * Filter and sort developers based on current state
   */
  const filteredDevelopers = useMemo(() => {
    let filtered = [...state.developers];

    // Apply search filter using fuzzy search
    if (debouncedSearchQuery.trim()) {
      filtered = fuzzySearchDevelopers(filtered, debouncedSearchQuery);
    }

    // Apply manufacturer filter
    if (state.manufacturerFilter) {
      filtered = filtered.filter(
        (developer) =>
          developer.manufacturer.toLowerCase() ===
          state.manufacturerFilter.toLowerCase(),
      );
    }

    // Apply type filter
    if (state.typeFilter) {
      filtered = filtered.filter(
        (developer) =>
          developer.type.toLowerCase() === state.typeFilter.toLowerCase(),
      );
    }

    // Apply film/paper filter
    if (state.filmOrPaperFilter) {
      filtered = filtered.filter(
        (developer) =>
          developer.filmOrPaper.toLowerCase() ===
          state.filmOrPaperFilter.toLowerCase(),
      );
    }

    // Apply sorting (only if no search query, since fuzzy search already provides relevance ordering)
    if (!debouncedSearchQuery.trim()) {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (state.sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "manufacturer":
            comparison = a.manufacturer.localeCompare(b.manufacturer);
            break;
          case "type":
            comparison = a.type.localeCompare(b.type);
            break;
          case "dateAdded":
            comparison =
              new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
            break;
          default:
            comparison = 0;
        }

        return state.sortDirection === "desc" ? -comparison : comparison;
      });
    }

    return filtered;
  }, [
    state.developers,
    debouncedSearchQuery,
    state.manufacturerFilter,
    state.typeFilter,
    state.filmOrPaperFilter,
    state.sortBy,
    state.sortDirection,
  ]);

  /**
   * Get available filter options
   */
  const availableManufacturers = useMemo(() => {
    const manufacturers = [
      ...new Set(state.developers.map((dev) => dev.manufacturer)),
    ];
    return manufacturers.sort();
  }, [state.developers]);

  const availableTypes = useMemo(() => {
    const types = [...new Set(state.developers.map((dev) => dev.type))];
    return types.sort();
  }, [state.developers]);

  const availableFilmOrPaper = useMemo(() => {
    const filmOrPaper = [
      ...new Set(state.developers.map((dev) => dev.filmOrPaper)),
    ];
    return filmOrPaper.sort();
  }, [state.developers]);

  /**
   * Get developer by ID
   */
  const getDeveloperById = useCallback(
    (id: string): Developer | undefined => {
      return state.developers.find((dev) => dev.id === id || dev.uuid === id);
    },
    [state.developers],
  );

  /**
   * Update search query
   */
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  /**
   * Update manufacturer filter
   */
  const setManufacturerFilter = useCallback((manufacturer: string) => {
    setState((prev) => ({ ...prev, manufacturerFilter: manufacturer }));
  }, []);

  /**
   * Update type filter
   */
  const setTypeFilter = useCallback((type: string) => {
    setState((prev) => ({ ...prev, typeFilter: type }));
  }, []);

  /**
   * Update film/paper filter
   */
  const setFilmOrPaperFilter = useCallback((filmOrPaper: string) => {
    setState((prev) => ({ ...prev, filmOrPaperFilter: filmOrPaper }));
  }, []);

  /**
   * Update sort field
   */
  const setSortBy = useCallback((sortBy: DevelopersDataState["sortBy"]) => {
    setState((prev) => ({ ...prev, sortBy }));
  }, []);

  /**
   * Update sort direction
   */
  const setSortDirection = useCallback(
    (direction: DevelopersDataState["sortDirection"]) => {
      setState((prev) => ({ ...prev, sortDirection: direction }));
    },
    [],
  );

  /**
   * Handle sort with automatic direction toggle
   */
  const handleSort = useCallback((field: DevelopersDataState["sortBy"]) => {
    setState((prev) => ({
      ...prev,
      sortBy: field,
      sortDirection:
        prev.sortBy === field && prev.sortDirection === "asc" ? "desc" : "asc",
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      searchQuery: "",
      manufacturerFilter: "",
      typeFilter: "",
      filmOrPaperFilter: "",
    }));
  }, []);

  /**
   * Refetch data (respects cache)
   */
  const refetch = useCallback(async () => {
    await fetchDevelopers(false);
  }, [fetchDevelopers]);

  /**
   * Force refresh (ignores cache)
   */
  const forceRefresh = useCallback(async () => {
    await fetchDevelopers(true);
  }, [fetchDevelopers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    filteredDevelopers,
    totalDevelopers: state.developers.length,
    availableManufacturers,
    availableTypes,
    availableFilmOrPaper,
    getDeveloperById,
    setSearchQuery,
    setManufacturerFilter,
    setTypeFilter,
    setFilmOrPaperFilter,
    setSortBy,
    setSortDirection,
    handleSort,
    clearFilters,
    refetch,
    forceRefresh,
  };
}
