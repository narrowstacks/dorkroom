import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
      ({ currentState }) => useRecipeUrlState(mockFilms, mockDevelopers, currentState),
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
    const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
    expect(lastCall[2]).toContain('view=favorites');

    vi.useRealTimers();
  });
  
  it('should correctly sync view=favorites to URL', () => {
      // We need to use fake timers for the debounce in updateUrl
      vi.useFakeTimers();
      
      const { rerender } = renderHook(
        ({ currentState }) => useRecipeUrlState(mockFilms, mockDevelopers, currentState),
        {
            initialProps: { currentState: mockCurrentState }
        }
      );

      // Update state to favorites
      rerender({
          currentState: {
              ...mockCurrentState,
              favoritesOnly: true
          }
      });

      act(() => {
          vi.runAllTimers();
      });

      // Check if replaceState was called with view=favorites
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(lastCall[2]).toContain('view=favorites');
      
      vi.useRealTimers();
  });

  it('should correctly sync view=custom to URL', () => {
    vi.useFakeTimers();
    
    const { rerender } = renderHook(
      ({ currentState }) => useRecipeUrlState(mockFilms, mockDevelopers, currentState),
      {
          initialProps: { currentState: mockCurrentState }
      }
    );

    // Update state to custom
    rerender({
        currentState: {
            ...mockCurrentState,
            customRecipeFilter: 'only-custom'
        }
    });

    act(() => {
        vi.runAllTimers();
    });

    // Check if replaceState was called with view=custom
    const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
    expect(lastCall[2]).toContain('view=custom');
    
    vi.useRealTimers();
});
});



