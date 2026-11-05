import type { Film } from '@dorkroom/api';
import type { FilmSort, useFilmDatabase } from '@dorkroom/logic';
import type { useNavigate } from '@tanstack/react-router';
import { type RefObject, useEffect } from 'react';
import { filmColorFilterSchema } from '../../../routes/search-schemas';

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
 * cleared when a URL param is undefined; the debounced sync handles that.
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (
      searchParams.search !== undefined &&
      searchParams.search !== searchQuery
    ) {
      setSearchQuery(searchParams.search);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (
      searchParams.color !== undefined &&
      searchParams.color !== colorTypeFilter
    ) {
      setColorTypeFilter(searchParams.color);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.color]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (searchParams.iso !== undefined && searchParams.iso !== isoSpeedFilter) {
      setIsoSpeedFilter(searchParams.iso);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.iso]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (
      searchParams.brand !== undefined &&
      searchParams.brand !== brandFilter
    ) {
      setBrandFilter(searchParams.brand);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.brand]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (
      searchParams.status !== undefined &&
      searchParams.status !== discontinuedFilter
    ) {
      setDiscontinuedFilter(searchParams.status);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.status]);

  // Unlike the filters above, an absent param DOES reset: absent means the
  // default sort, so Back from ?sort=iso must return to name order. This does
  // not race the debounced URL write, because the effect reruns only when the
  // URL's value changes, never when the state does.
  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    const next = searchParams.sort ?? 'name';
    if (next !== sort) setSort(next);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded so the effect reruns only when the URL's sort changes, never on a state change the debounced URL write has not caught up with
    // eslint-disable-next-line react-doctor/exhaustive-deps -- setter is a stable ref; state value intentionally excluded so the effect reruns only when the URL's sort changes, never on a state change the debounced URL write has not caught up with
  }, [searchParams.sort]);
}

/**
 * Keeps an incoming ?film= slug in the URL until the selection effect has
 * processed it. The effect leaves a slug unprocessed while the catalog request
 * has failed with no match, so a failed load keeps the deep link too. Without
 * this, a catalog slower than the 500ms URL sync would write film: undefined
 * and strip the deep link.
 */
function pendingFilm(
  slug: string | undefined,
  processedSlug: { current: string | null }
): string | undefined {
  return slug && processedSlug.current !== slug ? slug : undefined;
}

interface DebouncedUrlWriteInput {
  db: FilmDatabase;
  selectedFilm: Film | null;
  urlFilmSlug: string | undefined;
  lastProcessedFilmSlug: RefObject<string | null>;
  navigate: ReturnType<typeof useNavigate>;
}

/** Debounced (500ms) write of the filter state, sort and selected film to the URL. */
export function useDebouncedUrlWrite({
  db,
  selectedFilm,
  urlFilmSlug,
  lastProcessedFilmSlug,
  navigate,
}: DebouncedUrlWriteInput) {
  const {
    searchQuery,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter,
    sort,
    isLoading,
    error,
  } = db;

  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate is stable from TanStack Router
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate({
        to: '/films',
        search: {
          search: searchQuery || undefined,
          color: filmColorFilterSchema.parse(colorTypeFilter),
          iso: isoSpeedFilter || undefined,
          brand: brandFilter || undefined,
          status: discontinuedFilter !== 'all' ? discontinuedFilter : undefined,
          // The requested sort, not effectiveSort: a recipes sort that a
          // colour filter overrides stays in the URL for when it is cleared.
          sort: sort !== 'name' ? sort : undefined,
          film:
            selectedFilm?.slug ||
            pendingFilm(urlFilmSlug, lastProcessedFilmSlug),
        },
        replace: true,
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
    selectedFilm,
    urlFilmSlug,
    // The selection effect marks the slug processed in a ref (no render), so
    // re-run when the lookup settles to let pendingFilm strip an invalid slug.
    isLoading,
    error,
  ]);
}
