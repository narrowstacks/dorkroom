import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useClearFilters } from '../useClearFilters';

describe('useClearFilters', () => {
  it('resets favoritesOnly in addition to the hook-owned filters (#327)', () => {
    const clearFilters = vi.fn();
    const setFavoritesOnly = vi.fn();

    const { result } = renderHook(() =>
      useClearFilters({ clearFilters, setFavoritesOnly })
    );

    result.current();

    expect(clearFilters).toHaveBeenCalledTimes(1);
    // This is the part of the fix that regresses to: ticking "Favorites
    // only" with no other filter active, then clicking "Clear filters",
    // silently does nothing (dorkroom/dorkroom#327).
    expect(setFavoritesOnly).toHaveBeenCalledTimes(1);
    expect(setFavoritesOnly).toHaveBeenCalledWith(false);
  });

  it('returns a stable callback across renders when its inputs are unchanged', () => {
    const clearFilters = vi.fn();
    const setFavoritesOnly = vi.fn();

    const { result, rerender } = renderHook((props) => useClearFilters(props), {
      initialProps: { clearFilters, setFavoritesOnly },
    });

    const first = result.current;
    rerender({ clearFilters, setFavoritesOnly });

    expect(result.current).toBe(first);
  });
});
