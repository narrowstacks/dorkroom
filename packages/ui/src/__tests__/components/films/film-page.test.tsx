import type { Combination, Film } from '@dorkroom/api';
import type { FilmRecipe } from '@dorkroom/logic';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FilmPage,
  type FilmPageProps,
  type FilmPageRecipes,
} from '../../../components/films/film-page';
import { TemperatureProvider } from '../../../contexts/temperature-context';

const film = (overrides: Partial<Film> = {}): Film => ({
  id: 1,
  uuid: 'hp5-uuid',
  slug: 'hp5-plus',
  name: 'HP5 Plus',
  brand: 'Ilford',
  isoSpeed: 400,
  colorType: 'bw',
  grainStructure: null,
  description: 'A classic.',
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
  ...overrides,
});

const combination = (
  uuid: string,
  shootingIso: number,
  overrides: Partial<Combination> = {}
): Combination => ({
  id: 0,
  uuid,
  name: '',
  filmStockId: 'hp5-plus',
  filmSlug: 'hp5-plus',
  developerId: 'd76',
  developerSlug: 'd76',
  shootingIso,
  dilutionId: null,
  customDilution: null,
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 9.5,
  agitationMethod: 'Inversion',
  agitationSchedule: null,
  pushPull: null,
  tags: null,
  notes: null,
  infoSource: null,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
  ...overrides,
});

const row = (
  uuid: string,
  shootingIso: number,
  fields: Partial<FilmRecipe> = {}
): FilmRecipe => ({
  combination: combination(uuid, shootingIso),
  developerName: 'Kodak D-76',
  dilution: '1+1',
  ...fields,
});

type Ready = Extract<FilmPageRecipes, { status: 'ready' }>;

const ready = (
  groups: Ready['groups'],
  fields: Partial<Ready> = {}
): Ready => ({
  status: 'ready',
  groups,
  defaultIso: 400,
  developersReady: true,
  count: groups.reduce((total, group) => total + group.recipes.length, 0),
  ...fields,
});

const THREE_ISOS = ready([
  { shootingIso: 200, recipes: [row('r-200', 200)] },
  {
    shootingIso: 400,
    recipes: Array.from({ length: 7 }, (_, i) => row(`r-400-${i}`, 400)),
  },
  { shootingIso: 1600, recipes: [row('r-1600', 1600)] },
]);

function renderPage(overrides: Partial<FilmPageProps> = {}) {
  const props: FilmPageProps = {
    film: film(),
    baseFilm: null,
    recipes: THREE_ISOS,
    relatedFilms: [],
    onSelectFilm: vi.fn(),
    layout: 'narrow',
    ...overrides,
  };
  const view = render(
    <TemperatureProvider>
      <FilmPage {...props} />
    </TemperatureProvider>
  );
  return { ...view, props };
}

const stat = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).closest('div');

afterEach(cleanup);

describe('FilmPage recipe rules', () => {
  it.each(['color', 'slide'])(
    'never mentions recipes for a %s film, whatever the data says',
    (colorType) => {
      for (const recipes of [
        THREE_ISOS,
        { status: 'unavailable' } as const,
        { status: 'loading' } as const,
      ]) {
        const { container } = renderPage({
          film: film({ colorType }),
          recipes,
        });
        expect(container.textContent).not.toMatch(/recipe/i);
        for (const el of container.querySelectorAll('[aria-label], [title]')) {
          expect(el.getAttribute('aria-label') ?? '').not.toMatch(/recipe/i);
          expect(el.getAttribute('title') ?? '').not.toMatch(/recipe/i);
        }
        expect(container.querySelector('a[href^="/development"]')).toBeNull();
        expect(screen.queryByText('Recipes')).toBeNull();
        cleanup();
      }
    }
  );

  it('renders nothing for a black and white film with no recipes, and About leads', () => {
    const { container } = renderPage({ recipes: ready([], { count: 0 }) });
    expect(container.textContent).not.toMatch(/recipe/i);
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(headings[0]).toBe('About');
  });

  it('shows the Recipes stat only when there are recipes', () => {
    renderPage();
    expect(stat('Recipes')).toHaveTextContent('9');
    cleanup();
    renderPage({ recipes: { status: 'unavailable' } });
    expect(screen.queryByText('Recipes', { selector: 'dt' })).toBeNull();
  });
});

describe('FilmPage stats', () => {
  it('shows only values the film has', () => {
    renderPage({ recipes: { status: 'unavailable' } });
    expect(stat('ISO')).toHaveTextContent('400');
    expect(stat('Type')).toHaveTextContent('Black & white');
    expect(screen.queryByText('Reciprocity')).toBeNull();
    expect(screen.queryByText('Grain')).toBeNull();
    expect(screen.queryByText('Date Added')).toBeNull();
    expect(screen.queryByText(/^0$/)).toBeNull();
    expect(screen.queryByText('-')).toBeNull();
  });

  it('shows reciprocity and grain when present, with grain capitalized', () => {
    renderPage({
      film: film({ grainStructure: 'fine', reciprocityFailure: 'Over 1s' }),
    });
    expect(stat('Reciprocity')).toHaveTextContent('Over 1s');
    expect(stat('Grain')).toHaveTextContent('Fine');
    cleanup();
    renderPage({ film: film({ grainStructure: 'Fine' }) });
    expect(stat('Grain')).toHaveTextContent('Fine');
  });
});

describe('FilmPage recipes', () => {
  it('opens on the default ISO tab with five rows and a See all button', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Recipes', level: 3 })
    ).toBeVisible();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['200', '400', '1600']);
    expect(
      screen.getByRole('tab', { name: '400', selected: true })
    ).toBeVisible();
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('link')).toHaveLength(5);
    fireEvent.click(
      within(panel).getByRole('button', { name: 'See all 7 at ISO 400' })
    );
    expect(within(panel).getAllByRole('link')).toHaveLength(7);
    expect(within(panel).queryByRole('button')).toBeNull();
  });

  it('collapses See all again when the tab changes', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /See all 7/ }));
    fireEvent.click(screen.getByRole('tab', { name: '200' }));
    fireEvent.click(screen.getByRole('tab', { name: '400' }));
    expect(
      within(screen.getByRole('tabpanel')).getAllByRole('link')
    ).toHaveLength(5);
  });

  it('moves between tabs with arrow keys, Home and End, on a roving tabindex', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual([
      '-1',
      '0',
      '-1',
    ]);

    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveFocus();

    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
  });

  it('resets the selected tab for another film', () => {
    const { rerender, props } = renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '1600' }));
    rerender(
      <TemperatureProvider>
        <FilmPage {...props} film={film({ uuid: 'other', slug: 'other' })} />
      </TemperatureProvider>
    );
    expect(
      screen.getByRole('tab', { name: '400', selected: true })
    ).toBeVisible();
  });

  it('links each row to its recipe with formatted time and temperature', () => {
    renderPage({
      recipes: ready([
        {
          shootingIso: 400,
          recipes: [row('abc-123', 400)],
        },
      ]),
    });
    const link = screen.getByRole('link', { name: /Kodak D-76/ });
    expect(link).toHaveAttribute('href', '/development?recipe=abc-123');
    expect(link).toHaveTextContent('1+1');
    expect(link).toHaveTextContent('9m 30s');
    expect(link).toHaveTextContent('68.0°F');
  });

  it('shows a skeleton for developer text until developers load, row still linked', () => {
    renderPage({
      recipes: ready(
        [
          {
            shootingIso: 400,
            recipes: [row('r1', 400, { developerName: null, dilution: null })],
          },
        ],
        { developersReady: false }
      ),
    });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/development?recipe=r1');
    expect(
      link.querySelector('[aria-hidden="true"] .animate-pulse')
    ).not.toBeNull();
    expect(link).not.toHaveTextContent('Stock');
  });

  it('omits null developer and dilution text without inventing Stock', () => {
    renderPage({
      recipes: ready([
        {
          shootingIso: 400,
          recipes: [
            row('r1', 400, { developerName: 'Rodinal', dilution: null }),
            row('r2', 400, { developerName: null, dilution: '1+25' }),
          ],
        },
      ]),
    });
    const [first, second] = screen.getAllByRole('link');
    expect(first).toHaveTextContent('Rodinal');
    expect(first).not.toHaveTextContent('Stock');
    expect(second).toHaveTextContent('1+25');
    expect(second.querySelector('.animate-pulse')).toBeNull();
  });

  it('links to /development?film= when recipes are unavailable', () => {
    renderPage({ recipes: { status: 'unavailable' } });
    expect(
      screen.getByRole('link', { name: 'View Development Recipes' })
    ).toHaveAttribute('href', '/development?film=hp5-plus');
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('shows a busy skeleton while loading, without a Recipes heading', () => {
    renderPage({ recipes: { status: 'loading' } });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { name: 'Recipes' })).toBeNull();
  });
});

describe('FilmPage sections', () => {
  it('orders About, manufacturer notes and related films', () => {
    const other = film({
      uuid: 'o',
      slug: 'o',
      brand: 'Kodak',
      name: 'Tri-X 400',
    });
    const { props } = renderPage({
      film: film({ manufacturerNotes: ['Panchromatic'] }),
      relatedFilms: [other],
    });
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    ).toEqual(['Recipes', 'About', 'Manufacturer notes', 'Also ISO 400']);
    fireEvent.click(screen.getByRole('button', { name: /Tri-X 400/ }));
    expect(props.onSelectFilm).toHaveBeenCalledWith(other);
  });

  it('renders the title as an h2 and Share only when onShare is given', () => {
    const onShare = vi.fn();
    renderPage({ onShare });
    expect(
      screen.getByRole('heading', { level: 2, name: 'HP5 Plus' })
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Share this film' }));
    expect(onShare).toHaveBeenCalled();
    cleanup();
    renderPage();
    expect(
      screen.queryByRole('button', { name: 'Share this film' })
    ).toBeNull();
  });

  it('shows the rebrand line from the base film', () => {
    renderPage({
      film: film({ baseFilmSlug: 'base' }),
      baseFilm: film({
        slug: 'base',
        uuid: 'b',
        brand: 'Ilford',
        name: 'Base',
      }),
    });
    expect(screen.getByText('Repackaged Ilford Base')).toBeVisible();
  });
});
