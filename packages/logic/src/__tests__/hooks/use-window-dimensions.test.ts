import { renderHook, act, waitFor } from '@testing-library/react';
import { useWindowDimensions } from '../../hooks/use-window-dimensions';

describe('useWindowDimensions', () => {
  beforeEach(() => {
    // Mock initial window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it('should return initial window dimensions', () => {
    const { result } = renderHook(() => useWindowDimensions());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });

  it('should debounce resize events', async () => {
    const { result } = renderHook(() => useWindowDimensions());

    // Initial values
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);

    // Change window dimensions multiple times rapidly
    act(() => {
      window.innerWidth = 800;
      window.innerHeight = 600;
      window.dispatchEvent(new Event('resize'));
    });

    // Should not update immediately (debounced)
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);

    act(() => {
      window.innerWidth = 1200;
      window.innerHeight = 900;
      window.dispatchEvent(new Event('resize'));
    });

    // Still should not update (debounce period not elapsed)
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);

    // Wait for debounce delay (150ms)
    await waitFor(
      () => {
        expect(result.current.width).toBe(1200);
        expect(result.current.height).toBe(900);
      },
      { timeout: 300 }
    );
  });

  it('should update dimensions after debounce delay', async () => {
    const { result } = renderHook(() => useWindowDimensions());

    act(() => {
      window.innerWidth = 1920;
      window.innerHeight = 1080;
      window.dispatchEvent(new Event('resize'));
    });

    // Wait for debounce
    await waitFor(
      () => {
        expect(result.current.width).toBe(1920);
        expect(result.current.height).toBe(1080);
      },
      { timeout: 300 }
    );
  });

  it('should cleanup event listener on unmount', () => {
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

    // Wait to ensure no update happens
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should not update after unmount
    expect(result.current.width).toBe(initialWidth);
  });
});
