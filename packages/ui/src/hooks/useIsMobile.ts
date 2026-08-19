import { useEffect, useState } from 'react';
import { hasGlobal } from '../lib/dom';

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
    if (!hasGlobal('window')) return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  // Both subscribe paths below return a cleanup (removeEventListener / removeListener);
  // the rule is thrown by the browser-environment guard, whose early return subscribes to
  // nothing. Suppressed as a false positive rather than "fixed".
  // eslint-disable-next-line react-doctor/effect-needs-cleanup -- see above
  useEffect(() => {
    if (!hasGlobal('window')) {
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
