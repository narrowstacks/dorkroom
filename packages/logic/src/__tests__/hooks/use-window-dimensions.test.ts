import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWindowDimensions } from '../../hooks/use-window-dimensions';

// Test constants
const INITIAL_WIDTH = 1024;
const INITIAL_HEIGHT = 768;
const DEBOUNCE_DELAY_MS = 150;
const TEST_TIMEOUT_MS = 300; // 2x debounce delay for safety

describe('useWindowDimensions', () => {
  beforeEach(() => {
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

    // Wait for debounce delay
    await waitFor(
      () => {
        expect(result.current.width).toBe(1200);
        expect(result.current.height).toBe(900);
      },
      { timeout: TEST_TIMEOUT_MS }
    );
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

    // Wait to ensure no update happens (slightly longer than debounce)
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY_MS + 50));

    // Should not update after unmount
    expect(result.current.width).toBe(initialWidth);
  });
});
