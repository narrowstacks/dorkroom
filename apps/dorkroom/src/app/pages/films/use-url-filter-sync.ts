import type { FilmSort, useFilmDatabase } from '@dorkroom/logic';
import {
  useLocation,
  type useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import {
  filmColorFilterSchema,
  type FilmsSearchParams,
} from '../../../routes/search-schemas';

type FilmDatabase = ReturnType<typeof useFilmDatabase>;

interface FilmUrlFilters {
  search?: string;
  color?: string;
  iso?: string;
  brand?: string;
  status?: 'all' | 'active' | 'discontinued';
  sort?: FilmSort;
}

/**
 * Sync URL params to filter state when the URL changes (back/forward
 * navigation, bookmarks). Each param syncs in its own effect so a single effect
 * never performs multiple state updates. Effects only run when their URL param
 * changes: they do NOT include the matching state value in deps, to avoid
 * clearing user input before the debounced state-to-URL sync fires. State is not
 * cleared when a URL param is undefined (a plain link to /films keeps it),
 * except after a history traversal (Back, Forward, go): an absent param then
 * means the entry has that filter at its default, so state follows it. The
 * effects also rerun on every change of history entry, so a traversal between
 * two entries that both lack a param still resets it.
 */
export function useUrlFilterSync(
  searchParams: FilmUrlFilters,
  db: FilmDatabase
) {
  const {
    searchQuery,
    setSearchQuery,
    colorTypeFilter,
    setColorTypeFilter,
    isoSpeedFilter,
    setIsoSpeedFilter,
    brandFilter,
    setBrandFilter,
    discontinuedFilter,
    setDiscontinuedFilter,
    sort,
    setSort,
  } = db;

  const router = useRouter();
  // Which history entry the page is on. Every move to another entry reruns the
  // effects below, so a traversal between entries whose params are equal (both
  // absent) still resets state to the entry's values.
  const entryIndex = useLocation({ select: (l) => l.state.__TSR_index });
  // Whether the latest history move was a traversal. Set by the router's
  // history before the location update renders, so the effects below see it.
  const traversed = useRef(false);
  useEffect(
    () =>
      router.history.subscribe(({ action }: { action: { type: string } }) => {
        traversed.current = ['BACK', 'FORWARD', 'GO'].includes(action.type);
      }),
    [router]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.search ?? (traversed.current ? '' : undefined);
    if (v !== undefined && v !== searchQuery) {
      setSearchQuery(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.search, entryIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.color ?? (traversed.current ? '' : undefined);
    if (v !== undefined && v !== colorTypeFilter) {
      setColorTypeFilter(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.color, entryIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.iso ?? (traversed.current ? '' : undefined);
    if (v !== undefined && v !== isoSpeedFilter) {
      setIsoSpeedFilter(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.iso, entryIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.brand ?? (traversed.current ? '' : undefined);
    if (v !== undefined && v !== brandFilter) {
      setBrandFilter(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.brand, entryIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.status ?? (traversed.current ? 'all' : undefined);
    if (v !== undefined && v !== discontinuedFilter) {
      setDiscontinuedFilter(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.status, entryIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.sort ?? (traversed.current ? 'name' : undefined);
    if (v !== undefined && v !== sort) {
      setSort(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.sort, entryIndex]);
}

type FilmFilterSearch = Omit<FilmsSearchParams, 'film' | 'source'>;

/**
 * The filter and sort half of the /films URL, built from the live filter state
 * (not from the URL, which can lag it by the 500ms debounce). Shared by the
 * debounced write and the film open and close navigations, so a filter still
 * inside the debounce window is not lost when a film opens.
 */
export function buildFilmFilterSearch(
  db: Pick<
    FilmDatabase,
    | 'searchQuery'
    | 'colorTypeFilter'
    | 'isoSpeedFilter'
    | 'brandFilter'
    | 'discontinuedFilter'
    | 'sort'
  >
): FilmFilterSearch {
  return {
    search: db.searchQuery || undefined,
    color: filmColorFilterSchema.parse(db.colorTypeFilter),
    iso: db.isoSpeedFilter || undefined,
    brand: db.brandFilter || undefined,
    status: db.discontinuedFilter !== 'all' ? db.discontinuedFilter : undefined,
    // The requested sort, not effectiveSort: a recipes sort that a colour
    // filter overrides stays in the URL for when it is cleared.
    sort: db.sort !== 'name' ? db.sort : undefined,
  };
}

/**
 * A stable string for the filter and sort half of a /films search, in a fixed
 * key order. Compares live filters with the URL's, or with those recorded in
 * history state.
 */
export function serializeFilmFilters(
  search: Partial<FilmFilterSearch>
): string {
  return JSON.stringify([
    search.search,
    search.color,
    search.iso,
    search.brand,
    search.status,
    search.sort,
  ]);
}

interface DebouncedUrlWriteInput {
  db: FilmDatabase;
  /** The URL's own filters (see `serializeFilmFilters`), so a navigation that
   *  changes or drops one re-triggers the write. */
  urlFilters: string;
  navigate: ReturnType<typeof useNavigate>;
}

/**
 * Debounced (500ms) write of the filter state and sort to the URL. The film
 * comes from the URL at write time, never from component state, so a write
 * can neither restore a film that was closed nor keep a slug that was removed.
 * The entry is replaced and its history state kept (the film depth).
 */
export function useDebouncedUrlWrite({
  db,
  urlFilters,
  navigate,
}: DebouncedUrlWriteInput) {
  const {
    searchQuery,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter,
    sort,
  } = db;

  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate is stable from TanStack Router
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate({
        to: '/films',
        search: (prev: FilmsSearchParams) => ({
          ...buildFilmFilterSearch({
            searchQuery,
            colorTypeFilter,
            isoSpeedFilter,
            brandFilter,
            discontinuedFilter,
            sort,
          }),
          film: prev.film,
        }),
        state: true,
        replace: true,
        resetScroll: false,
      });
    }, 500);

    return () => clearTimeout(timeout);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- navigate is stable from TanStack Router
    // eslint-disable-next-line react-doctor/exhaustive-deps -- navigate is stable from TanStack Router
  }, [
    searchQuery,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter,
    sort,
    urlFilters,
  ]);
}
