import { columnCountForWidth } from '@dorkroom/logic';
import { type RefObject, useEffect, useState } from 'react';
import { RESIZE_DEBOUNCE_MS } from '../lib/resize-debounce';

/**
 * Card-grid column count from the container's width (not the viewport's),
 * stepping at the Tailwind breakpoints via `columnCountForWidth`.
 *
 * The first measurement is immediate; later resizes go through a debounced
 * `ResizeObserver` so rapid resizing cannot lock up the browser.
 *
 * @param containerRef - The scroll container whose width sets the columns
 * @param isMobile - Whether the page is in its mobile layout
 */
export function useColumnCount(
  containerRef: RefObject<HTMLDivElement | null>,
  isMobile: boolean
): number {
  const [observedColumnCount, setColumnCount] = useState(isMobile ? 2 : 3);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track mount state to prevent updates after unmount
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastColumnCount: number | null = null;

    const updateColumnCount = (width: number) => {
      const newColumnCount = columnCountForWidth(width, isMobile);
      // Skip update if column count hasn't changed
      if (lastColumnCount === newColumnCount) return;
      lastColumnCount = newColumnCount;
      setColumnCount(newColumnCount);
    };

    const debouncedUpdate = (width: number) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        if (isMounted) {
          updateColumnCount(width);
        }
        timeoutId = null;
      }, RESIZE_DEBOUNCE_MS);
    };

    const observer = new ResizeObserver((entries) => {
      // Prevent state updates if component unmounted during async callback
      if (!isMounted) return;

      for (const entry of entries) {
        debouncedUpdate(entry.contentRect.width);
      }
    });

    observer.observe(container);
    // Initial calculation (not debounced)
    updateColumnCount(container.clientWidth);

    return () => {
      isMounted = false; // Set flag first to prevent any in-flight callbacks
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      observer.disconnect();
    };
  }, [containerRef, isMobile]);

  return observedColumnCount;
}
