import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { countActiveFilmFilters } from '../../../components/films/count-active-film-filters';
import { FilmFiltersMobile } from '../../../components/films/film-filters-mobile';

const noop = () => {
  // no-op
};

const none = {
  searchQuery: '',
  colorTypeFilter: '',
  isoSpeedFilter: '',
  brandFilter: '',
  discontinuedFilter: 'all' as const,
};

describe('countActiveFilmFilters', () => {
  afterEach(() => {
    cleanup();
  });

  it('is 0 with nothing applied', () => {
    expect(countActiveFilmFilters(none)).toBe(0);
  });

  it('counts the search term as one active filter', () => {
    expect(countActiveFilmFilters({ ...none, searchQuery: 'hp5' })).toBe(1);
  });

  it('counts every applied filter once', () => {
    expect(
      countActiveFilmFilters({
        searchQuery: 'hp5',
        colorTypeFilter: 'bw',
        isoSpeedFilter: '400',
        brandFilter: 'ilford',
        discontinuedFilter: 'active',
      })
    ).toBe(5);
  });

  it('shows the search in the phone Filters badge (#649)', () => {
    render(
      <FilmFiltersMobile
        {...none}
        searchQuery="hp5"
        onSearchChange={noop}
        onColorTypeChange={noop}
        onIsoSpeedChange={noop}
        onBrandChange={noop}
        onDiscontinuedChange={noop}
        brandOptions={[]}
        isoOptions={[]}
        onClearFilters={noop}
        hasActiveFilters
        resultCount={3}
      />
    );
    expect(screen.getByText('1 active')).toBeTruthy();
  });
});
