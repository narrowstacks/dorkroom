import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWindowDimensions } from '../../hooks/use-window-dimensions';

// Test constants
const INITIAL_WIDTH = 1337;
const INITIAL_HEIGHT = 777;
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

    // First resize at t=0
    act(() => {
      window.innerWidth = 800;
      window.innerHeight = 600;
      window.dispatchEvent(new Event('resize'));
    });

    // Should not update immediately (debounced)
    expect(result.current.width).toBe(INITIAL_WIDTH);
    expect(result.current.height).toBe(INITIAL_HEIGHT);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Second resize at t=100 restarts the debounce window
    act(() => {
      window.innerWidth = 1200;
      window.innerHeight = 900;
      window.dispatchEvent(new Event('resize'));
    });

    // t=150: the first resize's delay has elapsed, but the second one reset
    // it, so a working debounce has still not updated.
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.width).toBe(INITIAL_WIDTH);
    expect(result.current.height).toBe(INITIAL_HEIGHT);

    // t=250: a full delay after the second resize, so one update with the
    // latest values (the intermediate 800x600 is never rendered).
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS - 50);
    });
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

    // A resize left a debounce timer pending
    expect(vi.getTimerCount()).toBe(1);

    // Unmount before debounce completes
    unmount();

    // The pending debounce timer was cleared, not merely left to fire
    expect(vi.getTimerCount()).toBe(0);

    // Advance timers beyond debounce delay to ensure any pending timeout would have fired
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS + 50);
    });

    // Should not update after unmount
    expect(result.current.width).toBe(initialWidth);
  });
});
