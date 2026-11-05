import type { Film } from '@dorkroom/api';
import type { FilmSort } from '@dorkroom/logic';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FilmResults,
  type FilmResultsProps,
} from '../../../components/films/film-results';
import type { VirtualListFocusHandle } from '../../../hooks/use-virtual-list-focus';

const makeFilm = (n: number, fields: Partial<Film> = {}): Film => ({
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
  ...fields,
});

const BW = makeFilm(1, { reciprocityFailure: 'Rf 1.31' });
const COLOR = makeFilm(2, {
  brand: 'Kodak',
  name: 'Portra 400',
  colorType: 'color',
});
const OLD = makeFilm(3, { name: 'Old Stock', discontinued: true });
const FILMS = [BW, COLOR, OLD];

const counts = new Map([
  ['film-1', 3],
  ['film-2', 5],
]);
const getRecipeCount = (film: Film) => counts.get(film.uuid) ?? 0;

const noop = () => {
  // no-op
};

function renderResults(props: Partial<FilmResultsProps> = {}) {
  return render(
    <FilmResults
      films={FILMS}
      selectedFilmId={null}
      onSelectFilm={noop}
      view="table"
      sort="name"
      onSortChange={noop}
      showRecipes
      getRecipeCount={getRecipeCount}
      {...props}
    />
  );
}

/** The nearest ancestor of an element matching a selector, or a failure. */
function closestOrThrow(element: HTMLElement, selector: string): HTMLElement {
  const found = element.closest<HTMLElement>(selector);
  if (!found) throw new Error(`no ${selector} around the element`);
  return found;
}

const headerNames = () =>
  screen.getAllByRole('columnheader').map((header) => header.textContent);

/** happy-dom lays nothing out; report a viewport that holds every row. */
const VIEWPORT = { width: 1280, height: 2000 };

describe('FilmResults', () => {
  const measure = Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    Element.prototype.getBoundingClientRect = () => DOMRect.fromRect(VIEWPORT);
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = measure;
    cleanup();
  });

  describe('columns', () => {
    it('shows all seven columns in the desktop table', () => {
      renderResults();
      expect(headerNames()).toEqual([
        'Photo',
        'Film',
        'Type',
        'ISO',
        'Reciprocity',
        'Recipes',
        'Status',
      ]);
      expect(screen.getByRole('table')).toHaveClass('table-fixed');
    });

    it('shows five columns in the tablet table', () => {
      renderResults({ view: 'table-compact' });
      expect(headerNames()).toEqual([
        'Photo',
        'Film',
        'Type',
        'ISO',
        'Recipes',
      ]);
    });

    it('removes the Recipes column, and every mention of recipes, with showRecipes off', () => {
      const { container } = renderResults({ showRecipes: false });
      expect(headerNames()).not.toContain('Recipes');
      expect(container.textContent).not.toMatch(/recipe/i);
    });

    it('has no header in the list and rows views, and uses a list', () => {
      for (const view of ['list', 'rows'] as const) {
        const { unmount } = renderResults({ view });
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
        expect(screen.getAllByRole('listitem')).toHaveLength(FILMS.length);
        unmount();
      }
    });

    it('labels the photo column for assistive tech only', () => {
      renderResults();
      expect(screen.getByText('Photo')).toHaveClass('sr-only');
    });
  });

  describe('cells', () => {
    it('shows the recipe count, a dash for none, and nothing for a color film', () => {
      renderResults();
      const cells = (name: RegExp) =>
        within(closestOrThrow(screen.getByRole('button', { name }), 'tr'))
          .getAllByRole('cell')
          .map((cell) => cell.textContent);

      // photo, film, type, iso, reciprocity, recipes, status
      expect(cells(/Stock 1/)[5]).toBe('3');
      expect(cells(/Old Stock/)[5]).toBe('-');
      expect(cells(/Portra 400/)[5]).toBe('');
      expect(cells(/Stock 1/)[4]).toBe('Rf 1.31');
      expect(cells(/Old Stock/)[4]).toBe('-');
      expect(cells(/Stock 1/)[6]).toBe('Active');
      expect(cells(/Old Stock/)[6]).toBe('Discontinued');
    });

    it('right-aligns the ISO column in tabular numbers', () => {
      renderResults();
      const row = closestOrThrow(
        screen.getByRole('button', { name: /Stock 1/ }),
        'tr'
      );
      expect(within(row).getByText('400')).toHaveClass(
        'text-right',
        'tabular-nums'
      );
    });

    it('keeps the Rebrand tag in table views', () => {
      renderResults({ films: [makeFilm(4, { baseFilmSlug: 'film-1' })] });
      expect(screen.getByText('Rebrand')).toBeInTheDocument();
    });

    it('stretches the film button over its row', () => {
      renderResults();
      const button = screen.getByRole('button', { name: /Stock 1/ });
      expect(button).toHaveClass('after:absolute', 'after:inset-0');
      expect(button.closest('tr')).toHaveClass('relative');
      expect(button.closest('tr')).toHaveAttribute(
        'data-list-item-key',
        'film-1'
      );
    });
  });

  describe('sorting', () => {
    const sortAttr = (name: string) =>
      screen.getByRole('columnheader', { name }).getAttribute('aria-sort');

    it.each([
      ['name', 'Film', 'ascending'],
      ['iso', 'ISO', 'ascending'],
      ['recipes', 'Recipes', 'descending'],
    ] as const)(
      'marks only the %s column active',
      (sort, active, direction) => {
        renderResults({ sort });
        for (const name of ['Film', 'ISO', 'Recipes']) {
          expect(sortAttr(name)).toBe(name === active ? direction : null);
        }
        expect(
          screen.getByRole('columnheader', { name: 'Type' })
        ).not.toHaveAttribute('aria-sort');
      }
    );

    it.each([
      ['Film', 'name'],
      ['ISO', 'iso'],
      ['Recipes', 'recipes'],
    ] as const)(
      'sets the %s sort on click, with no direction toggle',
      (label, sort) => {
        const onSortChange = vi.fn<(sort: FilmSort) => void>();
        renderResults({ sort, onSortChange });
        const header = screen.getByRole('columnheader', { name: label });
        fireEvent.click(within(header).getByRole('button'));
        fireEvent.click(within(header).getByRole('button'));
        expect(onSortChange).toHaveBeenNthCalledWith(1, sort);
        expect(onSortChange).toHaveBeenNthCalledWith(2, sort);
      }
    );

    it('leaves Type, Reciprocity and Status as plain headers', () => {
      renderResults();
      for (const name of ['Type', 'Reciprocity', 'Status']) {
        const header = screen.getByRole('columnheader', { name });
        expect(within(header).queryByRole('button')).not.toBeInTheDocument();
      }
    });
  });

  describe('list and rows', () => {
    it('marks the selected row with aria-current and a heavier name', () => {
      renderResults({ view: 'list', selectedFilmId: 'film-2' });
      const selected = screen.getByRole('button', { name: /Portra 400/ });
      expect(selected).toHaveAttribute('aria-current', 'true');
      expect(selected.querySelector('.font-bold')).not.toBeNull();
      expect(
        screen.getByRole('button', { name: /Stock 1/ })
      ).not.toHaveAttribute('aria-current');
    });

    it('builds the meta line: recipes only for a black and white film that has some', () => {
      renderResults({
        view: 'rows',
        films: [
          BW,
          COLOR,
          OLD,
          makeFilm(6, { name: 'One Recipe' }),
          // A color film with a recipe row must still never say so.
          makeFilm(7, { name: 'Slide Thing', colorType: 'slide' }),
        ],
        getRecipeCount: (film) =>
          ({ 'film-1': 3, 'film-2': 5, 'film-6': 1, 'film-7': 2 })[film.uuid] ??
          0,
      });
      expect(screen.getByText('Ilford · B&W · 3 recipes')).toBeVisible();
      expect(screen.getByText('Ilford · B&W · 1 recipe')).toBeVisible();
      expect(screen.getByText('Ilford · B&W')).toBeVisible();
      expect(screen.getByText('Kodak · Color')).toBeVisible();
      expect(screen.getByText('Ilford · Slide')).toBeVisible();
    });

    it('activates a film from its list row', () => {
      const onSelectFilm = vi.fn();
      renderResults({ view: 'list', onSelectFilm });
      fireEvent.click(screen.getByRole('button', { name: /Old Stock/ }));
      expect(onSelectFilm).toHaveBeenCalledWith(OLD);
    });

    it('activates a film from its table row button', () => {
      const onSelectFilm = vi.fn();
      renderResults({ onSelectFilm });
      fireEvent.click(screen.getByRole('button', { name: /Portra 400/ }));
      expect(onSelectFilm).toHaveBeenCalledWith(COLOR);
    });

    it('shows the ISO with a screen reader label', () => {
      renderResults({ view: 'rows' });
      const item = closestOrThrow(
        screen.getByRole('button', { name: /Stock 1/ }),
        'li'
      );
      expect(item).toHaveTextContent('ISO 400');
    });
  });

  describe('states', () => {
    it('shows busy placeholders while loading', () => {
      renderResults({ isLoading: true });
      expect(screen.getByLabelText('Loading films')).toHaveAttribute(
        'aria-busy',
        'true'
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('shows the empty state with a working Clear filters button', () => {
      const onClearFilters = vi.fn();
      renderResults({ films: [], onClearFilters, hasActiveFilters: true });
      expect(screen.getByText('No films found')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('view changes', () => {
    it('keeps the same scroll container across table and list views', () => {
      const { container, rerender } = renderResults({
        selectedFilmId: 'film-1',
      });
      const scroller = container.firstElementChild;
      rerender(
        <FilmResults
          films={FILMS}
          selectedFilmId="film-1"
          onSelectFilm={noop}
          view="list"
          sort="name"
          onSortChange={noop}
          showRecipes
          getRecipeCount={getRecipeCount}
        />
      );
      expect(container.firstElementChild).toBe(scroller);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('keeps focus on the row when it moves from the table to the list', () => {
      const { rerender } = renderResults();
      screen.getByRole('button', { name: /Old Stock/ }).focus();
      rerender(
        <FilmResults
          films={FILMS}
          selectedFilmId="film-3"
          onSelectFilm={noop}
          view="list"
          sort="name"
          onSortChange={noop}
          showRecipes
          getRecipeCount={getRecipeCount}
        />
      );
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /Old Stock/ })
      );
    });

    it('focuses a row through the focus handle', () => {
      const handle = createRef<VirtualListFocusHandle>();
      renderResults({ focusHandleRef: handle });
      handle.current?.focusItem('film-2');
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /Portra 400/ })
      );
    });

    it('writes the scroll position to scrollOffsetRef', () => {
      const scrollOffsetRef = { current: 0 };
      const { container } = renderResults({ view: 'rows', scrollOffsetRef });
      const scroller = container.firstElementChild;
      if (!(scroller instanceof HTMLElement)) throw new Error('no scroller');
      scroller.scrollTop = 120;
      fireEvent.scroll(scroller);
      expect(scrollOffsetRef.current).toBe(120);
    });
  });
});
