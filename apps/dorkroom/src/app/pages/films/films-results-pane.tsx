import type { Film } from '@dorkroom/api';
import type { FilmSort } from '@dorkroom/logic';
import {
  VirtualizedErrorBoundary,
  type VirtualListFocusHandle,
} from '@dorkroom/ui';
import { FilmResults, type FilmResultsView } from '@dorkroom/ui/films';
import { type MutableRefObject, type Ref, useState } from 'react';

/** Shared by every layout so the results mount with one set of props. */
export interface FilmsResultsPaneProps {
  view: FilmResultsView;
  height: string;
  films: Film[];
  selectedFilmId: string | null;
  onSelectFilm: (film: Film) => void;
  sort: FilmSort;
  onSortChange: (sort: FilmSort) => void;
  showRecipes: boolean;
  getRecipeCount: (film: Film) => number;
  isLoading: boolean;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  focusHandleRef: Ref<VirtualListFocusHandle>;
  /** Phone only: where the rows were scrolled to before a film was opened. */
  scrollOffsetRef?: MutableRefObject<number>;
}

/** The results list inside its error boundary. */
export function FilmsResultsPane({
  scrollOffsetRef,
  ...props
}: FilmsResultsPaneProps) {
  // Read once, on mount: the phone unmounts the rows while a film is open.
  const [initialScrollOffset] = useState(() => scrollOffsetRef?.current);
  return (
    <VirtualizedErrorBoundary>
      <FilmResults
        {...props}
        scrollOffsetRef={scrollOffsetRef}
        initialScrollOffset={initialScrollOffset}
      />
    </VirtualizedErrorBoundary>
  );
}
