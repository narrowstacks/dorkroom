import type { Film } from '@dorkroom/api';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { Film as FilmIcon } from 'lucide-react';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import {
  createDebouncedObserveElementRect,
  DEFAULT_CONTAINER_HEIGHT,
  MAX_CONTAINER_HEIGHT,
  MIN_CONTAINER_HEIGHT,
  RESIZE_DEBOUNCE_MS,
} from '../development-recipes/virtualization-constants';
import { FilmCard } from './film-card';
import { FilmCardSkeleton } from './film-card-skeleton';

/** Tailwind breakpoint widths in pixels */
const BREAKPOINT_XL = 1280;
const BREAKPOINT_LG = 1024;
const BREAKPOINT_SM = 640;

/** Card height constants for virtualization */
const CARD_ROW_ESTIMATED_HEIGHT = 110; // Card height + small gap
const CARD_OVERSCAN = 3; // Number of rows to render above/below viewport

/**
 * Hook to calculate responsive column count based on container width
 * Matches Tailwind breakpoints: sm:640px, lg:1024px, xl:1280px
 *
 * Uses debounced ResizeObserver to prevent browser lockups during rapid resizing.
 */
function useResponsiveColumnCount(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean
): number {
  const [columnCount, setColumnCount] = useState(isMobile ? 2 : 3);

  useEffect(() => {
    if (isMobile) {
      setColumnCount(2);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const calculateColumns = (width: number): number => {
      // Match Tailwind breakpoints for grid-cols
      if (width >= BREAKPOINT_XL) return 4; // xl
      if (width >= BREAKPOINT_LG) return 3; // lg
      if (width >= BREAKPOINT_SM) return 2; // sm
      return 1;
    };

    // Track mount state to prevent updates after unmount
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastColumnCount: number | null = null;

    const updateColumnCount = (width: number) => {
      const newColumnCount = calculateColumns(width);
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
        const width = entry.contentRect.width;
        debouncedUpdate(width);
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

  return columnCount;
}

interface FilmResultsVirtualizedProps {
  films: Film[];
  selectedFilmId: string | null;
  onSelectFilm: (film: Film) => void;
  isMobile?: boolean;
  isLoading?: boolean;
  /** Whether a detail panel is open (affects column count on desktop) */
  isDetailOpen?: boolean;
  /** Whether filters are collapsed (affects column count on desktop) */
  isFiltersCollapsed?: boolean;
  /** Height of the virtualized container. Defaults to calc(100dvh - 280px) */
  height?: string;
  className?: string;
}

export const FilmResultsVirtualized: FC<FilmResultsVirtualizedProps> = ({
  films,
  selectedFilmId,
  onSelectFilm,
  isMobile = false,
  isLoading = false,
  isDetailOpen = false,
  isFiltersCollapsed = false,
  height = DEFAULT_CONTAINER_HEIGHT,
  className,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate base number of columns based on container width (responsive)
  const baseColumnCount = useResponsiveColumnCount(parentRef, isMobile);

  // Calculate final column count based on layout state (detail panel, filters)
  const getColumnCount = () => {
    if (isMobile) return baseColumnCount;
    if (isFiltersCollapsed) {
      // More space available when filters collapsed
      return isDetailOpen ? 2 : 3;
    }
    // Filters expanded
    return isDetailOpen ? 1 : baseColumnCount;
  };
  const columnCount = getColumnCount();

  // Memoize the debounced observer to prevent recreation on every render
  const debouncedObserveElementRect = useMemo(
    () => createDebouncedObserveElementRect(),
    []
  );

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(films.length / columnCount),
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_ROW_ESTIMATED_HEIGHT,
    overscan: CARD_OVERSCAN,
    // Use debounced resize observation to prevent browser lockups during rapid resizing
    observeElementRect: debouncedObserveElementRect,
    // Measure actual element height for accurate positioning (add gap)
    measureElement: (element) => element.getBoundingClientRect().height + 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Padding to prevent hover scale effect from being clipped at container edges
  const HOVER_OVERFLOW_PADDING = 8;

  // Show loading skeletons
  if (isLoading) {
    // When detail panel is open on desktop, show fewer skeleton columns
    const skeletonColumns = isDetailOpen && !isMobile ? 1 : columnCount;
    return (
      <div
        className={cn('grid gap-2', className)}
        style={{
          gridTemplateColumns: `repeat(${skeletonColumns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: skeletonColumns * 3 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton cards are temporary and order doesn't change
          <FilmCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (films.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border p-12 text-center',
          className
        )}
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'rgba(var(--color-background-rgb), 0.15)',
        }}
      >
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'rgba(var(--color-background-rgb), 0.3)',
          }}
        >
          <FilmIcon
            className="h-8 w-8"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
        </div>
        <p
          className="mb-1 text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          No films found
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height,
        minHeight: MIN_CONTAINER_HEIGHT,
        maxHeight: MAX_CONTAINER_HEIGHT,
        overflow: 'auto',
        // Add padding to accommodate hover scale effect overflow
        paddingTop: HOVER_OVERFLOW_PADDING,
        paddingBottom: HOVER_OVERFLOW_PADDING,
        paddingLeft: HOVER_OVERFLOW_PADDING,
        paddingRight: HOVER_OVERFLOW_PADDING,
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow: VirtualItem) => {
          const startIndex = virtualRow.index * columnCount;
          const endIndex = Math.min(startIndex + columnCount, films.length);
          const rowItems = films.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                }}
              >
                {rowItems.map((film: Film) => (
                  <FilmCard
                    key={film.uuid}
                    film={film}
                    isSelected={film.uuid === selectedFilmId}
                    onClick={() => onSelectFilm(film)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
