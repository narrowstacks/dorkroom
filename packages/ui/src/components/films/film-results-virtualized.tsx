import type { Film } from '@dorkroom/api';
import {
  defaultRangeExtractor,
  useVirtualizer,
  type VirtualItem,
} from '@tanstack/react-virtual';
import { type FC, type Ref, useMemo, useRef } from 'react';
import { useColumnCount } from '../../hooks/use-column-count';
import {
  keepFocusedInRange,
  useVirtualListFocus,
  type VirtualListFocusHandle,
} from '../../hooks/use-virtual-list-focus';
import { cn } from '../../lib/cn';
import {
  createDebouncedObserveElementRect,
  DEFAULT_CONTAINER_HEIGHT,
  MAX_CONTAINER_HEIGHT,
  MIN_CONTAINER_HEIGHT,
} from '../development-recipes/virtualization-constants';
import { FilmCard } from './film-card';
import { FilmCardSkeleton } from './film-card-skeleton';
import { FilmResultsEmpty } from './film-results-empty';

/** Card height constants for virtualization */
const CARD_ROW_ESTIMATED_HEIGHT = 110; // Card height + small gap
const CARD_OVERSCAN = 3; // Number of rows to render above/below viewport

/**
 * Stable keys for loading skeleton placeholders. The count varies with the
 * column layout (max 4 columns × 3 rows), so we pre-generate a fixed pool of
 * unique keys and slice it instead of using the array index as a key.
 */
const SKELETON_KEYS = Array.from(
  { length: 12 },
  (_, index) => `film-skeleton-${index}`
);

interface FilmResultsVirtualizedProps {
  films: Film[];
  selectedFilmId: string | null;
  onSelectFilm: (film: Film) => void;
  isMobile?: boolean;
  isLoading?: boolean;
  /** Whether a detail panel is open (affects column count on desktop) */
  isDetailOpen?: boolean;
  /** Height of the virtualized container. Defaults to calc(100dvh - 280px) */
  height?: string;
  className?: string;
  /**
   * Called when the user clicks "Clear filters" in the empty state. Only
   * rendered when provided and `hasActiveFilters` is true.
   */
  onClearFilters?: () => void;
  /** Whether any filter or search query is currently active. */
  hasActiveFilters?: boolean;
  /**
   * Receives a handle that puts focus back on a film's card (by uuid), such
   * as when the detail sidebar closes with focus inside it.
   */
  focusHandleRef?: Ref<VirtualListFocusHandle>;
}

// eslint-disable-next-line react-doctor/no-many-boolean-props -- independent display/state flags for the virtualized list, not a single variant axis
export const FilmResultsVirtualized: FC<FilmResultsVirtualizedProps> = ({
  films,
  selectedFilmId,
  onSelectFilm,
  isMobile = false,
  isLoading = false,
  isDetailOpen = false,
  height = DEFAULT_CONTAINER_HEIGHT,
  className,
  onClearFilters,
  hasActiveFilters = false,
  focusHandleRef,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);

  // Base column count from the container width. The mobile film grid is
  // always two columns of compact cards.
  const baseColumnCount = useColumnCount(parentRef, isMobile, {
    mobileColumns: 2,
  });

  // The results span the full width (the filters live in a toolbar above), so
  // an open detail panel only takes some of it.
  const getColumnCount = () => {
    if (isMobile) return baseColumnCount;
    return isDetailOpen ? 2 : baseColumnCount;
  };
  const columnCount = getColumnCount();

  // Opening or closing the detail sidebar changes the column count, which
  // moves every card into another row container and remounts it. This keeps
  // focus on the card (#604), and the virtualizer keeps the focused card's row
  // rendered so it survives the move and scrolling past it.
  const filmKeys = useMemo(() => films.map((film) => film.uuid), [films]);
  const listFocus = useVirtualListFocus({
    containerRef: parentRef,
    keys: filmKeys,
    // Called from focusItem only, after render, when rowVirtualizer exists.
    scrollToIndex: (index) =>
      rowVirtualizer.scrollToIndex(Math.floor(index / columnCount)),
    handleRef: focusHandleRef,
    fallbackRef: emptyStateRef,
  });

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
    rangeExtractor: (range) =>
      keepFocusedInRange(
        defaultRangeExtractor(range),
        Math.floor(listFocus.focusedIndex() / columnCount)
      ),
    // Use debounced resize observation to prevent browser lockups during rapid resizing
    observeElementRect: debouncedObserveElementRect,
    // Measure actual element height for accurate positioning (add gap)
    measureElement: (element) => element.getBoundingClientRect().height + 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Show loading skeletons
  if (isLoading) {
    return (
      <div
        className={cn('grid gap-2', className)}
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        {SKELETON_KEYS.slice(0, columnCount * 3).map((key) => (
          <FilmCardSkeleton key={key} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (films.length === 0) {
    return (
      <FilmResultsEmpty
        emptyRef={emptyStateRef}
        onClearFilters={onClearFilters}
        hasActiveFilters={hasActiveFilters}
        className={className}
      />
    );
  }

  return (
    <div
      ref={parentRef}
      // Focus lands here when the card it was meant for is gone (#604).
      tabIndex={-1}
      {...listFocus.containerProps}
      // p-2 (8px) adds padding so the card hover scale effect isn't clipped
      // at the scroll container edges; overflow-auto enables virtualized scroll.
      className={cn(
        'overflow-auto p-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]',
        className
      )}
      style={{
        height,
        minHeight: MIN_CONTAINER_HEIGHT,
        maxHeight: MAX_CONTAINER_HEIGHT,
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
                    itemKey={film.uuid}
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
