import type { Film } from '@dorkroom/api';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmResultsVirtualized } from '../../../components/films/film-results-virtualized';
import type { VirtualListFocusHandle } from '../../../hooks/use-virtual-list-focus';

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

const makeFilm = (n: number): Film => ({
  id: n,
  uuid: `film-${n}`,
  slug: `film-${n}`,
  name: `Stock ${n}`,
  brand: 'Ilford',
  isoSpeed: 400,
  colorType: 'bw',
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  imageCredit: null,
  imageSourceUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
});

/**
 * happy-dom performs no layout, so every box measures 0x0 and `useVirtualizer`
 * would render no rows. Report a viewport tall enough to hold them all.
 */
const VIEWPORT = { width: 1280, height: 2000 };

describe('FilmResultsVirtualized focus (#604)', () => {
  const measure = Element.prototype.getBoundingClientRect;
  const films = [1, 2, 3, 4, 5, 6].map(makeFilm);

  beforeEach(() => {
    Element.prototype.getBoundingClientRect = () => DOMRect.fromRect(VIEWPORT);
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = measure;
    cleanup();
  });

  const cardFor = (name: string) =>
    screen.getByRole('button', { name: new RegExp(`^Ilford ${name}`) });

  // With the filters collapsed the grid goes from three columns to two when
  // the panel opens, which moves the third card into the second row.
  it('keeps focus on the card when opening the detail panel remounts it', () => {
    const { rerender } = render(
      <FilmResultsVirtualized
        films={films}
        selectedFilmId={null}
        onSelectFilm={noop}
        isFiltersCollapsed
      />
    );
    const before = cardFor('Stock 3');
    before.focus();

    rerender(
      <FilmResultsVirtualized
        films={films}
        selectedFilmId="film-3"
        onSelectFilm={noop}
        isFiltersCollapsed
        isDetailOpen
      />
    );

    expect(before.isConnected).toBe(false);
    expect(document.activeElement).toBe(cardFor('Stock 3'));
  });

  it('leaves focus alone when it had left the card before the remount', async () => {
    const { rerender } = render(
      <FilmResultsVirtualized
        films={films}
        selectedFilmId={null}
        onSelectFilm={noop}
        isFiltersCollapsed
      />
    );
    const card = cardFor('Stock 3');
    card.focus();
    // A click on empty page space: focus goes nowhere, the card stays.
    card.blur();
    await Promise.resolve();

    rerender(
      <FilmResultsVirtualized
        films={films}
        selectedFilmId="film-3"
        onSelectFilm={noop}
        isFiltersCollapsed
        isDetailOpen
      />
    );

    expect(card.isConnected).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it('keeps the focused card rendered, and the scroll where it is, when the list scrolls past it', () => {
    const many = Array.from({ length: 60 }, (_, i) => makeFilm(i + 1));
    const { container } = render(
      <FilmResultsVirtualized
        films={many}
        selectedFilmId={null}
        onSelectFilm={noop}
      />
    );
    const card = cardFor('Stock 1');
    card.focus();
    const list = container.firstElementChild;
    if (!(list instanceof HTMLElement)) throw new Error('no scroll container');

    act(() => {
      list.scrollTop = 50_000;
      list.dispatchEvent(new Event('scroll'));
    });

    expect(screen.queryByRole('button', { name: /^Ilford Stock 1 / })).toBe(
      card
    );
    expect(document.activeElement).toBe(card);
    expect(list.scrollTop).toBe(50_000);
  });

  it('focuses a card by uuid through the focus handle', () => {
    const handle = createRef<VirtualListFocusHandle>();
    render(
      <FilmResultsVirtualized
        films={films}
        selectedFilmId={null}
        onSelectFilm={noop}
        focusHandleRef={handle}
      />
    );

    handle.current?.focusItem('film-3');

    expect(document.activeElement).toBe(cardFor('Stock 3'));
  });

  it('falls back to the list when the card is no longer in it', () => {
    const handle = createRef<VirtualListFocusHandle>();
    const { container } = render(
      <FilmResultsVirtualized
        films={films}
        selectedFilmId={null}
        onSelectFilm={noop}
        focusHandleRef={handle}
      />
    );

    handle.current?.focusItem('film-99');

    expect(document.activeElement).toBe(container.firstElementChild);
  });

  it('falls back to the empty state when the list has no films', () => {
    const handle = createRef<VirtualListFocusHandle>();
    render(
      <FilmResultsVirtualized
        films={[]}
        selectedFilmId={null}
        onSelectFilm={noop}
        focusHandleRef={handle}
      />
    );

    handle.current?.focusItem('film-1');

    expect(document.activeElement).toHaveTextContent('No films found');
  });
});
