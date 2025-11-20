import {
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from 'react';

export interface UseResultsPaginationProps {
  pageIndex: number;
  setPageIndex: Dispatch<SetStateAction<number>>;
  favoriteTransitions: Map<string, 'adding' | 'removing'>;
  resultsContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Hook that manages pagination scroll behavior and page index stability
 * Scrolls to top of results when page changes and prevents unwanted resets during transitions
 */
export function useResultsPagination(
  props: UseResultsPaginationProps
): void {
  const { pageIndex, setPageIndex, favoriteTransitions, resultsContainerRef } =
    props;

  // Scroll to top of results when page changes, accounting for floating navbar
  useEffect(() => {
    if (resultsContainerRef.current) {
      const element = resultsContainerRef.current;
      const elementPosition =
        element.getBoundingClientRect().top + window.scrollY;
      const navbarHeight = 80; // Approximate navbar height + extra buffer
      const targetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });
    }
  }, [pageIndex, resultsContainerRef]);

  // Prevent page index reset during favorite transitions
  const prevPageIndexRef = useRef(pageIndex);
  useEffect(() => {
    const hasActiveTransitions = favoriteTransitions.size > 0;
    if (
      hasActiveTransitions &&
      pageIndex === 0 &&
      prevPageIndexRef.current > 0
    ) {
      // TanStack Table tried to reset to page 0, revert it
      setPageIndex(prevPageIndexRef.current);
    } else {
      prevPageIndexRef.current = pageIndex;
    }
  }, [pageIndex, favoriteTransitions, setPageIndex]);
}
