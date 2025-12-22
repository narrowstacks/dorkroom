import type { DevelopmentCombinationView } from '@dorkroom/logic';
import type { Cell, Header, HeaderGroup, Table } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type FC, useRef } from 'react';
import { cn } from '../../lib/cn';
import { SkeletonTableRow } from '../ui/skeleton';
import { FavoriteMessageSkeleton } from './favorite-message-skeleton';
import { useRecipeHoverStyles } from './use-recipe-hover-styles';
import {
  DEFAULT_CONTAINER_HEIGHT,
  MAX_CONTAINER_HEIGHT,
  MIN_CONTAINER_HEIGHT,
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
}

export const DevelopmentResultsTableVirtualized: FC<
  DevelopmentResultsTableVirtualizedProps
> = ({
  table,
  onSelectCombination,
  favoriteTransitions = new Map(),
  height = DEFAULT_CONTAINER_HEIGHT,
  scrollContainerRef,
}) => {
  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();
  const hoverStyles = useRecipeHoverStyles();

  const internalRef = useRef<HTMLDivElement>(null);
  const parentRef = scrollContainerRef || internalRef;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TABLE_ROW_ESTIMATED_HEIGHT,
    overscan: TABLE_OVERSCAN,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  return (
    <div
      className="overflow-visible rounded-2xl border shadow-subtle"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-surface-muted-rgb), 0.2)',
      }}
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          ref={parentRef}
          style={{
            height,
            minHeight: MIN_CONTAINER_HEIGHT,
            maxHeight: MAX_CONTAINER_HEIGHT,
            overflow: 'auto',
          }}
        >
          <table
            className="min-w-full divide-y text-sm"
            style={
              {
                '--tw-divide-opacity': '0.15',
                divideColor: 'var(--color-border-secondary)',
                color: 'var(--color-border-secondary)',
              } as React.CSSProperties
            }
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
                        const isSortedDesc = isSorted === 'desc';
                        const sortable = header.column.columnDef.enableSorting;

                        return (
                          <th
                            key={header.id}
                            className={cn(
                              'px-4 py-3 text-left',
                              header.id === 'film' && 'px-4',
                              header.id !== 'film' &&
                                header.id !== 'developer' &&
                                'px-3'
                            )}
                            style={{
                              width: header.getSize(),
                            }}
                          >
                            {sortable ? (
                              <button
                                type="button"
                                onClick={() => header.column.toggleSorting()}
                                className={cn(
                                  'flex w-full items-center gap-1 text-xs uppercase tracking-wide transition',
                                  header.id === 'actions' && 'justify-start'
                                )}
                                style={{
                                  color: isSorted
                                    ? 'var(--color-text-primary)'
                                    : 'var(--color-text-tertiary)',
                                }}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {isSorted && (
                                  <span>{isSortedDesc ? '▼' : '▲'}</span>
                                )}
                              </button>
                            ) : (
                              <div
                                className="flex w-full items-center gap-1 text-xs uppercase tracking-wide"
                                style={{ color: 'var(--color-text-tertiary)' }}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </div>
                            )}
                          </th>
                        );
                      }
                    )}
                  </tr>
                )
              )}
            </thead>
            <tbody
              className="divide-y"
              style={
                {
                  '--tw-divide-opacity': '0.15',
                  divideColor: 'var(--color-text-secondary)',
                } as React.CSSProperties
              }
            >
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} />
                </tr>
              )}
              {virtualRows.length > 0 ? (
                virtualRows.map((virtualRow) => {
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

                  // Pre-select styles based on source to avoid calculation in event handlers
                  const styles =
                    rowData.source === 'custom'
                      ? hoverStyles.custom
                      : hoverStyles.api;

                  return (
                    // biome-ignore lint/a11y/useSemanticElements: Table row uses ARIA role with keyboard support for clickable behavior
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectCombination?.(rowData)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectCombination?.(rowData);
                        }
                      }}
                      className={cn(
                        'cursor-pointer transition-all duration-200',
                        'animate-slide-fade-bottom'
                      )}
                      style={{
                        backgroundColor: styles.default.backgroundColor,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          styles.hover.backgroundColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          styles.default.backgroundColor;
                      }}
                    >
                      {row
                        .getVisibleCells()
                        .map(
                          (cell: Cell<DevelopmentCombinationView, unknown>) => (
                            <td
                              key={cell.id}
                              className={cn(
                                'py-4 align-top',
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
                })
              ) : (
                <tr>
                  <td
                    colSpan={table.getAllColumns().length}
                    className="px-6 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No recipes match your current filters. Try adjusting your
                    search.
                  </td>
                </tr>
              )}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
