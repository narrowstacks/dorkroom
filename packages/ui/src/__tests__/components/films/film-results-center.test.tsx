import type { Film } from '@dorkroom/api';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmResults } from '../../../components/films/film-results';

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

const films = Array.from({ length: 60 }, (_, i) => makeFilm(i + 1));
const noop = () => {
  // no-op
};

const results = (selectedFilmId: string | null, view: 'table' | 'list') => (
  <FilmResults
    films={films}
    selectedFilmId={selectedFilmId}
    onSelectFilm={noop}
    view={view}
    sort="name"
    onSortChange={noop}
    showRecipes
    getRecipeCount={() => 0}
  />
);

/**
 * happy-dom has no scroll extent or scrollTo, so give the scroller room and
 * record where the virtualizer asks it to go.
 */
describe('FilmResults selected row positioning', () => {
  const measure = Element.prototype.getBoundingClientRect;
  const scrollTo = vi.fn();
  const tops = () => scrollTo.mock.calls.map((call) => call[0].top);

  beforeEach(() => {
    scrollTo.mockClear();
    Element.prototype.getBoundingClientRect = () =>
      DOMRect.fromRect({ width: 1280, height: 2000 });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 100_000,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = measure;
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight');
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
    cleanup();
  });

  it('centers the selected row on first mount in the list, then only scrolls into view', () => {
    const { rerender } = render(results('film-40', 'list'));
    const centered = tops().at(-1) ?? 0;
    expect(centered).toBeGreaterThan(0);

    // Scrolling a row into view from the top aligns its end, which sits above
    // where centering the same row would put the scroll position.
    rerender(results('film-41', 'list'));
    rerender(results('film-40', 'list'));
    expect(tops().at(-1)).toBeLessThan(centered);
  });

  it('centers again when the list is entered anew from a table', () => {
    const { rerender } = render(results(null, 'table'));
    scrollTo.mockClear();

    rerender(results('film-40', 'list'));
    const centered = tops().at(-1);
    expect(centered).toBeGreaterThan(0);

    rerender(results(null, 'table'));
    rerender(results('film-40', 'list'));
    expect(tops().at(-1)).toBe(centered);
  });
});
