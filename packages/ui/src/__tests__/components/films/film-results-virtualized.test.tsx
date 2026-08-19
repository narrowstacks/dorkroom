import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmResultsVirtualized } from '../../../components/films/film-results-virtualized';

const noop = () => {
  // no-op
};

describe('FilmResultsVirtualized empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the empty-state copy when there are no films', () => {
    render(
      <FilmResultsVirtualized
        films={[]}
        selectedFilmId={null}
        onSelectFilm={noop}
      />
    );

    expect(screen.getByText('No films found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your filters or search query')
    ).toBeInTheDocument();
  });

  it('does not render a "Clear filters" button when onClearFilters is not provided', () => {
    render(
      <FilmResultsVirtualized
        films={[]}
        selectedFilmId={null}
        onSelectFilm={noop}
        hasActiveFilters
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Clear filters' })
    ).not.toBeInTheDocument();
  });

  it('does not render a "Clear filters" button when no filters are active', () => {
    render(
      <FilmResultsVirtualized
        films={[]}
        selectedFilmId={null}
        onSelectFilm={noop}
        onClearFilters={noop}
        hasActiveFilters={false}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Clear filters' })
    ).not.toBeInTheDocument();
  });

  it('renders a working "Clear filters" button when filters are active', () => {
    const onClearFilters = vi.fn();

    render(
      <FilmResultsVirtualized
        films={[]}
        selectedFilmId={null}
        onSelectFilm={noop}
        onClearFilters={onClearFilters}
        hasActiveFilters
      />
    );

    const button = screen.getByRole('button', { name: 'Clear filters' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
