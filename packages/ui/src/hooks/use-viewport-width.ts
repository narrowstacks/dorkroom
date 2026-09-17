import { useEffect, useState } from 'react';
import { hasGlobal } from '../lib/dom';

/**
 * Hook that tracks `window.innerWidth`, re-rendering on `resize`.
 *
 * On the client, initializes from the current viewport width as early as
 * possible. On the server (SSR/SSG), defaults to `0` to avoid touching
 * `window` before it exists; callers that need a non-zero fallback should
 * combine this with `hasGlobal('window')` or another SSR-safe check.
 */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => {
    if (!hasGlobal('window')) return 0;
    return window.innerWidth;
  });

  useEffect(() => {
    if (!hasGlobal('window')) {
      return;
    }

    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}
