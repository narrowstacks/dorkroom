import type { DevelopmentCombinationView } from '@dorkroom/logic';
import type { Cell, Header, HeaderGroup, Table } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { FlaskConical } from 'lucide-react';
import { type FC, type Ref, useMemo, useRef } from 'react';
import {
  useVirtualListFocus,
  type VirtualListFocusHandle,
} from '../../hooks/use-virtual-list-focus';
import { cn } from '../../lib/cn';
import { cssVars } from '../../lib/dom';
import {
  debouncedObserveElementRect,
  DEFAULT_CONTAINER_HEIGHT,
  getVirtualPadding,
  MAX_CONTAINER_HEIGHT,
  MIN_CONTAINER_HEIGHT,
} from '../../lib/virtualization';
import { ResultsEmpty } from '../results/results-empty';
import { ResultsFrame } from '../results/results-frame';
import {
  ResultsTableHead,
  SortableResultsTableHead,
} from '../results/results-table-head';
import { VirtualTableSpacer } from '../results/virtual-table-spacer';
import { SkeletonTableRow } from '../ui/skeleton';
import { FavoriteMessageSkeleton } from './favorite-message-skeleton';
import {
  TABLE_OVERSCAN,
  TABLE_ROW_ESTIMATED_HEIGHT,
} from './virtualization-constants';

interface DevelopmentResultsTableVirtualizedProps {
  table: Table<DevelopmentCombinationView>;
  onSelectCombination?: (view: DevelopmentCombinationView) => void;
  favoriteTransitions?: Map<string, 'adding' | 'removing'>;
  /** Height of the virtualized container. Defaults to calc(100dvh - 280px) */
  height?: string;
  /** Ref to the scroll container, can be used to scroll to top on page change */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** ID of the currently selected recipe to highlight in the table */
  selectedRecipeId?: string | null;
  /**
   * Receives a handle that puts focus back on a recipe (by combination uuid
   * or id), such as when the detail sidebar closes with focus inside it.
   */
  focusHandleRef?: Ref<VirtualListFocusHandle>;
  /** "Clear filters" in the empty state. */
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export const DevelopmentResultsTableVirtualized: FC<
  DevelopmentResultsTableVirtualizedProps
> = ({
  table,
  onSelectCombination,
  favoriteTransitions = new Map(),
  height = DEFAULT_CONTAINER_HEIGHT,
  scrollContainerRef,
  selectedRecipeId,
  focusHandleRef,
  onClearFilters,
  hasActiveFilters,
}) => {
  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();

  const internalRef = useRef<HTMLDivElement>(null);
  const parentRef = scrollContainerRef || internalRef;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TABLE_ROW_ESTIMATED_HEIGHT,
    overscan: TABLE_OVERSCAN,
    // Use debounced resize observation to prevent browser lockups during rapid resizing
    observeElementRect: debouncedObserveElementRect,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const recipeKeys = useMemo(
    () =>
      rows.map(({ original: { combination } }) =>
        String(combination.uuid || combination.id)
      ),
    [rows]
  );
  const listFocus = useVirtualListFocus({
    containerRef: parentRef,
    keys: recipeKeys,
    scrollToIndex: (index) => rowVirtualizer.scrollToIndex(index),
    handleRef: focusHandleRef,
  });
  const totalSize = rowVirtualizer.getTotalSize();

  const { paddingTop, paddingBottom } = getVirtualPadding(
    virtualRows,
    totalSize
  );
  const columnCount = table.getAllColumns().length;

  return (
    <ResultsFrame>
      <div
        ref={parentRef}
        // Focus lands here when the row it was meant for is gone (#604).
        tabIndex={-1}
        {...listFocus.containerProps}
        data-results-scroll
        style={{
          height,
          minHeight: MIN_CONTAINER_HEIGHT,
          maxHeight: MAX_CONTAINER_HEIGHT,
          overflow: 'auto',
          // The bordered wrapper draws this container's focus indicator.
          outline: 'none',
        }}
      >
        {rows.length === 0 ? (
          <ResultsEmpty
            icon={<FlaskConical className="size-8" />}
            title="No recipes found"
            onClearFilters={onClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        ) : (
          <table
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- genuinely an interactive grid: rows are focusable (tabIndex) and selectable (aria-selected) and column headers are sortable buttons; role="grid" is required for aria-selected on <tr> to be valid
            // eslint-disable-next-line react-doctor/no-noninteractive-element-to-interactive-role -- genuinely an interactive grid: rows are focusable (tabIndex) and selectable (aria-selected); role="grid" is required for aria-selected on <tr> to be valid
            role="grid"
            className="min-w-full divide-y text-sm"
            style={cssVars({
              // Fixed layout ensures column widths are determined by headers,
              // preventing resize when custom recipe rows virtualize in/out
              tableLayout: 'fixed',
              '--tw-divide-opacity': '0.15',
              color: 'var(--color-border-secondary)',
            })}
          >
            <thead
              className="text-xs uppercase tracking-wide sticky top-0 z-10"
              style={{
                backgroundColor: 'var(--color-surface-muted)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {headerGroups.map(
                (headerGroup: HeaderGroup<DevelopmentCombinationView>) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(
                      (header: Header<DevelopmentCombinationView, unknown>) => {
                        const isSorted = header.column.getIsSorted();
                        const label = flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        );
                        // Matches the cells below: Developer's have no side padding.
                        const padding =
                          (header.id === 'film' && 'px-4') ||
                          (header.id === 'developer' && 'px-0');

                        return header.column.columnDef.enableSorting ? (
                          <SortableResultsTableHead
                            key={header.id}
                            label={label}
                            active={Boolean(isSorted)}
                            direction={
                              isSorted === 'desc' ? 'descending' : 'ascending'
                            }
                            onSort={() => header.column.toggleSorting()}
                            className={cn(padding)}
                            width={header.getSize()}
                          />
                        ) : (
                          <ResultsTableHead
                            key={header.id}
                            className={cn(padding)}
                            style={{ width: header.getSize() }}
                          >
                            {label}
                          </ResultsTableHead>
                        );
                      }
                    )}
                  </tr>
                )
              )}
            </thead>
            <tbody
              className="divide-y"
              style={cssVars({
                '--tw-divide-opacity': '0.15',
              })}
            >
              <VirtualTableSpacer height={paddingTop} colSpan={columnCount} />
              {virtualRows.map((virtualRow: VirtualItem) => {
                const row = rows[virtualRow.index];
                const rowData = row.original;
                const id = String(
                  rowData.combination.uuid || rowData.combination.id
                );
                const transitionState = favoriteTransitions.get(id);

                // Show skeleton or message during transition
                if (transitionState) {
                  if (transitionState === 'adding') {
                    return (
                      <FavoriteMessageSkeleton
                        key={`transition-${id}`}
                        message="Added to favorites"
                        variant="row"
                      />
                    );
                  } else if (transitionState === 'removing') {
                    return <SkeletonTableRow key={`transition-${id}`} />;
                  }
                }

                const isCustom = rowData.source === 'custom';
                const isSelected = id === selectedRecipeId;

                return (
                  <tr
                    key={row.id}
                    data-list-item-key={id}
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => onSelectCombination?.(rowData)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectCombination?.(rowData);
                      }
                    }}
                    className={cn(
                      'cursor-pointer transition-colors duration-200',
                      'animate-slide-fade-bottom',
                      isSelected
                        ? isCustom
                          ? 'bg-recipe-custom-selected'
                          : 'bg-surface-muted'
                        : isCustom
                          ? 'bg-recipe-custom hover:bg-recipe-custom-hover'
                          : 'hover:bg-surface-muted'
                    )}
                    style={{
                      boxShadow: isSelected
                        ? 'inset 3px 0 0 var(--color-brand)'
                        : undefined,
                    }}
                  >
                    {row
                      .getVisibleCells()
                      .map(
                        (cell: Cell<DevelopmentCombinationView, unknown>) => (
                          <td
                            key={cell.id}
                            className={cn(
                              'py-2 align-top',
                              cell.column.id === 'film' && 'px-4',
                              cell.column.id !== 'film' &&
                                cell.column.id !== 'developer' &&
                                'px-3'
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        )
                      )}
                  </tr>
                );
              })}
              <VirtualTableSpacer
                height={paddingBottom}
                colSpan={columnCount}
              />
            </tbody>
          </table>
        )}
      </div>
    </ResultsFrame>
  );
};
