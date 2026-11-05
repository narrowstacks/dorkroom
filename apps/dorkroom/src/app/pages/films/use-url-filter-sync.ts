import type { FilmSort, useFilmDatabase } from '@dorkroom/logic';
import { type useNavigate, useRouter } from '@tanstack/react-router';
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
 * means the entry has that filter at its default, so state follows it.
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
  }, [searchParams.search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.color ?? (traversed.current ? '' : undefined);
    if (v !== undefined && v !== colorTypeFilter) {
      setColorTypeFilter(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.color]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.iso ?? (traversed.current ? '' : undefined);
    if (v !== undefined && v !== isoSpeedFilter) {
      setIsoSpeedFilter(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.iso]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.brand ?? (traversed.current ? '' : undefined);
    if (v !== undefined && v !== brandFilter) {
      setBrandFilter(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.brand]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.status ?? (traversed.current ? 'all' : undefined);
    if (v !== undefined && v !== discontinuedFilter) {
      setDiscontinuedFilter(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.status]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const v = searchParams.sort ?? (traversed.current ? 'name' : undefined);
    if (v !== undefined && v !== sort) {
      setSort(v);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.sort]);
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

interface DebouncedUrlWriteInput {
  db: FilmDatabase;
  /** The URL's own sort, so a navigation that drops it re-triggers the write. */
  urlSort: FilmSort | undefined;
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
  urlSort,
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
    urlSort,
  ]);
}
