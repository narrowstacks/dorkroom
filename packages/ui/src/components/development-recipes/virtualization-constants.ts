/**
 * Virtualization layout constants for development recipe components.
 * These values are calibrated for the development recipes UI layout.
 */

/**
 * Estimated height for each table row in pixels.
 * Accounts for:
 * - Film info line with inline tags (~24px)
 * - Developer info (~24px)
 * - Padding (8px top + 8px bottom)
 * Total: ~48px for typical row
 */
export const TABLE_ROW_ESTIMATED_HEIGHT = 48;

/**
 * Number of rows to render above/below the visible viewport.
 * Higher values reduce scroll flicker but increase DOM size.
 */
export const TABLE_OVERSCAN = 5;

/**
 * Estimated height for each card row in pixels.
 * Accounts for:
 * - Header section with film/developer names (~48px)
 * - Tags/badges row (~24px)
 * - 2x2 stats grid (ISO, Time, Temp, Dilution) (~96px)
 * - Source link and action buttons (~36px)
 * - Padding (~36px)
 * - Row gap to match horizontal gap-4 (~16px)
 * Total: ~256px for typical card row
 */
export const CARD_ROW_ESTIMATED_HEIGHT = 240;

/**
 * Number of card rows to render above/below the visible viewport.
 * Cards are larger than table rows, so less overscan is needed.
 */
export const CARD_OVERSCAN = 2;

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
 * Debounce delay for resize observations in milliseconds.
 * This prevents the virtualizer from recalculating on every frame during
 * rapid window resizing, which can cause browser lockups.
 */
export const RESIZE_DEBOUNCE_MS = 100;

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
