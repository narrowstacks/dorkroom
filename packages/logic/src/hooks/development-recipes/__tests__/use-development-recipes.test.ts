import type { Combination, Developer, Film } from '@dorkroom/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '../../../queries/query-keys';
import { useDevelopmentRecipes } from '../use-development-recipes';

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
    description: 'Classic B&W film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    aliases: [],
    baseFilmSlug: null,
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
    description: 'Iconic high-speed B&W film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    aliases: [],
    baseFilmSlug: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 3,
    uuid: 'f3',
    slug: 'neopan-400',
    brand: 'Fujifilm',
    name: 'Neopan 400',
    colorType: 'bw',
    isoSpeed: 400,
    grainStructure: 'classic',
    description: 'Classic B&W film',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    aliases: [],
    baseFilmSlug: null,
    dateAdded: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
];

const mockDevelopers: Developer[] = [
  {
    id: 1,
    uuid: 'd1',
    slug: 'dd-x',
    name: 'DD-X',
    manufacturer: 'Ilford',
    type: 'liquid',
    description: 'Standard developer',
    filmOrPaper: true,
    dilutions: [],
    mixingInstructions: null,
    storageRequirements: null,
    safetyNotes: null,
    notes: null,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 2,
    uuid: 'd2',
    slug: 'd-76',
    name: 'D-76',
    manufacturer: 'Kodak',
    type: 'powder',
    description: 'Classic developer',
    filmOrPaper: true,
    dilutions: [],
    mixingInstructions: null,
    storageRequirements: null,
    safetyNotes: null,
    notes: null,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 3,
    uuid: 'd3',
    slug: 'rodinal',
    name: 'Rodinal',
    manufacturer: 'Adox',
    type: 'liquid',
    description: 'High-acutance developer',
    filmOrPaper: true,
    dilutions: [],
    mixingInstructions: null,
    storageRequirements: null,
    safetyNotes: null,
    notes: null,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
];

const createCombination = (overrides: Partial<Combination>): Combination => ({
  id: 0,
  uuid: 'c0',
  name: 'combo',
  filmStockId: 'f1',
  filmSlug: 'hp5-plus',
  developerId: 'd1',
  developerSlug: 'dd-x',
  shootingIso: 400,
  dilutionId: null,
  customDilution: null,
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 8,
  agitationMethod: 'continuous',
  agitationSchedule: null,
  pushPull: 0,
  tags: [],
  notes: null,
  infoSource: null,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
  ...overrides,
});

// 6 combinations pairing the 3 films/developers above two ways each, so
// grouped-by-name sort assertions have exactly two rows per brand/manufacturer.
const mockCombinations: Combination[] = [
  createCombination({
    id: 1,
    uuid: 'c1',
    filmStockId: 'f1',
    filmSlug: 'hp5-plus',
    developerId: 'd1',
    developerSlug: 'dd-x',
    timeMinutes: 8,
    temperatureF: 68,
    shootingIso: 400,
    tags: ['pull'],
  }),
  createCombination({
    id: 2,
    uuid: 'c2',
    filmStockId: 'f2',
    filmSlug: 'tri-x-400',
    developerId: 'd2',
    developerSlug: 'd-76',
    timeMinutes: 10,
    temperatureF: 70,
    shootingIso: 200,
    tags: ['push'],
  }),
  createCombination({
    id: 3,
    uuid: 'c3',
    filmStockId: 'f3',
    filmSlug: 'neopan-400',
    developerId: 'd3',
    developerSlug: 'rodinal',
    timeMinutes: 6,
    temperatureF: 65,
    shootingIso: 800,
    tags: [],
  }),
  createCombination({
    id: 4,
    uuid: 'c4',
    filmStockId: 'f1',
    filmSlug: 'hp5-plus',
    developerId: 'd2',
    developerSlug: 'd-76',
    timeMinutes: 12,
    temperatureF: 72,
    shootingIso: 1600,
    tags: ['stand'],
  }),
  createCombination({
    id: 5,
    uuid: 'c5',
    filmStockId: 'f2',
    filmSlug: 'tri-x-400',
    developerId: 'd3',
    developerSlug: 'rodinal',
    timeMinutes: 5,
    temperatureF: 68,
    shootingIso: 100,
    tags: [],
  }),
  createCombination({
    id: 6,
    uuid: 'c6',
    filmStockId: 'f3',
    filmSlug: 'neopan-400',
    developerId: 'd1',
    developerSlug: 'dd-x',
    timeMinutes: 9,
    temperatureF: 69,
    shootingIso: 400,
    tags: ['pull'],
  }),
];

describe('useDevelopmentRecipes', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Data that never goes stale resolves every query without a fetch.
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      },
    });
    queryClient.setQueryData(queryKeys.films.list(), mockFilms);
    queryClient.setQueryData(queryKeys.developers.list(), mockDevelopers);
    queryClient.setQueryData(queryKeys.combinations.list(), mockCombinations);
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe('getFilmById', () => {
    it('resolves by slug', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });
      expect(result.current.getFilmById('hp5-plus')?.uuid).toBe('f1');
    });

    it('resolves by uuid', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });
      expect(result.current.getFilmById('f2')?.slug).toBe('tri-x-400');
    });

    it('resolves by numeric id string', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });
      expect(result.current.getFilmById('3')?.slug).toBe('neopan-400');
    });

    it('returns undefined for an unknown key', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });
      expect(result.current.getFilmById('does-not-exist')).toBeUndefined();
    });
  });

  describe('getDeveloperById', () => {
    it('resolves by slug', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });
      expect(result.current.getDeveloperById('dd-x')?.uuid).toBe('d1');
    });

    it('resolves by uuid', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });
      expect(result.current.getDeveloperById('d2')?.slug).toBe('d-76');
    });

    it('resolves by id string', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });
      expect(result.current.getDeveloperById('3')?.slug).toBe('rodinal');
    });

    it('returns undefined for an unknown key', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });
      expect(result.current.getDeveloperById('does-not-exist')).toBeUndefined();
    });
  });

  describe('sorting', () => {
    it('sorts by film name (brand + name) ascending by default', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      expect(result.current.sortBy).toBe('filmName');
      expect(result.current.sortDirection).toBe('asc');
      expect(result.current.filteredCombinations.map((c) => c.uuid)).toEqual([
        'c3',
        'c6',
        'c1',
        'c4',
        'c2',
        'c5',
      ]);
    });

    it('reverses film name order when sortDirection is desc', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      act(() => {
        result.current.setSortDirection('desc');
      });

      expect(result.current.filteredCombinations.map((c) => c.uuid)).toEqual([
        'c2',
        'c5',
        'c1',
        'c4',
        'c3',
        'c6',
      ]);
    });

    it('handleSort sorts timeMinutes ascending, then flips to descending', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      act(() => {
        result.current.handleSort('timeMinutes');
      });

      expect(result.current.sortBy).toBe('timeMinutes');
      expect(result.current.sortDirection).toBe('asc');
      expect(result.current.filteredCombinations.map((c) => c.uuid)).toEqual([
        'c5',
        'c3',
        'c1',
        'c6',
        'c2',
        'c4',
      ]);

      act(() => {
        result.current.handleSort('timeMinutes');
      });

      expect(result.current.sortDirection).toBe('desc');
      expect(result.current.filteredCombinations.map((c) => c.uuid)).toEqual([
        'c4',
        'c2',
        'c6',
        'c1',
        'c3',
        'c5',
      ]);
    });
  });

  describe('getAvailableTags', () => {
    it('returns "All tags" first plus the distinct sorted tags from fixtures', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      expect(result.current.getAvailableTags()).toEqual([
        { label: 'All tags', value: '' },
        { label: 'custom', value: 'custom' },
        { label: 'pull', value: 'pull' },
        { label: 'push', value: 'push' },
        { label: 'stand', value: 'stand' },
      ]);
    });

    it('returns the same array reference on consecutive calls (memoization guard)', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      const first = result.current.getAvailableTags();
      const second = result.current.getAvailableTags();
      expect(first).toBe(second);
    });
  });

  describe('free-text search', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    /** Waits out the hook's real 300ms search debounce. */
    const flushSearchDebounce = () => {
      act(() => {
        vi.advanceTimersByTime(300);
      });
    };

    it('returns the unfiltered list when the query is empty', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.filteredCombinations).toHaveLength(
        mockCombinations.length
      );
    });

    it('filters combinations to those matching a film name', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      act(() => {
        result.current.setSearchQuery('hp5');
      });
      flushSearchDebounce();

      // HP5 Plus (f1) appears in combinations c1 and c4 only
      expect(
        result.current.filteredCombinations.map((c) => c.uuid).toSorted()
      ).toEqual(['c1', 'c4']);
    });

    it('filters combinations to those matching a developer name', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      act(() => {
        result.current.setSearchQuery('rodinal');
      });
      flushSearchDebounce();

      // Rodinal (d3) appears in combinations c3 and c5 only
      expect(
        result.current.filteredCombinations.map((c) => c.uuid).toSorted()
      ).toEqual(['c3', 'c5']);
    });

    it('is punctuation- and word-break-insensitive ("tri x" matches "Tri-X 400")', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      act(() => {
        result.current.setSearchQuery('tri x');
      });
      flushSearchDebounce();

      // Tri-X 400 (f2) appears in combinations c2 and c5 only
      expect(
        result.current.filteredCombinations.map((c) => c.uuid).toSorted()
      ).toEqual(['c2', 'c5']);
    });

    it('returns no combinations for a non-matching query', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      act(() => {
        result.current.setSearchQuery('nonexistent-film-or-developer');
      });
      flushSearchDebounce();

      expect(result.current.filteredCombinations).toHaveLength(0);
    });

    it('clearFilters resets the search query and unfilters the list', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      act(() => {
        result.current.setSearchQuery('hp5');
      });
      flushSearchDebounce();
      expect(result.current.filteredCombinations.length).toBeLessThan(
        mockCombinations.length
      );

      act(() => {
        result.current.clearFilters();
      });
      flushSearchDebounce();

      expect(result.current.searchQuery).toBe('');
      expect(result.current.filteredCombinations).toHaveLength(
        mockCombinations.length
      );
    });

    it('combines with an existing dropdown filter (selected film) rather than replacing it', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), {
        wrapper,
      });

      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // HP5 Plus
        result.current.setSearchQuery('dd-x');
      });
      flushSearchDebounce();

      // Of HP5 Plus's combinations (c1, c4), only c1 pairs with DD-X
      expect(result.current.filteredCombinations.map((c) => c.uuid)).toEqual([
        'c1',
      ]);
    });
  });

  describe('getAvailableISOs', () => {
    it('offers every catalogue ISO when no film is selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      expect(result.current.getAvailableISOs()).toEqual([
        { label: 'All ISOs', value: '' },
        { label: '100', value: '100' },
        { label: '200', value: '200' },
        { label: '400', value: '400' },
        { label: '800', value: '800' },
        { label: '1600', value: '1600' },
      ]);
    });

    it('narrows to the selected film’s own ISOs, plus box speed', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // HP5 Plus
      });

      // HP5 Plus's own combinations are c1 (400) and c4 (1600); other films'
      // ISOs (200, 800, 100) are not offered once a film narrows the list.
      expect(result.current.getAvailableISOs()).toEqual([
        { label: 'All ISOs', value: '' },
        { label: 'Box speed (400)', value: 'boxspeed' },
        { label: '400', value: '400' },
        { label: '1600', value: '1600' },
      ]);
    });

    it('unions a carried-over numeric isoFilter the selected film does not offer', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      // Select the film first, then set an ISO the film doesn't offer, to
      // simulate an ISO surviving a later film change (setSelectedFilm no
      // longer clears isoFilter).
      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // HP5 Plus
      });
      act(() => {
        result.current.setIsoFilter('800'); // HP5 has no 800 combination
      });

      expect(result.current.getAvailableISOs()).toEqual([
        { label: 'All ISOs', value: '' },
        { label: 'Box speed (400)', value: 'boxspeed' },
        { label: '400', value: '400' },
        { label: '800', value: '800' },
        { label: '1600', value: '1600' },
      ]);
    });

    it('unions a carried-over numeric isoFilter set before any film is selected, and keeps it selected once a non-offering film is chosen', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      // The real user journey the union exists for: set an ISO with no film
      // selected yet, then pick a film that doesn't offer that ISO. The ISO
      // must remain visible in the options and remain the selected value.
      act(() => {
        result.current.setIsoFilter('160'); // Not in the catalogue at all
      });

      expect(result.current.getAvailableISOs()).toEqual([
        { label: 'All ISOs', value: '' },
        { label: '100', value: '100' },
        { label: '160', value: '160' },
        { label: '200', value: '200' },
        { label: '400', value: '400' },
        { label: '800', value: '800' },
        { label: '1600', value: '1600' },
      ]);

      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // HP5 Plus, no 160 combination
      });

      expect(result.current.isoFilter).toBe('160');
      expect(result.current.getAvailableISOs()).toEqual([
        { label: 'All ISOs', value: '' },
        { label: 'Box speed (400)', value: 'boxspeed' },
        { label: '160', value: '160' },
        { label: '400', value: '400' },
        { label: '1600', value: '1600' },
      ]);
    });

    it('unions a carried-over numeric isoFilter with no film selected, even when not in the catalogue', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setIsoFilter('160'); // Valid ISO, but no fixture recipe is shot at it
      });

      expect(result.current.getAvailableISOs()).toContainEqual({
        label: '160',
        value: '160',
      });
    });

    it('does not union isoFilter="boxspeed" into the numeric options', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // HP5 Plus
      });
      act(() => {
        result.current.setIsoFilter('boxspeed');
      });

      expect(result.current.getAvailableISOs()).toEqual([
        { label: 'All ISOs', value: '' },
        { label: 'Box speed (400)', value: 'boxspeed' },
        { label: '400', value: '400' },
        { label: '1600', value: '1600' },
      ]);
    });
  });

  describe('ISO filtering without a film', () => {
    it('filters on a numeric ISO with no film selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setIsoFilter('400');
      });

      // hp5-plus/400 and neopan-400/400 — across two different films.
      expect(result.current.filteredCombinations).toHaveLength(2);
      expect(
        result.current.filteredCombinations.every(
          (combo) => combo.shootingIso === 400
        )
      ).toBe(true);
    });

    it('treats box speed as a no-op with no film selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });
      const total = result.current.filteredCombinations.length;

      act(() => {
        result.current.setIsoFilter('boxspeed');
      });

      // Box speed means "this film's rated speed" — with no film there is
      // nothing to compare against, so it must not silently drop everything.
      expect(result.current.filteredCombinations).toHaveLength(total);
    });

    it('still resolves box speed against the selected film', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // hp5-plus, rated 400
      });
      act(() => {
        result.current.setIsoFilter('boxspeed');
      });

      // Of HP5's two recipes (400 and 1600), only the 400 is at box speed.
      expect(result.current.filteredCombinations).toHaveLength(1);
      expect(result.current.filteredCombinations[0].shootingIso).toBe(400);
    });
  });

  describe('ISO survives a film change', () => {
    it('keeps the ISO filter when a film is selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setIsoFilter('400');
      });
      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // hp5-plus
      });

      // A top-level filter must not be silently reset by another control.
      expect(result.current.isoFilter).toBe('400');
      // HP5 has exactly one recipe at ISO 400.
      expect(result.current.filteredCombinations).toHaveLength(1);
    });

    it('still clears the dilution filter when a developer is selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setDilutionFilter('1+9');
      });
      act(() => {
        result.current.setSelectedDeveloper(mockDevelopers[0]);
      });

      // Dilution stays a sub-filter of developer — this behaviour is deliberate.
      expect(result.current.dilutionFilter).toBe('');
    });
  });
});
