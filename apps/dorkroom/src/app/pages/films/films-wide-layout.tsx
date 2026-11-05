import { cn } from '@dorkroom/ui';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import {
  FilmsResultsPane,
  type FilmsResultsPaneProps,
} from './films-results-pane';

interface FilmsWideLayoutProps {
  results: FilmsResultsPaneProps;
  isDesktop: boolean;
  /** Whether a film (or its skeleton) is open beside the list. */
  filmOpen: boolean;
  /** Accessible name of the film page: "<brand> <name>". */
  pageLabel: string;
  /** The film page or its skeleton; rendered only while a film is open. */
  page: ReactNode;
}

// One height for the list and the page beside it.
export const WIDE_RESULTS_HEIGHT = 'calc(100dvh - 453px)';

/**
 * Desktop and tablet: the table at full width, narrowing to a side list with
 * the film page beside it. The results sit at the same place in the tree
 * either way, so opening a film never remounts them.
 */
export function FilmsWideLayout({
  results,
  isDesktop,
  filmOpen,
  pageLabel,
  page,
}: FilmsWideLayoutProps) {
  const open = filmOpen;
  const articleRef = useRef<HTMLElement>(null);
  // Switching films in the side list starts the new page at its top.
  useLayoutEffect(() => {
    if (articleRef.current && pageLabel) articleRef.current.scrollTop = 0;
  }, [pageLabel]);
  return (
    <div
      id="film-results"
      tabIndex={-1}
      className="overflow-hidden rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)]"
    >
      <div className="flex">
        <div
          className={cn(
            'min-w-0',
            open
              ? cn(
                  'shrink-0 border-r border-[color:var(--color-border-secondary)]',
                  isDesktop ? 'w-80' : 'w-[260px]'
                )
              : 'flex-1'
          )}
        >
          <FilmsResultsPane {...results} />
        </div>
        {open && (
          <article
            ref={articleRef}
            aria-label={pageLabel}
            className="h-[calc(100dvh-453px)] max-h-[calc(100dvh-120px)] min-h-[300px] min-w-0 flex-1 overflow-auto p-6"
          >
            {page}
          </article>
        )}
      </div>
    </div>
  );
}
