import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from 'react';

export interface UseResultsPaginationProps {
  pageIndex: number;
  setPageIndex: Dispatch<SetStateAction<number>>;
  favoriteTransitions: Map<string, 'adding' | 'removing'>;
  resultsContainerRef: RefObject<HTMLDivElement | null>;
  /** Ref to the virtualized scroll container, scrolled to top on page change */
  virtualScrollContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Hook that manages pagination scroll behavior and page index stability
 * Scrolls to top of results when page changes and prevents unwanted resets during transitions
 */
export function useResultsPagination(props: UseResultsPaginationProps): void {
  const {
    pageIndex,
    setPageIndex,
    favoriteTransitions,
    resultsContainerRef,
    virtualScrollContainerRef,
  } = props;

  // Scroll to top of results when page changes (not on initial render)
  const prevPageIndex = useRef(pageIndex);
  useEffect(() => {
    if (prevPageIndex.current !== pageIndex) {
      // Scroll virtualized container to top
      if (virtualScrollContainerRef.current) {
        virtualScrollContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }

      // Scroll window to results container, accounting for floating navbar
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
    }
    prevPageIndex.current = pageIndex;
  }, [pageIndex, virtualScrollContainerRef, resultsContainerRef]);

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
