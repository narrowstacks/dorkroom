import { cn, ResultsFrame } from '@dorkroom/ui';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import {
  FilmsResultsPane,
  type FilmsResultsPaneProps,
} from './films-results-pane';
import { wideResultsHeight } from './wide-results-height';

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
    <ResultsFrame id="film-results" tabIndex={-1}>
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
            style={{ height: wideResultsHeight(isDesktop) }}
            className="max-h-[calc(100dvh-120px)] min-h-[300px] min-w-0 flex-1 overflow-auto bg-[color:var(--color-surface)] p-6"
          >
            {/* The table takes the full width; a film's text and rows read better capped. */}
            <div className="mx-auto max-w-5xl">{page}</div>
          </article>
        )}
      </div>
    </ResultsFrame>
  );
}
