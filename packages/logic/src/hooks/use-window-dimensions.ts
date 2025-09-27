import { useState, useEffect } from 'react';

/**
 * Hook that tracks the current window dimensions and updates on resize.
 * Provides SSR-safe default dimensions for server-side rendering.
 *
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
    function handleResize() {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}
