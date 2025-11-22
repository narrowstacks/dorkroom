import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  type ColumnDef,
  type PaginationState,
  type SortingFn,
} from '@tanstack/react-table';
import type { Combination, Film, Developer } from '@dorkroom/api';

export interface DevelopmentCombinationView {
  combination: Combination;
  film?: Film;
  developer?: Developer;
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

const PAGE_SIZE = 24;

const getCombinationKey = (view: DevelopmentCombinationView) =>
  String(view.combination.uuid || view.combination.id);

const compareStrings = (a?: string | null, b?: string | null) => {
  const safeA = a ? a.toString() : '';
  const safeB = b ? b.toString() : '';
  return safeA.localeCompare(safeB);
};

const compareNumbers = (a?: number | null, b?: number | null) => {
  if (a === undefined || a === null || b === undefined || b === null) {
    return 0;
  }
  return (a as number) - (b as number);
};

const createFavoriteAwareSortingFn = (
  isFavorite: (id: string) => boolean
): SortingFn<DevelopmentCombinationView> => {
  return (rowA, rowB, columnId) => {
    const aIsFav = isFavorite(getCombinationKey(rowA.original));
    const bIsFav = isFavorite(getCombinationKey(rowB.original));

    // Favorites always sort first
    if (aIsFav && !bIsFav) return -1;
    if (!aIsFav && bIsFav) return 1;

    // For non-favorite comparisons, use the column-specific logic
    switch (columnId) {
      case 'film': {
        const labelA = rowA.original.film
          ? `${rowA.original.film.brand} ${rowA.original.film.name}`
          : '';
        const labelB = rowB.original.film
          ? `${rowB.original.film.brand} ${rowB.original.film.name}`
          : '';
        return compareStrings(labelA, labelB);
      }
      case 'developer': {
        const labelA = rowA.original.developer
          ? `${rowA.original.developer.manufacturer} ${rowA.original.developer.name}`
          : '';
        const labelB = rowB.original.developer
          ? `${rowB.original.developer.manufacturer} ${rowB.original.developer.name}`
          : '';
        return compareStrings(labelA, labelB);
      }
      case 'combination.shootingIso': {
        const isoA = Number(rowA.original.combination.shootingIso);
        const isoB = Number(rowB.original.combination.shootingIso);
        return compareNumbers(isoA, isoB);
      }
      case 'combination.timeMinutes': {
        const timeA = Number(rowA.original.combination.timeMinutes);
        const timeB = Number(rowB.original.combination.timeMinutes);
        return compareNumbers(timeA, timeB);
      }
      case 'combination.temperatureF': {
        const tempA = Number(rowA.original.combination.temperatureF);
        const tempB = Number(rowB.original.combination.temperatureF);
        return compareNumbers(tempA, tempB);
      }
      default:
        return 0;
    }
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
  const paginationState = useMemo(
    () => ({ pageIndex, pageSize: PAGE_SIZE } satisfies PaginationState),
    [pageIndex]
  );

  const favoriteSortingFn = useMemo(
    () => createFavoriteAwareSortingFn(isFavorite),
    [isFavorite]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      pagination: paginationState,
    },
    enableSortingRemoval: false,
    onSortingChange: (updaterOrValue) => {
      const nextSorting =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(sorting)
          : updaterOrValue;
      onSortingChange(nextSorting);
    },
    onPaginationChange: (updaterOrValue) => {
      const nextPagination =
        typeof updaterOrValue === 'function'
          ? updaterOrValue({ pageIndex, pageSize: PAGE_SIZE })
          : updaterOrValue;
      if (nextPagination.pageIndex !== pageIndex) {
        onPageIndexChange(nextPagination.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    sortingFns: {
      favoriteAware: favoriteSortingFn,
    },
    getRowId: (row: DevelopmentCombinationView) =>
      String(row.combination.uuid || row.combination.id),
  });

  return table;
}
