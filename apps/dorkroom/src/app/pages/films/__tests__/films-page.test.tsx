import '@testing-library/jest-dom/vitest';
import type { Film } from '@dorkroom/api';
import type { UseFilmDatabaseReturn } from '@dorkroom/logic';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FilmsDesktopLayout } from '../films-page';

/**
 * Regression coverage for #329: FilmsDesktopLayout never forwarded `baseFilm`
 * to FilmDetailPanel, so the "Repackaged …" rebrand line on desktop fell back
 * to a slug-derived title (e.g. "Ilford Hp5 Plus") instead of the real base
 * film's brand and name (e.g. "Ilford HP5 Plus"). The mobile layout already
 * passed baseFilm through correctly.
 */

const baseFilm: Film = {
  id: 1,
  uuid: 'base-uuid',
  slug: 'hp5-plus',
  brand: 'Ilford',
  name: 'HP5 Plus',
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: 'classic',
  description: 'Classic black and white film.',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
};

const rebrandedFilm: Film = {
  id: 2,
  uuid: 'rebrand-uuid',
  slug: 'some-store-brand-hp5',
  brand: 'Store Brand',
  name: 'Rebranded HP5',
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: 'classic',
  description: 'A repackaged version of Ilford HP5 Plus.',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  aliases: [],
  baseFilmSlug: 'hp5-plus',
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
};

// Minimal stand-in for useFilmDatabase()'s return value. filteredFilms is left
// empty so FilmResultsVirtualized renders its (trivial) empty state rather than
// needing real layout measurement in happy-dom — irrelevant to this test, which
// only cares about what FilmsDesktopLayout forwards to FilmDetailPanel for the
// already-selected film.
const noop = () => {
  // no-op
};

function buildDb(): UseFilmDatabaseReturn {
  return {
    films: [rebrandedFilm, baseFilm],
    isLoading: false,
    error: null,
    filteredFilms: [],
    searchQuery: '',
    setSearchQuery: noop,
    debouncedSearchQuery: '',
    colorTypeFilter: '',
    setColorTypeFilter: noop,
    isoSpeedFilter: '',
    setIsoSpeedFilter: noop,
    brandFilter: '',
    setBrandFilter: noop,
    discontinuedFilter: 'all',
    setDiscontinuedFilter: noop,
    brandOptions: [],
    isoOptions: [],
    clearFilters: noop,
    hasActiveFilters: false,
  };
}

describe('FilmsDesktopLayout', () => {
  afterEach(() => {
    cleanup();
  });

  it('passes baseFilm through to FilmDetailPanel so the rebrand line names the real base film', () => {
    render(
      <FilmsDesktopLayout
        db={buildDb()}
        isMobile={false}
        selectedFilm={rebrandedFilm}
        baseFilm={baseFilm}
        shouldShowDetailSkeleton={false}
        onSelectFilm={noop}
        onClosePanel={noop}
        isFiltersCollapsed={false}
        onCollapsedChange={noop}
      />
    );

    expect(screen.getByText('Repackaged Ilford HP5 Plus')).toBeInTheDocument();
    // Without the fix, film-rebrand-info.tsx falls back to slugToTitle,
    // producing this exact string from the baseFilmSlug instead.
    expect(screen.queryByText('Repackaged Hp5 Plus')).not.toBeInTheDocument();
  });
});
