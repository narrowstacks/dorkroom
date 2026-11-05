import type { ReactNode } from 'react';
import {
  FilmsResultsPane,
  type FilmsResultsPaneProps,
} from './films-results-pane';

interface FilmsPhoneLayoutProps {
  results: FilmsResultsPaneProps;
  toolbar: ReactNode;
  /** Whether a film (or its skeleton) replaces the list. */
  filmOpen: boolean;
  /** Accessible name of the film page: "<brand> <name>". */
  pageLabel: string;
  /** The film page or its skeleton. */
  page: ReactNode;
}

export const PHONE_RESULTS_HEIGHT = 'calc(100dvh - 120px)';

/**
 * Phone: the toolbar and rows, or the film page in their place. Opening a
 * film unmounts the rows, so their scroll position travels in
 * `results.scrollOffsetRef`.
 */
export function FilmsPhoneLayout({
  results,
  toolbar,
  filmOpen,
  pageLabel,
  page,
}: FilmsPhoneLayoutProps) {
  if (filmOpen) {
    return (
      <article
        aria-label={pageLabel}
        className="rounded-2xl border border-[color:var(--color-border-secondary)] p-4"
      >
        {page}
      </article>
    );
  }
  return (
    <>
      {toolbar}
      <div
        id="film-results"
        tabIndex={-1}
        className="overflow-hidden rounded-2xl border border-[color:var(--color-border-secondary)]"
      >
        <FilmsResultsPane {...results} />
      </div>
    </>
  );
}
