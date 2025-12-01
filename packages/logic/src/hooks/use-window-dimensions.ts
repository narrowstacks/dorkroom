import { useEffect, useState } from 'react';

// Default dimensions for SSR environment
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 768;

// Debounce delay in milliseconds - standard value for good UX/performance balance
const RESIZE_DEBOUNCE_MS = 150;

/**
 * Hook that tracks the current window dimensions and updates on resize.
 * Provides SSR-safe default dimensions for server-side rendering.
 * Resize events are debounced with a 150ms delay to prevent excessive re-renders.
 *
 * @public
 * @returns Object containing current window width and height
 *
 * @example
 * ```typescript
 * const { width, height } = useWindowDimensions();
 *
 * // Use dimensions for responsive calculations
 * const isMobile = width < 768;
 * const maxPreviewSize = Math.min(width * 0.8, 400);
 * ```
 */
export function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : DEFAULT_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : DEFAULT_HEIGHT,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function handleResize() {
      // Debounce resize events to avoid excessive re-renders
      // Standard delay provides good balance between responsiveness and performance
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, RESIZE_DEBOUNCE_MS);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowDimensions;
}
