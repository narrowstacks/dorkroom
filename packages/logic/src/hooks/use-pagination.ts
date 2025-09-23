import { useState, useMemo, useCallback, useEffect } from 'react';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  resetToFirstPage: () => void;
}

export interface UsePaginationReturn<T>
  extends PaginationState,
    PaginationActions {
  paginatedItems: T[];
}

export const usePagination = <T>(
  items: T[],
  pageSize: number = 50,
): UsePaginationReturn<T> => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalItems = items.length;

  const paginationState = useMemo((): PaginationState => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const clampedCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (clampedCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const hasNext = clampedCurrentPage < totalPages;
    const hasPrevious = clampedCurrentPage > 1;

    return {
      currentPage: clampedCurrentPage,
      pageSize,
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      hasNext,
      hasPrevious,
    };
  }, [currentPage, pageSize, totalItems]);

  const paginatedItems = useMemo((): T[] => {
    const { startIndex, endIndex } = paginationState;
    return items.slice(startIndex, endIndex);
  }, [items, paginationState.startIndex, paginationState.endIndex]);

  useEffect(() => {
    if (currentPage > paginationState.totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, paginationState.totalPages]);

  const goToPage = useCallback(
    (page: number) => {
      const { totalPages } = paginationState;
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [paginationState.totalPages],
  );

  const goToNext = useCallback(() => {
    if (paginationState.hasNext) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [paginationState.hasNext]);

  const goToPrevious = useCallback(() => {
    if (paginationState.hasPrevious) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [paginationState.hasPrevious]);

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    ...paginationState,
    paginatedItems,
    goToPage,
    goToNext,
    goToPrevious,
    resetToFirstPage,
  };
};
