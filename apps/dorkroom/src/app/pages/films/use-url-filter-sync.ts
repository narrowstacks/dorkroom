import type { useFilmDatabase } from '@dorkroom/logic';
import { useEffect } from 'react';

type FilmDatabase = ReturnType<typeof useFilmDatabase>;

interface FilmUrlFilters {
  search?: string;
  color?: string;
  iso?: string;
  brand?: string;
  status?: 'all' | 'active' | 'discontinued';
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
}
