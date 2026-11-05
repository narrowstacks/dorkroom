import type { Film } from '@dorkroom/api';
import type { FilmSort } from '@dorkroom/logic';
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import {
  type FC,
  type MutableRefObject,
  type Ref,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
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
import { FilmListRow } from './film-list-row';
import { FilmResultsEmpty } from './film-results-empty';
import { FilmResultsSkeleton } from './film-results-skeleton';
import { FilmResultsTableHeader } from './film-results-table-header';
import {
  type FilmResultsView,
  isTableView,
  rowHeightFor,
} from './film-results-view';
import { FilmTableRow } from './film-table-row';

export type { FilmResultsView } from './film-results-view';

const OVERSCAN = 8;

export interface FilmResultsProps {
  films: Film[];
  selectedFilmId: string | null;
  onSelectFilm: (film: Film) => void;
  view: FilmResultsView;
  sort: FilmSort;
  onSortChange: (sort: FilmSort) => void;
  /** Whether the Recipes column and the "N recipes" meta text show. */
  showRecipes: boolean;
  /** Recipe count for a film; 0 for films that cannot show recipes. */
  getRecipeCount: (film: Film) => number;
  isLoading?: boolean;
  /** Height of the scroll container. Defaults to calc(100dvh - 280px). */
  height?: string;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  /** Receives a handle that puts focus back on a film's row (by uuid). */
  focusHandleRef?: Ref<VirtualListFocusHandle>;
  /**
   * Scroll position to start at. For a parent that unmounts the results while
   * a film is open (the phone), paired with `scrollOffsetRef`.
   */
  initialScrollOffset?: number;
  /** Written with the scroll position on every scroll. */
  scrollOffsetRef?: MutableRefObject<number>;
  className?: string;
}

/**
 * The films page's results: a sortable table (desktop, tablet), a side list
 * while a film is open, or rows on a phone. One scroll container and one
 * virtualizer stay mounted across the table and list views, so narrowing the
 * table to a list keeps the user's place.
 */
export const FilmResults: FC<FilmResultsProps> = ({
  films,
  selectedFilmId,
  onSelectFilm,
  view,
  sort,
  onSortChange,
  showRecipes,
  getRecipeCount,
  isLoading = false,
  height = DEFAULT_CONTAINER_HEIGHT,
  onClearFilters,
  hasActiveFilters = false,
  focusHandleRef,
  initialScrollOffset,
  scrollOffsetRef,
  className,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const rowHeight = rowHeightFor(view);
  const table = isTableView(view);

  const filmKeys = useMemo(() => films.map((film) => film.uuid), [films]);
  const listFocus = useVirtualListFocus({
    containerRef: parentRef,
    keys: filmKeys,
    // Called from focusItem only, after render, when rowVirtualizer exists.
    scrollToIndex: (index) => rowVirtualizer.scrollToIndex(index),
    handleRef: focusHandleRef,
    fallbackRef: emptyStateRef,
  });

  const debouncedObserveElementRect = useMemo(
    () => createDebouncedObserveElementRect(),
    []
  );

  const rowVirtualizer = useVirtualizer({
    count: isLoading ? 0 : films.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
    initialOffset: initialScrollOffset,
    rangeExtractor: (range) =>
      keepFocusedInRange(
        defaultRangeExtractor(range),
        listFocus.focusedIndex()
      ),
    observeElementRect: debouncedObserveElementRect,
  });

  // The table's scroll position, kept while a table view shows so it can come
  // back after the side list (a different row height) has been scrolled.
  const tableScrollTop = useRef(0);
  const previousView = useRef<FilmResultsView | null>(null);
  const selectedIndexRef = useRef(-1);
  useLayoutEffect(() => {
    selectedIndexRef.current =
      selectedFilmId === null
        ? -1
        : films.findIndex((film) => film.uuid === selectedFilmId);
  });

  // A view change swaps the row height, and the virtualizer caches sizes, so
  // re-measure. Entering the list (or mounting in it, for a deep link) brings
  // the selected row into view; returning to a table restores its position.
  useLayoutEffect(() => {
    const previous = previousView.current;
    previousView.current = view;
    if (previous !== null && previous !== view) rowVirtualizer.measure();
    if (view === 'list' && previous !== 'list') {
      if (selectedIndexRef.current >= 0) {
        rowVirtualizer.scrollToIndex(selectedIndexRef.current, {
          align: 'auto',
        });
      }
    } else if (previous === 'list' && isTableView(view)) {
      const scroller = parentRef.current;
      if (scroller) scroller.scrollTop = tableScrollTop.current;
    }
  }, [view, rowVirtualizer]);

  if (isLoading) {
    return (
      <FilmResultsSkeleton
        view={view}
        showRecipes={showRecipes}
        className={className}
      />
    );
  }

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

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;
  const columnCount = 4 + (view === 'table' ? 2 : 0) + (showRecipes ? 1 : 0);

  const rows = virtualRows.flatMap((virtualRow) => {
    const film = films[virtualRow.index];
    if (!film) return [];
    return [
      table ? (
        <FilmTableRow
          key={film.uuid}
          film={film}
          view={view}
          showRecipes={showRecipes}
          recipeCount={getRecipeCount(film)}
          onSelect={onSelectFilm}
        />
      ) : (
        <FilmListRow
          key={film.uuid}
          film={film}
          recipeCount={getRecipeCount(film)}
          isSelected={film.uuid === selectedFilmId}
          onSelect={onSelectFilm}
          height={rowHeight}
        />
      ),
    ];
  });

  return (
    <div
      ref={parentRef}
      // Focus lands here when the row it was meant for is gone (#604).
      tabIndex={-1}
      {...listFocus.containerProps}
      onScroll={(event) => {
        const { scrollTop } = event.currentTarget;
        if (table) tableScrollTop.current = scrollTop;
        if (scrollOffsetRef) scrollOffsetRef.current = scrollTop;
      }}
      className={cn(
        'overflow-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]',
        className
      )}
      style={{
        height,
        minHeight: MIN_CONTAINER_HEIGHT,
        maxHeight: MAX_CONTAINER_HEIGHT,
      }}
    >
      {table ? (
        <table className="w-full table-fixed text-sm">
          <FilmResultsTableHeader
            view={view}
            sort={sort}
            onSortChange={onSortChange}
            showRecipes={showRecipes}
          />
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td
                  aria-hidden="true"
                  colSpan={columnCount}
                  style={{ height: paddingTop }}
                />
              </tr>
            )}
            {rows}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td
                  aria-hidden="true"
                  colSpan={columnCount}
                  style={{ height: paddingBottom }}
                />
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <ul style={{ paddingTop, paddingBottom }}>{rows}</ul>
      )}
    </div>
  );
};
