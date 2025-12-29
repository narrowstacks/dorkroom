import type { Film } from '@dorkroom/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFilmDatabase } from '../use-film-database';

/**
 * Comprehensive test suite for the useFilmDatabase hook.
 * Tests filtering, searching, and state management focusing on:
 * - Realistic film stock data
 * - Filter combinations (color type, ISO, brand, discontinued status)
 * - Fuzzy search integration
 * - Alphabetical sorting
 * - Filter state management and clearing
 */

// Mock the useFilms hook
vi.mock('../../api/use-films', () => ({
  useFilms: vi.fn(),
}));

// Mock the useDebounce hook to return value immediately (no delay in tests)
vi.mock('../../use-debounce', () => ({
  useDebounce: vi.fn((value) => value),
}));

// Import after mocking
import { useFilms } from '../../api/use-films';

/**
 * Mock film data representing realistic analog photography film stocks
 * with various brands, ISO speeds, color types, and discontinued status
 */
const mockFilms: Film[] = [
  {
    id: 1,
    uuid: 'f1',
    slug: 'hp5-plus',
    brand: 'Ilford',
    name: 'HP5 Plus',
    colorType: 'bw',
    isoSpeed: 400,
    grainStructure: 'classic',
    description: 'Classic black and white film with excellent latitude',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 2,
    uuid: 'f2',
    slug: 'tri-x-400',
    brand: 'Kodak',
    name: 'Tri-X 400',
    colorType: 'bw',
    isoSpeed: 400,
    grainStructure: 'classic',
    description: 'Iconic high-speed black and white film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 3,
    uuid: 'f3',
    slug: 'portra-400',
    brand: 'Kodak',
    name: 'Portra 400',
    colorType: 'color',
    isoSpeed: 400,
    grainStructure: 'fine',
    description: 'Professional color negative film for portraits',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 4,
    uuid: 'f4',
    slug: 'delta-3200',
    brand: 'Ilford',
    name: 'Delta 3200',
    colorType: 'bw',
    isoSpeed: 3200,
    grainStructure: 'fine',
    description: 'Ultra-high speed black and white film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 5,
    uuid: 'f5',
    slug: 'ektar-100',
    brand: 'Kodak',
    name: 'Ektar 100',
    colorType: 'color',
    isoSpeed: 100,
    grainStructure: 'ultra-fine',
    description: "World's finest grain color negative film",
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 6,
    uuid: 'f6',
    slug: 'tmax-100',
    brand: 'Kodak',
    name: 'T-Max 100',
    colorType: 'bw',
    isoSpeed: 100,
    grainStructure: 'ultra-fine',
    description: 'Finest grain black and white film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 7,
    uuid: 'f7',
    slug: 'pan-f-plus',
    brand: 'Ilford',
    name: 'Pan F Plus',
    colorType: 'bw',
    isoSpeed: 50,
    grainStructure: 'ultra-fine',
    description: 'Extremely fine grain, low speed film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 8,
    uuid: 'f8',
    slug: 'superia-400',
    brand: 'Fujifilm',
    name: 'Superia 400',
    colorType: 'color',
    isoSpeed: 400,
    grainStructure: 'fine',
    description: 'Consumer color negative film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: true, // Discontinued film
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 9,
    uuid: 'f9',
    slug: 'provia-100f',
    brand: 'Fujifilm',
    name: 'Provia 100F',
    colorType: 'color',
    isoSpeed: 100,
    grainStructure: 'ultra-fine',
    description: 'Professional color slide film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 10,
    uuid: 'f10',
    slug: 'plus-x',
    brand: 'Kodak',
    name: 'Plus-X',
    colorType: 'bw',
    isoSpeed: 125,
    grainStructure: 'fine',
    description: 'Classic medium speed film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: true, // Discontinued film
    staticImageUrl: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
];

describe('useFilmDatabase', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock useFilms to return our test data
    vi.mocked(useFilms).mockReturnValue({
      data: mockFilms,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: true,
      status: 'success',
    } as ReturnType<typeof useFilms>);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Initialization and Data Loading', () => {
    it('should return all films sorted alphabetically by brand and name', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      expect(result.current.films).toHaveLength(mockFilms.length);

      // Verify alphabetical sorting by brand first
      const brands = result.current.films.map((f) => f.brand);
      const uniqueBrands = [...new Set(brands)];
      const sortedBrands = [...uniqueBrands].sort((a, b) => a.localeCompare(b));
      expect(uniqueBrands).toEqual(sortedBrands);

      // First film should be from Fujifilm (alphabetically first)
      expect(result.current.films[0].brand).toBe('Fujifilm');

      // Within same brand, should be sorted by name
      const fujifilmFilms = result.current.films.filter(
        (f) => f.brand === 'Fujifilm'
      );
      const fujifilmNames = fujifilmFilms.map((f) => f.name);
      const sortedNames = [...fujifilmNames].sort((a, b) => a.localeCompare(b));
      expect(fujifilmNames).toEqual(sortedNames);
    });

    it('should return loading state when data is pending', () => {
      vi.mocked(useFilms).mockReturnValue({
        data: undefined,
        isPending: true,
        error: null,
        isError: false,
        isSuccess: false,
        status: 'pending',
      } as ReturnType<typeof useFilms>);

      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.films).toEqual([]);
      expect(result.current.filteredFilms).toEqual([]);
    });

    it('should return error state when fetch fails', () => {
      const errorMessage = 'Failed to fetch films';
      vi.mocked(useFilms).mockReturnValue({
        data: undefined,
        isPending: false,
        error: new Error(errorMessage),
        isError: true,
        isSuccess: false,
        status: 'error',
      } as ReturnType<typeof useFilms>);

      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.films).toEqual([]);
    });
  });

  describe('Color Type Filtering', () => {
    it('should filter by B&W color type correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setColorTypeFilter('bw');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      // All results should be black and white
      filtered.forEach((film) => {
        expect(film.colorType.toLowerCase()).toBe('bw');
      });

      // Specific films we expect
      expect(filtered.some((f) => f.name === 'HP5 Plus')).toBe(true);
      expect(filtered.some((f) => f.name === 'Tri-X 400')).toBe(true);
      expect(filtered.some((f) => f.name === 'Delta 3200')).toBe(true);

      // Should NOT include color films
      expect(filtered.some((f) => f.name === 'Portra 400')).toBe(false);
      expect(filtered.some((f) => f.name === 'Ektar 100')).toBe(false);
    });

    it('should filter by Color type correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setColorTypeFilter('color');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      // All results should be color
      filtered.forEach((film) => {
        expect(film.colorType.toLowerCase()).toBe('color');
      });

      // Specific films we expect
      expect(filtered.some((f) => f.name === 'Portra 400')).toBe(true);
      expect(filtered.some((f) => f.name === 'Ektar 100')).toBe(true);
      expect(filtered.some((f) => f.name === 'Provia 100F')).toBe(true);

      // Should NOT include B&W films
      expect(filtered.some((f) => f.name === 'HP5 Plus')).toBe(false);
      expect(filtered.some((f) => f.name === 'Tri-X 400')).toBe(false);
    });

    it('should show all films when color type filter is cleared', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setColorTypeFilter('bw');
      });

      // Should have fewer films
      const filteredCount = result.current.filteredFilms.length;
      expect(filteredCount).toBeLessThan(mockFilms.length);

      act(() => {
        result.current.setColorTypeFilter('');
      });

      // Should show all films again
      expect(result.current.filteredFilms).toHaveLength(mockFilms.length);
    });
  });

  describe('ISO Speed Filtering', () => {
    it('should filter by ISO 400 correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setIsoSpeedFilter('400');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      // All results should be ISO 400
      filtered.forEach((film) => {
        expect(film.isoSpeed).toBe(400);
      });

      // Specific films we expect
      expect(filtered.some((f) => f.name === 'HP5 Plus')).toBe(true);
      expect(filtered.some((f) => f.name === 'Tri-X 400')).toBe(true);
      expect(filtered.some((f) => f.name === 'Portra 400')).toBe(true);

      // Should NOT include other ISOs
      expect(filtered.some((f) => f.name === 'Ektar 100')).toBe(false);
      expect(filtered.some((f) => f.name === 'Delta 3200')).toBe(false);
    });

    it('should filter by ISO 100 correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setIsoSpeedFilter('100');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.isoSpeed).toBe(100);
      });

      expect(filtered.some((f) => f.name === 'Ektar 100')).toBe(true);
      expect(filtered.some((f) => f.name === 'T-Max 100')).toBe(true);
      expect(filtered.some((f) => f.name === 'Provia 100F')).toBe(true);
    });

    it('should filter by ISO 3200 correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setIsoSpeedFilter('3200');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.isoSpeed).toBe(3200);
      });

      expect(filtered.some((f) => f.name === 'Delta 3200')).toBe(true);
    });

    it('should filter by uncommon ISO (50) correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setIsoSpeedFilter('50');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.isoSpeed).toBe(50);
      });

      expect(filtered.some((f) => f.name === 'Pan F Plus')).toBe(true);
    });
  });

  describe('Brand Filtering', () => {
    it('should filter by Kodak brand correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setBrandFilter('Kodak');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.brand).toBe('Kodak');
      });

      expect(filtered.some((f) => f.name === 'Tri-X 400')).toBe(true);
      expect(filtered.some((f) => f.name === 'Portra 400')).toBe(true);
      expect(filtered.some((f) => f.name === 'Ektar 100')).toBe(true);

      // Should NOT include other brands
      expect(filtered.some((f) => f.name === 'HP5 Plus')).toBe(false);
    });

    it('should filter by Ilford brand correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setBrandFilter('Ilford');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.brand).toBe('Ilford');
      });

      expect(filtered.some((f) => f.name === 'HP5 Plus')).toBe(true);
      expect(filtered.some((f) => f.name === 'Delta 3200')).toBe(true);
      expect(filtered.some((f) => f.name === 'Pan F Plus')).toBe(true);
    });

    it('should filter by Fujifilm brand correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setBrandFilter('Fujifilm');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.brand).toBe('Fujifilm');
      });

      expect(filtered.some((f) => f.name === 'Superia 400')).toBe(true);
      expect(filtered.some((f) => f.name === 'Provia 100F')).toBe(true);
    });
  });

  describe('Discontinued Status Filtering', () => {
    it('should filter to show only active films', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setDiscontinuedFilter('active');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.discontinued).toBe(false);
      });

      // Should include active films
      expect(filtered.some((f) => f.name === 'HP5 Plus')).toBe(true);
      expect(filtered.some((f) => f.name === 'Portra 400')).toBe(true);

      // Should NOT include discontinued films
      expect(filtered.some((f) => f.name === 'Superia 400')).toBe(false);
      expect(filtered.some((f) => f.name === 'Plus-X')).toBe(false);
    });

    it('should filter to show only discontinued films', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setDiscontinuedFilter('discontinued');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.discontinued).toBe(true);
      });

      // Should include discontinued films
      expect(filtered.some((f) => f.name === 'Superia 400')).toBe(true);
      expect(filtered.some((f) => f.name === 'Plus-X')).toBe(true);

      // Should NOT include active films
      expect(filtered.some((f) => f.name === 'HP5 Plus')).toBe(false);
    });

    it('should show all films when set to "all"', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setDiscontinuedFilter('all');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered).toHaveLength(mockFilms.length);
    });
  });

  describe('Fuzzy Search Integration', () => {
    it('should search by brand name', async () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setSearchQuery('kodak');
      });

      await waitFor(() => {
        const filtered = result.current.filteredFilms;
        expect(filtered.length).toBeGreaterThan(0);
        filtered.forEach((film) => {
          expect(film.brand).toBe('Kodak');
        });
      });
    });

    it('should search by film name', async () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setSearchQuery('tri-x');
      });

      await waitFor(() => {
        const filtered = result.current.filteredFilms;
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered[0].name).toBe('Tri-X 400');
      });
    });

    it('should search by partial film name', async () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setSearchQuery('hp5');
      });

      await waitFor(() => {
        const filtered = result.current.filteredFilms;
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered[0].name).toBe('HP5 Plus');
      });
    });

    it('should search by description keywords', async () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setSearchQuery('portrait');
      });

      await waitFor(() => {
        const filtered = result.current.filteredFilms;
        expect(filtered.length).toBeGreaterThan(0);
        // Should find Portra (portrait film)
        expect(filtered.some((f) => f.name === 'Portra 400')).toBe(true);
      });
    });

    it('should return no results for non-matching query', async () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setSearchQuery('nonexistentfilm');
      });

      await waitFor(() => {
        expect(result.current.filteredFilms).toHaveLength(0);
      });
    });

    it('should clear search results when query is empty', async () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setSearchQuery('kodak');
      });

      await waitFor(() => {
        expect(result.current.filteredFilms.length).toBeLessThan(
          mockFilms.length
        );
      });

      act(() => {
        result.current.setSearchQuery('');
      });

      await waitFor(() => {
        expect(result.current.filteredFilms).toHaveLength(mockFilms.length);
      });
    });
  });

  describe('Combined Filters', () => {
    it('should combine color type and ISO filters', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setColorTypeFilter('bw');
        result.current.setIsoSpeedFilter('400');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.colorType.toLowerCase()).toBe('bw');
        expect(film.isoSpeed).toBe(400);
      });

      // Should find B&W ISO 400 films
      expect(filtered.some((f) => f.name === 'HP5 Plus')).toBe(true);
      expect(filtered.some((f) => f.name === 'Tri-X 400')).toBe(true);

      // Should NOT include color ISO 400 films
      expect(filtered.some((f) => f.name === 'Portra 400')).toBe(false);
    });

    it('should combine brand and ISO filters', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setBrandFilter('Kodak');
        result.current.setIsoSpeedFilter('100');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.brand).toBe('Kodak');
        expect(film.isoSpeed).toBe(100);
      });

      expect(filtered.some((f) => f.name === 'Ektar 100')).toBe(true);
      expect(filtered.some((f) => f.name === 'T-Max 100')).toBe(true);
    });

    it('should combine brand and discontinued filters', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setBrandFilter('Kodak');
        result.current.setDiscontinuedFilter('discontinued');
      });

      const filtered = result.current.filteredFilms;
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((film) => {
        expect(film.brand).toBe('Kodak');
        expect(film.discontinued).toBe(true);
      });

      expect(filtered.some((f) => f.name === 'Plus-X')).toBe(true);
    });

    it('should combine search with other filters', async () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setColorTypeFilter('color');
        result.current.setSearchQuery('kodak');
      });

      await waitFor(() => {
        const filtered = result.current.filteredFilms;
        expect(filtered.length).toBeGreaterThan(0);
        filtered.forEach((film) => {
          expect(film.colorType.toLowerCase()).toBe('color');
          expect(film.brand).toBe('Kodak');
        });

        expect(filtered.some((f) => f.name === 'Portra 400')).toBe(true);
        expect(filtered.some((f) => f.name === 'Ektar 100')).toBe(true);
      });
    });

    it('should apply all filters together', async () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setColorTypeFilter('bw');
        result.current.setIsoSpeedFilter('400');
        result.current.setBrandFilter('Ilford');
        result.current.setDiscontinuedFilter('active');
        result.current.setSearchQuery('hp5');
      });

      await waitFor(() => {
        const filtered = result.current.filteredFilms;
        expect(filtered.length).toBeGreaterThan(0);

        // Should only find HP5 Plus
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('HP5 Plus');
      });
    });
  });

  describe('Filter State Management', () => {
    it('should clear all filters correctly', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      // Set all filters
      act(() => {
        result.current.setSearchQuery('kodak');
        result.current.setColorTypeFilter('color');
        result.current.setIsoSpeedFilter('400');
        result.current.setBrandFilter('Kodak');
        result.current.setDiscontinuedFilter('active');
      });

      // Verify filters are active
      expect(result.current.hasActiveFilters).toBe(true);

      // Clear all filters
      act(() => {
        result.current.clearFilters();
      });

      // All filter state should be reset
      expect(result.current.searchQuery).toBe('');
      expect(result.current.colorTypeFilter).toBe('');
      expect(result.current.isoSpeedFilter).toBe('');
      expect(result.current.brandFilter).toBe('');
      expect(result.current.discontinuedFilter).toBe('all');
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.filteredFilms).toHaveLength(mockFilms.length);
    });

    it('should correctly report hasActiveFilters when search is set', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setSearchQuery('kodak');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should correctly report hasActiveFilters when color filter is set', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setColorTypeFilter('bw');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should correctly report hasActiveFilters when discontinued filter is not "all"', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setDiscontinuedFilter('active');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should report no active filters when all are cleared', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      act(() => {
        result.current.setSearchQuery('kodak');
        result.current.setColorTypeFilter('Color');
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('Derived Options', () => {
    it('should generate brand options from film data', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      const brands = result.current.brandOptions;

      // Should include "All Brands" option
      expect(brands[0]).toEqual({ label: 'All Brands', value: '' });

      // Should include all unique brands sorted alphabetically
      expect(brands.some((b) => b.value === 'Fujifilm')).toBe(true);
      expect(brands.some((b) => b.value === 'Ilford')).toBe(true);
      expect(brands.some((b) => b.value === 'Kodak')).toBe(true);

      // Should be sorted alphabetically (after "All Brands")
      const brandValues = brands.slice(1).map((b) => b.value);
      const sortedValues = [...brandValues].sort((a, b) => a.localeCompare(b));
      expect(brandValues).toEqual(sortedValues);
    });

    it('should generate ISO options from film data', () => {
      const { result } = renderHook(() => useFilmDatabase(), { wrapper });

      const isos = result.current.isoOptions;

      // Should include "All ISOs" option
      expect(isos[0]).toEqual({ label: 'All ISOs', value: '' });

      // Should include all unique ISOs
      expect(isos.some((i) => i.value === '50')).toBe(true);
      expect(isos.some((i) => i.value === '100')).toBe(true);
      expect(isos.some((i) => i.value === '125')).toBe(true);
      expect(isos.some((i) => i.value === '400')).toBe(true);
      expect(isos.some((i) => i.value === '3200')).toBe(true);

      // Should be sorted numerically (after "All ISOs")
      const isoValues = isos.slice(1).map((i) => Number.parseInt(i.value));
      const sortedValues = [...isoValues].sort((a, b) => a - b);
      expect(isoValues).toEqual(sortedValues);
    });
  });
});
