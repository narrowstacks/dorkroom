import { useState, useEffect } from 'react';

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
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function handleResize() {
      // Debounce resize events to avoid excessive re-renders
      // Standard 150ms delay provides good balance between responsiveness and performance
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
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
