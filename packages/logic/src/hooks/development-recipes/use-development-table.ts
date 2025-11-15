import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  SortingState,
  type ColumnDef,
  PaginationState,
} from '@tanstack/react-table';

interface DevelopmentCombinationView {
  combination: any;
  film?: any;
  developer?: any;
  source?: 'api' | 'custom';
  canShare?: boolean;
  canViewDetails?: boolean;
}

interface UseDevelopmentTableOptions {
  rows: DevelopmentCombinationView[];
  columns: ColumnDef<DevelopmentCombinationView>[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  pageIndex: number;
  onPageIndexChange: (index: number) => void;
  isFavorite: (id: string) => boolean;
}

/**
 * Custom sorting function that handles favorites-first logic
 * while respecting the user's selected sort column and direction
 */
const createCustomSortComparator = (
  isFavorite: (id: string) => boolean,
  sortKey?: string,
  sortAsc?: boolean
) => {
  return (a: DevelopmentCombinationView, b: DevelopmentCombinationView) => {
    const aId = String(a.combination.uuid || a.combination.id);
    const bId = String(b.combination.uuid || b.combination.id);
    const aIsFav = isFavorite(aId);
    const bIsFav = isFavorite(bId);

    // Favorites first
    if (aIsFav && !bIsFav) return -1;
    if (!aIsFav && bIsFav) return 1;

    // If both have same favorite status, sort by selected column
    if (!sortKey) return 0;

    let aVal: string | number | undefined;
    let bVal: string | number | undefined;

    if (sortKey === 'film') {
      aVal = a.film ? `${a.film.brand} ${a.film.name}` : '';
      bVal = b.film ? `${b.film.brand} ${b.film.name}` : '';
      const comparison = (aVal as string).localeCompare(bVal as string);
      return sortAsc ? comparison : -comparison;
    }

    if (sortKey === 'developer') {
      aVal = a.developer
        ? `${a.developer.manufacturer} ${a.developer.name}`
        : '';
      bVal = b.developer
        ? `${b.developer.manufacturer} ${b.developer.name}`
        : '';
      const comparison = (aVal as string).localeCompare(bVal as string);
      return sortAsc ? comparison : -comparison;
    }

    if (sortKey === 'combination.shootingIso') {
      aVal = a.combination.shootingIso;
      bVal = b.combination.shootingIso;
    } else if (sortKey === 'combination.timeMinutes') {
      aVal = a.combination.timeMinutes;
      bVal = b.combination.timeMinutes;
    } else if (sortKey === 'combination.temperatureF') {
      aVal = a.combination.temperatureF;
      bVal = b.combination.temperatureF;
    }

    if (aVal === undefined || bVal === undefined) return 0;

    const comparison =
      typeof aVal === 'number'
        ? (aVal as number) - (bVal as number)
        : (aVal as string).localeCompare(bVal as string);

    return sortAsc ? comparison : -comparison;
  };
};

/**
 * Hook to manage TanStack Table instance for development recipes
 * Handles sorting with favorites-first priority and pagination
 *
 * @param rows - The data rows for the table
 * @param columns - Column definitions (created with createTableColumns from @dorkroom/ui)
 * @param sorting - Current sorting state
 * @param onSortingChange - Callback to update sorting state
 * @param pageIndex - Current page index
 * @param onPageIndexChange - Callback to update page index
 * @param isFavorite - Function to check if an item is favorited
 */
export function useDevelopmentTable({
  rows,
  columns,
  sorting,
  onSortingChange,
  pageIndex,
  onPageIndexChange,
  isFavorite,
}: UseDevelopmentTableOptions) {

  // Sort and paginate the data with custom comparator
  const sortedAndPaginatedRows = useMemo(() => {
    let sorted = [...rows];

    // Apply sorting
    if (sorting.length === 0) {
      // Default sort: by film, ascending
      sorted = sorted.sort(
        createCustomSortComparator(isFavorite, 'film', true)
      );
    } else {
      const { id: sortKey, desc } = sorting[0];
      sorted = sorted.sort(
        createCustomSortComparator(isFavorite, sortKey, !desc)
      );
    }

    // Apply pagination
    const pageSize = 24;
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sorted.slice(startIndex, endIndex);
  }, [rows, sorting, isFavorite, pageIndex]);

  const pagination = useMemo(
    () => ({ pageIndex, pageSize: 24 } as PaginationState),
    [pageIndex]
  );

  const handlePaginationChange = (updaterOrValue: any) => {
    const newPagination =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(pagination)
        : updaterOrValue;
    if (newPagination.pageIndex !== pageIndex) {
      onPageIndexChange(newPagination.pageIndex);
    }
  };

  const table = useReactTable({
    data: sortedAndPaginatedRows,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: (updaterOrValue) => {
      if (typeof updaterOrValue === 'function') {
        onSortingChange(updaterOrValue(sorting));
      } else {
        onSortingChange(updaterOrValue);
      }
    },
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: Math.ceil(rows.length / 24),
    getRowId: (row: DevelopmentCombinationView) => String(row.combination.uuid || row.combination.id),
  });

  return table;
}
