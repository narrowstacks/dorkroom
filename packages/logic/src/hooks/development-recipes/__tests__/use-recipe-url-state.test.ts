import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Combination } from '@dorkroom/api';
import { useRecipeUrlState } from '../use-recipe-url-state';

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
  const mockFilms = [
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
      dateAdded: '2023-01-01',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];
  const mockDevelopers = [
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
  const mockCurrentState = {
    selectedFilm: null,
    selectedDeveloper: null,
    dilutionFilter: '',
    isoFilter: '',
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
    expect(lastCall[2]).toContain('view=favorites');

    vi.useRealTimers();
  });

  it('should correctly sync view=favorites to URL', () => {
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

    // Check if replaceState was called with view=favorites
    const lastCall =
      mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
    expect(lastCall[2]).toContain('view=favorites');

    vi.useRealTimers();
  });

  it('should correctly sync view=custom to URL', () => {
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

    // Check if replaceState was called with view=custom
    const lastCall =
      mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
    expect(lastCall[2]).toContain('view=custom');

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
      mockLocation.search = '?dilution=stock';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBe('stock');
    });

    it('should handle valid dilution format: 1:1', () => {
      mockLocation.search = '?dilution=1:1';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBe('1:1');
    });

    it('should handle valid dilution format: 1+1', () => {
      // URL encode + as %2B since + is decoded as space in URLs
      mockLocation.search = '?dilution=1%2B1';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBe('1+1');
    });

    it('should handle valid dilution format: 100', () => {
      mockLocation.search = '?dilution=100';

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

    it('should handle encoded custom recipe ID', () => {
      const encodedRecipe = 'a'.repeat(100); // Long base64-like string
      mockLocation.search = `?recipe=${encodedRecipe}&source=share`;

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.recipeId).toBe(encodedRecipe);
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
      const mockRecipesByUuid = new Map([
        [
          '123e4567-e89b-12d3-a456-426614174000',
          {
            id: 1,
            filmId: 1,
            developerId: 1,
          } as unknown as Combination,
        ],
      ]);
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

      const { rerender } = renderHook(
        ({ currentState }) =>
          useRecipeUrlState(mockFilms, mockDevelopers, currentState),
        {
          initialProps: {
            currentState: {
              ...mockCurrentState,
              selectedFilm: mockFilms[0],
              isoFilter: '400',
            } as {
              selectedFilm: typeof mockFilms[0] | null;
              selectedDeveloper: typeof mockDevelopers[0] | null;
              dilutionFilter: string;
              isoFilter: string;
              favoritesOnly: boolean;
              customRecipeFilter: string;
            },
          },
        }
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
});
