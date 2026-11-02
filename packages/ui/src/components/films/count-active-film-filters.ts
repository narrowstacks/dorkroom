export interface FilmFilterState {
  searchQuery: string;
  colorTypeFilter: string;
  isoSpeedFilter: string;
  brandFilter: string;
  discontinuedFilter: 'all' | 'active' | 'discontinued';
}

/**
 * How many filters are applied on /films. The search term counts as one, so
 * the phone and desktop layouts show the same number (#649).
 */
export function countActiveFilmFilters({
  searchQuery,
  colorTypeFilter,
  isoSpeedFilter,
  brandFilter,
  discontinuedFilter,
}: FilmFilterState): number {
  return [
    searchQuery,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter !== 'all',
  ].filter(Boolean).length;
}
