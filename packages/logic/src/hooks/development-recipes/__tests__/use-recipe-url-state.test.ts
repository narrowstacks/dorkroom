import type { Combination, Developer, Film } from '@dorkroom/api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type RecipeFilterState,
  useRecipeUrlState,
} from '../use-recipe-url-state';

// Mock window.location and history
const mockReplaceState = vi.fn();
const mockLocation = {
  pathname: '/development',
  search: '',
  hash: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

Object.defineProperty(window, 'history', {
  value: {
    replaceState: mockReplaceState,
  },
  writable: true,
});

describe('useRecipeUrlState', () => {
  const mockFilms: Film[] = [
    {
      id: 1,
      uuid: 'f1',
      slug: 'hp5',
      name: 'HP5',
      brand: 'Ilford',
      isoSpeed: 400,
      colorType: 'bw',
      grainStructure: 'classic',
      description: 'Classic film',
      manufacturerNotes: [],
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
      description: 'Standard dev',
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
  /** Props for the hook's async film/developer data, which arrives after mount. */
  interface RecipeDataProps {
    films: Film[];
    developers: Developer[];
  }
  const noRecipeData: RecipeDataProps = { films: [], developers: [] };
  const mockCurrentState: RecipeFilterState = {
    selectedFilm: null,
    selectedDeveloper: null,
    dilutionFilter: '',
    isoFilter: '',
    developerTypeFilter: '',
    favoritesOnly: false,
    customRecipeFilter: '',
  };

  beforeEach(() => {
    mockLocation.search = '';
    mockReplaceState.mockClear();
    vi.clearAllMocks();
  });

  it('should handle "view" parameter for favorites', () => {
    mockLocation.search = '?view=favorites';

    const { result } = renderHook(() =>
      useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
    );

    expect(result.current.initialUrlState.view).toBe('favorites');
  });

  it('should handle "view" parameter for custom recipes', () => {
    mockLocation.search = '?view=custom';

    const { result } = renderHook(() =>
      useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
    );

    expect(result.current.initialUrlState.view).toBe('custom');
  });

  it('should update URL when favoritesOnly state changes', () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(
      ({ currentState }) =>
        useRecipeUrlState(mockFilms, mockDevelopers, currentState),
      {
        initialProps: { currentState: mockCurrentState },
      }
    );

    // Simulate enabling favorites only
    rerender({
      currentState: {
        ...mockCurrentState,
        favoritesOnly: true,
      },
    });

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Check if replaceState was called
    expect(mockReplaceState).toHaveBeenCalled();
    const lastCall =
      mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
    expect(lastCall[2]).toContain('favorites=true');

    vi.useRealTimers();
  });

  it('should correctly sync favorites=true to URL', () => {
    // We need to use fake timers for the debounce in updateUrl
    vi.useFakeTimers();

    const { rerender } = renderHook(
      ({ currentState }) =>
        useRecipeUrlState(mockFilms, mockDevelopers, currentState),
      {
        initialProps: { currentState: mockCurrentState },
      }
    );

    // Update state to favorites
    rerender({
      currentState: {
        ...mockCurrentState,
        favoritesOnly: true,
      },
    });

    act(() => {
      vi.runAllTimers();
    });

    // Check if replaceState was called with favorites=true
    const lastCall =
      mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
    expect(lastCall[2]).toContain('favorites=true');

    vi.useRealTimers();
  });

  it('should correctly sync recipeType=only-custom to URL', () => {
    vi.useFakeTimers();

    const { rerender } = renderHook(
      ({ currentState }) =>
        useRecipeUrlState(mockFilms, mockDevelopers, currentState),
      {
        initialProps: { currentState: mockCurrentState },
      }
    );

    // Update state to custom
    rerender({
      currentState: {
        ...mockCurrentState,
        customRecipeFilter: 'only-custom',
      },
    });

    act(() => {
      vi.runAllTimers();
    });

    // Check if replaceState was called with recipeType=only-custom
    const lastCall =
      mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
    expect(lastCall[2]).toContain('recipeType=only-custom');

    vi.useRealTimers();
  });

  describe('error scenarios and edge cases', () => {
    it('should handle invalid film slug gracefully', () => {
      mockLocation.search = '?film=invalid-film-slug-123';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.selectedFilm).toBeUndefined();
    });

    it('should handle invalid developer slug gracefully', () => {
      mockLocation.search = '?developer=invalid-developer-slug-456';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.selectedDeveloper).toBeUndefined();
    });

    it('should handle excessively long slug', () => {
      const veryLongSlug = 'a'.repeat(200);
      mockLocation.search = `?film=${veryLongSlug}`;

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      // Should reject due to length validation
      expect(result.current.initialUrlState.selectedFilm).toBeUndefined();
    });

    it('should handle ISO value out of range (too low)', () => {
      mockLocation.search = '?iso=1';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.isoFilter).toBeUndefined();
    });

    it('should handle ISO value out of range (too high)', () => {
      mockLocation.search = '?iso=999999';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.isoFilter).toBeUndefined();
    });

    it('should handle non-numeric ISO value', () => {
      mockLocation.search = '?iso=not-a-number';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.isoFilter).toBeUndefined();
    });

    it('should handle invalid dilution format', () => {
      mockLocation.search = '?dilution=invalid-format';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBeUndefined();
    });

    it('should handle valid dilution format: stock', () => {
      // A developer is included because dilution is developer-relative and is
      // ignored without one (see 'orphaned sub-filter params' below) — this
      // test is about the format regex accepting "stock", not that guard.
      mockLocation.search = '?developer=dd-x&dilution=stock';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBe('stock');
    });

    it('should handle valid dilution format: 1:1', () => {
      mockLocation.search = '?developer=dd-x&dilution=1:1';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBe('1:1');
    });

    it('should handle valid dilution format: 1+1', () => {
      // URL encode + as %2B since + is decoded as space in URLs
      mockLocation.search = '?developer=dd-x&dilution=1%2B1';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBe('1+1');
    });

    it('should handle valid dilution format: 100', () => {
      mockLocation.search = '?developer=dd-x&dilution=100';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBe('100');
    });

    it('should handle invalid recipe ID format', () => {
      mockLocation.search = '?recipe=abc';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.recipeId).toBeUndefined();
    });

    it('should handle valid UUID recipe ID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockLocation.search = `?recipe=${validUuid}&source=share`;

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.recipeId).toBe(validUuid);
      expect(result.current.initialUrlState.isSharedApiRecipe).toBeUndefined();
    });

    // `fromShare` is what tells a link somebody handed over apart from the
    // canonical URL of a detail view you opened yourself. `isSharedApiRecipe`
    // cannot answer that: it additionally requires the film and developer
    // slugs, so a share link without them looks identical to a bookmark.
    it('should mark a source=share URL as coming from a share', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockLocation.search = `?recipe=${validUuid}&source=share`;

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.fromShare).toBe(true);
      expect(result.current.initialUrlState.isDirectSelection).toBeUndefined();
    });

    it('should not mark a bookmarked recipe URL as coming from a share', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockLocation.search = `?recipe=${validUuid}`;

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.fromShare).toBeUndefined();
      expect(result.current.initialUrlState.isDirectSelection).toBe(true);
    });

    it('should handle encoded custom recipe ID', () => {
      // Suppress expected console.error from invalid base64 decode attempt
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const encodedRecipe = 'a'.repeat(100); // Long base64-like string
      mockLocation.search = `?recipe=${encodedRecipe}&source=share`;

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.recipeId).toBe(encodedRecipe);

      errorSpy.mockRestore();
    });

    // Regression for #323: an out-of-range shared recipe must surface as an
    // invalid link, not decode as valid and crash the page during render.
    it('reports an out-of-range shared custom recipe as invalid', async () => {
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const outOfRange = {
        name: 'x',
        filmId: 'a',
        developerId: 'b',
        temperatureF: 250,
        timeMinutes: 8,
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: false,
      };
      const encodedRecipe = Buffer.from(JSON.stringify(outOfRange), 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      mockLocation.search = `?recipe=${encodedRecipe}&source=share`;

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      await waitFor(() => {
        expect(result.current.sharedRecipeError).toBe(
          'Invalid custom recipe data'
        );
      });
      expect(result.current.sharedCustomRecipe).toBeNull();
      expect(result.current.isLoadingSharedRecipe).toBe(false);

      errorSpy.mockRestore();
    });

    // Regression for #323: the URL-sync effect drops `?recipe=` 300ms after
    // init, which re-ran the lookup and wiped the error, so the banner
    // vanished almost as soon as it appeared.
    describe('shared recipe outcome after URL cleanup', () => {
      const validShare = {
        name: 'Shared',
        filmId: 'f1',
        developerId: 'd1',
        temperatureF: 68,
        timeMinutes: 8,
        shootingIso: 400,
        pushPull: 0,
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: false,
      };
      const encodeShare = (recipe: typeof validShare): string =>
        Buffer.from(JSON.stringify(recipe), 'utf8')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

      let errorSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        vi.useFakeTimers();
        errorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);
        // Make the mocked replaceState actually move the URL, as the browser does.
        mockReplaceState.mockImplementation(
          (...args: Parameters<History['replaceState']>) => {
            mockLocation.search = new URL(
              String(args[2]),
              'http://localhost'
            ).search;
          }
        );
      });

      afterEach(() => {
        mockReplaceState.mockReset();
        errorSpy.mockRestore();
        vi.useRealTimers();
      });

      const renderAndSettle = async () => {
        const hook = renderHook(() =>
          useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
        );
        // Let the lookup run, then the debounced URL write, then the re-run.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        return hook;
      };

      it('keeps the invalid-link error after the recipe param is cleaned up', async () => {
        mockLocation.search = `?recipe=${encodeShare({ ...validShare, temperatureF: 250 })}&source=share`;

        const { result } = await renderAndSettle();

        expect(mockLocation.search).not.toContain('recipe=');
        expect(result.current.sharedRecipeError).toBe(
          'Invalid custom recipe data'
        );
        expect(result.current.isLoadingSharedRecipe).toBe(false);
      });

      it('clears the error when dismissed', async () => {
        mockLocation.search = `?recipe=${encodeShare({ ...validShare, pushPull: 9 })}&source=share`;

        const { result } = await renderAndSettle();
        expect(result.current.sharedRecipeError).not.toBeNull();

        act(() => {
          result.current.dismissSharedRecipeError();
        });

        expect(result.current.sharedRecipeError).toBeNull();
      });

      it('still loads a valid shared recipe and cleans up the param', async () => {
        mockLocation.search = `?recipe=${encodeShare(validShare)}&source=share`;

        const hook = renderHook(() =>
          useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
        );
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });

        expect(hook.result.current.sharedCustomRecipe?.name).toBe('Shared');
        expect(hook.result.current.sharedRecipeError).toBeNull();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });

        expect(mockLocation.search).not.toContain('recipe=');
        expect(hook.result.current.sharedRecipeError).toBeNull();
      });
    });

    it('should handle invalid view parameter', () => {
      mockLocation.search = '?view=invalid-view';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.view).toBeUndefined();
    });

    it('should handle malformed URL parameters', () => {
      mockLocation.search = '?film=<script>alert("xss")</script>';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.selectedFilm).toBeUndefined();
    });

    it('should handle special characters in slug', () => {
      mockLocation.search = '?film=test@#$%film';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.selectedFilm).toBeUndefined();
    });

    it('should handle empty film list', () => {
      mockLocation.search = '?film=hp5';

      const { result } = renderHook(() =>
        useRecipeUrlState([], mockDevelopers, mockCurrentState)
      );

      // When lists are empty, initial URL state will have shared recipe fields but no selections
      expect(result.current.initialUrlState.selectedFilm).toBeUndefined();
    });

    it('should handle empty developer list', () => {
      mockLocation.search = '?developer=dd-x';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, [], mockCurrentState)
      );

      // When lists are empty, initial URL state will have shared recipe fields but no selections
      expect(result.current.initialUrlState.selectedDeveloper).toBeUndefined();
    });

    it('should handle multiple invalid parameters at once', () => {
      mockLocation.search =
        '?film=invalid&developer=invalid&iso=abc&dilution=bad&view=wrong';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.selectedFilm).toBeUndefined();
      expect(result.current.initialUrlState.selectedDeveloper).toBeUndefined();
      expect(result.current.initialUrlState.isoFilter).toBeUndefined();
      expect(result.current.initialUrlState.dilutionFilter).toBeUndefined();
      expect(result.current.initialUrlState.view).toBeUndefined();
    });

    it('should handle mix of valid and invalid parameters', () => {
      mockLocation.search = '?film=hp5&developer=invalid&iso=400';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.selectedFilm).toBeDefined();
      expect(result.current.initialUrlState.selectedDeveloper).toBeUndefined();
      expect(result.current.initialUrlState.isoFilter).toBe('400');
    });

    it('should handle rapid URL updates without race conditions', () => {
      vi.useFakeTimers();

      const { rerender } = renderHook(
        ({ currentState }) =>
          useRecipeUrlState(mockFilms, mockDevelopers, currentState),
        {
          initialProps: { currentState: mockCurrentState },
        }
      );

      // Simulate rapid state changes
      rerender({
        currentState: { ...mockCurrentState, isoFilter: '100' },
      });

      rerender({
        currentState: { ...mockCurrentState, isoFilter: '200' },
      });

      rerender({
        currentState: { ...mockCurrentState, isoFilter: '400' },
      });

      // Advance timers to process debounced updates
      act(() => {
        vi.runAllTimers();
      });

      // Should have the last value
      const lastCall =
        mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(lastCall[2]).toContain('iso=400');

      vi.useRealTimers();
    });

    it('should clean up debounce timeout on unmount', () => {
      vi.useFakeTimers();

      const { unmount, rerender } = renderHook(
        ({ currentState }) =>
          useRecipeUrlState(mockFilms, mockDevelopers, currentState),
        {
          initialProps: { currentState: mockCurrentState },
        }
      );

      rerender({
        currentState: { ...mockCurrentState, isoFilter: '400' },
      });

      // Unmount before timeout fires
      unmount();

      // Should not throw or cause issues
      act(() => {
        vi.runAllTimers();
      });

      vi.useRealTimers();
    });

    it('should handle shared recipe error state', async () => {
      // Map with a different recipe ID, so the requested one won't be found
      const otherRecipe: Combination = {
        id: 1,
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        name: 'HP5 in DD-X',
        filmStockId: 'f1',
        filmSlug: 'hp5',
        developerId: 'd1',
        developerSlug: 'dd-x',
        shootingIso: 400,
        dilutionId: null,
        customDilution: '1+4',
        temperatureC: 20,
        temperatureF: 68,
        timeMinutes: 9,
        agitationMethod: 'inversion',
        agitationSchedule: null,
        pushPull: null,
        tags: null,
        notes: null,
        infoSource: null,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };
      const mockRecipesByUuid = new Map([[otherRecipe.uuid, otherRecipe]]);
      const recipeId = '550e8400-e29b-41d4-a716-446655440000';
      mockLocation.search = `?recipe=${recipeId}&source=share&film=hp5&developer=dd-x`;

      const { result } = renderHook(() =>
        useRecipeUrlState(
          mockFilms,
          mockDevelopers,
          mockCurrentState,
          mockRecipesByUuid
        )
      );

      // Wait for async lookup to complete and error to be set
      await waitFor(
        () => {
          return (
            !result.current.isLoadingSharedRecipe &&
            result.current.sharedRecipeError !== null
          );
        },
        { timeout: 2000 }
      );

      expect(result.current.sharedRecipeError).toBeTruthy();
      expect(result.current.sharedRecipeError).toContain('not found');
    });

    it('should handle source parameter without recipe parameter', () => {
      mockLocation.search = '?source=share&film=hp5';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.hasSharedRecipe).toBe(false);
      expect(result.current.sharedRecipe).toBeNull();
    });
  });

  describe('URL state synchronization edge cases', () => {
    it('should clear URL parameters when state is reset', () => {
      vi.useFakeTimers();

      // Annotated, not asserted: renderHook infers its prop type from this first
      // value, and an un-annotated `selectedFilm` would narrow to the film
      // literal and reject the `null` the reset rerender passes below.
      const initialState: RecipeFilterState = {
        ...mockCurrentState,
        selectedFilm: mockFilms[0],
        isoFilter: '400',
      };

      const { rerender } = renderHook(
        ({ currentState }) =>
          useRecipeUrlState(mockFilms, mockDevelopers, currentState),
        { initialProps: { currentState: initialState } }
      );

      // Reset state
      rerender({
        currentState: {
          ...mockCurrentState,
          selectedFilm: null,
          isoFilter: '',
        },
      });

      act(() => {
        vi.runAllTimers();
      });

      const lastCall =
        mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(lastCall[2]).not.toContain('film=');
      expect(lastCall[2]).not.toContain('iso=');

      vi.useRealTimers();
    });

    it('should handle case-sensitive slug validation', () => {
      mockLocation.search = '?film=HP5'; // Uppercase

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      // Should not match due to case sensitivity
      expect(result.current.initialUrlState.selectedFilm).toBeUndefined();
    });

    it('should remove ISO parameter from URL when cleared', () => {
      vi.useFakeTimers();

      const { rerender } = renderHook(
        ({ currentState }) =>
          useRecipeUrlState(mockFilms, mockDevelopers, currentState),
        {
          initialProps: {
            currentState: {
              ...mockCurrentState,
              isoFilter: '400',
            },
          },
        }
      );

      // Clear ISO filter
      rerender({
        currentState: {
          ...mockCurrentState,
          isoFilter: '',
        },
      });

      act(() => {
        vi.runAllTimers();
      });

      const lastCall =
        mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      // URL should NOT contain 'iso=' at all
      expect(lastCall[2]).not.toContain('iso=');
      // And definitely should not contain 'iso=' with empty value
      expect(lastCall[2]).not.toMatch(/iso=(&|$)/);

      vi.useRealTimers();
    });

    it('should remove dilution parameter from URL when cleared', () => {
      vi.useFakeTimers();

      const { rerender } = renderHook(
        ({ currentState }) =>
          useRecipeUrlState(mockFilms, mockDevelopers, currentState),
        {
          initialProps: {
            currentState: {
              ...mockCurrentState,
              dilutionFilter: '1:1',
            },
          },
        }
      );

      // Clear dilution filter
      rerender({
        currentState: {
          ...mockCurrentState,
          dilutionFilter: '',
        },
      });

      act(() => {
        vi.runAllTimers();
      });

      const lastCall =
        mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      // URL should NOT contain 'dilution=' at all
      expect(lastCall[2]).not.toContain('dilution=');

      vi.useRealTimers();
    });

    it('should properly set ISO parameter as string in URL', () => {
      vi.useFakeTimers();

      const { rerender } = renderHook(
        ({ currentState }) =>
          useRecipeUrlState(mockFilms, mockDevelopers, currentState),
        {
          initialProps: { currentState: mockCurrentState },
        }
      );

      // Set ISO filter (even though it's a number, it should be stringified)
      rerender({
        currentState: {
          ...mockCurrentState,
          isoFilter: '800',
        },
      });

      act(() => {
        vi.runAllTimers();
      });

      const lastCall =
        mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(lastCall[2]).toContain('iso=800');

      vi.useRealTimers();
    });
  });

  describe('orphaned sub-filter params', () => {
    it('ignores box speed with no film in the URL', () => {
      mockLocation.search = '?iso=boxspeed';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      // Box speed is relative to a film; on its own it cannot mean anything, so
      // it must not land in state where it would be invisible and inert.
      expect(result.current.initialUrlState.isoFilter).toBeUndefined();
    });

    it('keeps a numeric ISO with no film in the URL', () => {
      mockLocation.search = '?iso=400';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.isoFilter).toBe('400');
    });

    it('canonicalizes a numeric-prefixed ISO to the parsed integer instead of storing the raw string', () => {
      mockLocation.search = '?iso=400abc';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      // parseInt('400abc', 10) === 400, which is in range, so the value must
      // be accepted — but it must be normalised to '400', not stored as the
      // raw 'iso=400abc' string, which the equality filter would never match.
      expect(result.current.initialUrlState.isoFilter).toBe('400');
    });

    it('ignores a dilution with no developer in the URL', () => {
      mockLocation.search = '?dilution=1%2B9';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBeUndefined();
    });

    it('strips a lone orphaned iso=boxspeed param from the URL once film/developer data arrives', () => {
      // Films/developers load asynchronously in the real app: the hook first
      // mounts with empty lists (initialUrlState stays {}, so the hook never
      // initializes), then re-renders once the lists arrive. currentState
      // itself never changes across this transition, because the orphan iso
      // param never gets applied to it — so a fix that only re-syncs the URL
      // when currentState.* changes would miss this entirely.
      vi.useFakeTimers();
      mockLocation.search = '?iso=boxspeed';

      const { rerender } = renderHook(
        ({ films, developers }) =>
          useRecipeUrlState(films, developers, mockCurrentState),
        { initialProps: noRecipeData }
      );

      rerender({ films: mockFilms, developers: mockDevelopers });

      act(() => {
        vi.runAllTimers();
      });

      // The orphan param is never applied to state, so nothing else would ever
      // trigger a URL rewrite — the canonical URL must still be written once
      // after initialization so the stale param doesn't linger.
      expect(mockReplaceState).toHaveBeenCalled();
      const lastCall =
        mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(lastCall[2]).not.toContain('iso');

      vi.useRealTimers();
    });

    it('strips a lone orphaned dilution param from the URL once film/developer data arrives', () => {
      vi.useFakeTimers();
      mockLocation.search = '?dilution=1%2B9';

      const { rerender } = renderHook(
        ({ films, developers }) =>
          useRecipeUrlState(films, developers, mockCurrentState),
        { initialProps: noRecipeData }
      );

      rerender({ films: mockFilms, developers: mockDevelopers });

      act(() => {
        vi.runAllTimers();
      });

      expect(mockReplaceState).toHaveBeenCalled();
      const lastCall =
        mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(lastCall[2]).not.toContain('dilution');

      vi.useRealTimers();
    });
  });
});
