import type { Film } from '@dorkroom/api';
import { useCallback, useMemo, useState } from 'react';
import { createFilmSearcher } from '../../utils/fuzzy-search';
import { useFilms } from '../api/use-films';
import { useDebounce } from '../use-debounce';

/**
 * Return type for the useFilmDatabase hook
 */
export interface UseFilmDatabaseReturn {
  // Raw data
  films: Film[];
  isLoading: boolean;
  error: string | null;

  // Filtered results
  filteredFilms: Film[];

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Filters
  colorTypeFilter: string; // '', 'bw', 'color', 'slide'
  setColorTypeFilter: (value: string) => void;
  isoSpeedFilter: string; // '' or specific ISO
  setIsoSpeedFilter: (value: string) => void;
  brandFilter: string; // '' or specific brand
  setBrandFilter: (value: string) => void;
  discontinuedFilter: 'all' | 'active' | 'discontinued';
  setDiscontinuedFilter: (value: 'all' | 'active' | 'discontinued') => void;

  // Derived options for dropdowns
  brandOptions: Array<{ label: string; value: string }>;
  isoOptions: Array<{ label: string; value: string }>;

  // Actions
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Comprehensive data management hook for the film database page.
 * Wraps useFilms and adds filtering and searching capabilities.
 *
 * Features:
 * - Fuzzy search across brand, name, and description
 * - Filter by film type ('bw', 'color', 'slide', or all)
 * - Filter by ISO speed
 * - Filter by brand
 * - Filter by discontinued status
 * - Debounced search (300ms)
 * - Derived filter options from actual data
 *
 * @returns Complete film database state and actions
 *
 * @example
 * ```typescript
 * const {
 *   filteredFilms,
 *   isLoading,
 *   searchQuery,
 *   setSearchQuery,
 *   colorTypeFilter,
 *   setColorTypeFilter,
 *   brandOptions,
 *   clearFilters,
 * } = useFilmDatabase();
 * ```
 */
export function useFilmDatabase(): UseFilmDatabaseReturn {
  // Fetch all films
  const { data: films = [], isPending, error } = useFilms();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [colorTypeFilter, setColorTypeFilter] = useState('');
  const [isoSpeedFilter, setIsoSpeedFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [discontinuedFilter, setDiscontinuedFilter] = useState<
    'all' | 'active' | 'discontinued'
  >('all');

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Sort films alphabetically by brand and name
  const sortedFilms = useMemo(() => {
    return [...films].sort((a, b) => {
      const brandCompare = a.brand.localeCompare(b.brand);
      if (brandCompare !== 0) return brandCompare;
      return a.name.localeCompare(b.name);
    });
  }, [films]);

  // Apply non-search filters first (pre-search filtered films)
  const preSearchFiltered = useMemo(() => {
    let result = sortedFilms;

    // Filter by film type
    if (colorTypeFilter) {
      result = result.filter((film) => {
        const ct = film.colorType.toLowerCase();
        if (colorTypeFilter === 'bw') {
          return ct === 'bw' || ct === 'b&w' || ct === 'b & w';
        }
        if (colorTypeFilter === 'color') {
          return ct === 'color' || ct === 'colour';
        }
        if (colorTypeFilter === 'slide') {
          return ct === 'slide';
        }
        return true;
      });
    }

    // Filter by ISO speed
    if (isoSpeedFilter) {
      result = result.filter(
        (film) => film.isoSpeed.toString() === isoSpeedFilter
      );
    }

    // Filter by brand
    if (brandFilter) {
      result = result.filter((film) => film.brand === brandFilter);
    }

    // Filter by discontinued status
    if (discontinuedFilter === 'active') {
      result = result.filter((film) => !film.discontinued);
    } else if (discontinuedFilter === 'discontinued') {
      result = result.filter((film) => film.discontinued);
    }

    return result;
  }, [
    sortedFilms,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter,
  ]);

  // Memoize Fuse.js searcher to avoid recreating the index on every search query change
  const searcher = useMemo(
    () => createFilmSearcher(preSearchFiltered),
    [preSearchFiltered]
  );

  // Apply fuzzy search with memoized Fuse instance
  const filteredFilms = useMemo(() => {
    if (!debouncedSearchQuery) {
      return preSearchFiltered;
    }
    const searchResults = searcher.search(debouncedSearchQuery);
    return searchResults.map((r) => r.item);
  }, [preSearchFiltered, searcher, debouncedSearchQuery]);

  // Derive brand options from actual data
  const brandOptions = useMemo(() => {
    const brands = new Set<string>();
    films.forEach((film) => {
      if (film.brand) {
        brands.add(film.brand);
      }
    });

    const options = [{ label: 'All Brands', value: '' }];
    Array.from(brands)
      .sort()
      .forEach((brand) => {
        options.push({ label: brand, value: brand });
      });

    return options;
  }, [films]);

  // Derive ISO options from actual data
  const isoOptions = useMemo(() => {
    const isos = new Set<number>();
    films.forEach((film) => {
      if (film.isoSpeed) {
        isos.add(film.isoSpeed);
      }
    });

    const options = [{ label: 'All ISOs', value: '' }];
    Array.from(isos)
      .sort((a, b) => a - b)
      .forEach((iso) => {
        options.push({ label: iso.toString(), value: iso.toString() });
      });

    return options;
  }, [films]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setColorTypeFilter('');
    setIsoSpeedFilter('');
    setBrandFilter('');
    setDiscontinuedFilter('all');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      searchQuery ||
      colorTypeFilter ||
      isoSpeedFilter ||
      brandFilter ||
      discontinuedFilter !== 'all'
    );
  }, [
    searchQuery,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter,
  ]);

  return {
    // Raw data
    films: sortedFilms,
    isLoading: isPending,
    error: error?.message || null,

    // Filtered results
    filteredFilms,

    // Search
    searchQuery,
    setSearchQuery,

    // Filters
    colorTypeFilter,
    setColorTypeFilter,
    isoSpeedFilter,
    setIsoSpeedFilter,
    brandFilter,
    setBrandFilter,
    discontinuedFilter,
    setDiscontinuedFilter,

    // Derived options
    brandOptions,
    isoOptions,

    // Actions
    clearFilters,
    hasActiveFilters,
  };
}
