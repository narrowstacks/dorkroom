import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWindowDimensions } from '../../hooks/use-window-dimensions';

// Test constants
const INITIAL_WIDTH = 1024;
const INITIAL_HEIGHT = 768;
const DEBOUNCE_DELAY_MS = 150;

describe('useWindowDimensions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Mock initial window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: INITIAL_WIDTH,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: INITIAL_HEIGHT,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return initial window dimensions', () => {
    const { result } = renderHook(() => useWindowDimensions());

    expect(result.current.width).toBe(INITIAL_WIDTH);
    expect(result.current.height).toBe(INITIAL_HEIGHT);
  });

  it('should debounce resize events', async () => {
    const { result } = renderHook(() => useWindowDimensions());

    // Initial values
    expect(result.current.width).toBe(INITIAL_WIDTH);
    expect(result.current.height).toBe(INITIAL_HEIGHT);

    // Change window dimensions multiple times rapidly
    act(() => {
      window.innerWidth = 800;
      window.innerHeight = 600;
      window.dispatchEvent(new Event('resize'));
    });

    // Should not update immediately (debounced)
    expect(result.current.width).toBe(INITIAL_WIDTH);
    expect(result.current.height).toBe(INITIAL_HEIGHT);

    act(() => {
      window.innerWidth = 1200;
      window.innerHeight = 900;
      window.dispatchEvent(new Event('resize'));
    });

    // Still should not update (debounce period not elapsed)
    expect(result.current.width).toBe(INITIAL_WIDTH);
    expect(result.current.height).toBe(INITIAL_HEIGHT);

    // Advance timers by debounce delay to trigger the update
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
    });

    // Should now have the updated values (no need for waitFor with fake timers)
    expect(result.current.width).toBe(1200);
    expect(result.current.height).toBe(900);
  });

  it('should cleanup event listener on unmount', () => {
    // Spy must be created before renderHook to observe the cleanup call
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWindowDimensions());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });

  it('should cancel pending updates on unmount', async () => {
    const { result, unmount } = renderHook(() => useWindowDimensions());

    const initialWidth = result.current.width;

    act(() => {
      window.innerWidth = 2560;
      window.dispatchEvent(new Event('resize'));
    });

    // Unmount before debounce completes
    unmount();

    // Advance timers beyond debounce delay to ensure any pending timeout would have fired
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS + 50);
    });

    // Should not update after unmount
    expect(result.current.width).toBe(initialWidth);
  });
});
