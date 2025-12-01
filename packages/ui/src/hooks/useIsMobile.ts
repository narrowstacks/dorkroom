import { useEffect, useState } from 'react';

/**
 * Hook to detect if the viewport is mobile-sized
 * Uses matchMedia to listen for viewport changes
 *
 * On the client, initializes state from the media query as early as possible.
 * On the server (SSR/SSG), defaults to `false` to avoid hydration mismatches.
 *
 * @param maxWidth - Maximum width in pixels to be considered mobile (default: 768)
 * @returns boolean indicating if viewport is mobile-sized
 */
export function useIsMobile(maxWidth = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    // Fallback for older browsers
    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [maxWidth]);

  return isMobile;
}
