/**
 * What the virtualized results lists on /films and /development share. List
 * specifics such as row heights stay beside each list.
 */

import { RESIZE_DEBOUNCE_MS } from './resize-debounce';

/**
 * Default container height for virtualized lists.
 * Calculated as: 100dvh - header (64px) - filters (120px) - pagination (96px)
 */
export const DEFAULT_CONTAINER_HEIGHT = 'calc(100dvh - 280px)';

/**
 * Minimum container height to prevent layout collapse on small screens.
 */
export const MIN_CONTAINER_HEIGHT = '400px';

/**
 * Maximum container height to prevent over-expansion.
 * Calculated as: 100dvh - minimal header/footer (120px)
 */
export const MAX_CONTAINER_HEIGHT = 'calc(100dvh - 120px)';

/**
 * Type for the rect object used by TanStack Virtual's observeElementRect.
 */
export interface VirtualizerRect {
  width: number;
  height: number;
}

/**
 * Creates a debounced observeElementRect function for TanStack Virtual.
 * This prevents browser lockups during rapid window resizing by batching
 * resize observations.
 *
 * @param debounceMs - Debounce delay in milliseconds (default: RESIZE_DEBOUNCE_MS)
 * @returns A function compatible with TanStack Virtual's observeElementRect option
 */
export function createDebouncedObserveElementRect(
  debounceMs: number = RESIZE_DEBOUNCE_MS
) {
  return <T extends Element>(
    instance: { options: { getScrollElement: () => T | null } },
    cb: (rect: VirtualizerRect) => void
  ): (() => void) | undefined => {
    const element = instance.options.getScrollElement();
    if (!element) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastRect: VirtualizerRect | null = null;

    const updateRect = (rect: VirtualizerRect) => {
      // Skip if dimensions haven't changed
      if (
        lastRect &&
        lastRect.width === rect.width &&
        lastRect.height === rect.height
      ) {
        return;
      }
      lastRect = rect;
      cb(rect);
    };

    const debouncedUpdate = (rect: VirtualizerRect) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        updateRect(rect);
        timeoutId = null;
      }, debounceMs);
    };

    // Initial measurement (not debounced)
    const initialRect = element.getBoundingClientRect();
    updateRect({ width: initialRect.width, height: initialRect.height });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        debouncedUpdate({ width, height });
      }
    });

    observer.observe(element);

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      observer.disconnect();
    };
  };
}

/**
 * Resize observation for `useVirtualizer`. Its debounce state lives in each
 * call, so one instance serves every list.
 */
export const debouncedObserveElementRect = createDebouncedObserveElementRect();

/** Space above and below the rendered rows, for spacers or list padding. */
export function getVirtualPadding(
  virtualRows: readonly { start: number; end: number }[],
  totalSize: number
) {
  const first = virtualRows[0];
  const last = virtualRows[virtualRows.length - 1];
  return {
    paddingTop: first?.start ?? 0,
    paddingBottom: last ? totalSize - last.end : 0,
  };
}
