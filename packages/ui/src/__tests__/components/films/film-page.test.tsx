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
import { FilmImageModeContext } from '../../../components/films/film-image-mode-context';
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
    expect(within(panel).getAllByRole('link')[5]).toHaveFocus();
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
    expect(link).toHaveAttribute(
      'href',
      '/development?film=hp5-plus&recipe=abc-123'
    );
    expect(link).toHaveTextContent('1+1');
    expect(link).toHaveTextContent('9m 30s');
    expect(link).toHaveTextContent('68.0°F');
  });

  it('opens a rebrand-shared row under the film being viewed, and flags a non-room temperature', () => {
    renderPage({
      film: film({ slug: 'arista-edu-ultra-400', uuid: 'arista' }),
      recipes: ready([
        {
          shootingIso: 400,
          recipes: [
            {
              combination: combination('abc-123', 400, {
                temperatureC: 24,
                temperatureF: 75.2,
              }),
              developerName: 'Kodak D-76',
              dilution: '1+1',
            },
          ],
        },
      ]),
    });
    const link = screen.getByRole('link', { name: /Kodak D-76/ });
    expect(link).toHaveAttribute(
      'href',
      '/development?film=arista-edu-ultra-400&recipe=abc-123'
    );
    // The chip gives the temperature, so the row's own value is left out.
    expect(link.textContent?.match(/75\.2°F/g)).toHaveLength(1);
    expect(link).toHaveTextContent('High temp 75.2°F');
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
    expect(link).toHaveAttribute(
      'href',
      '/development?film=hp5-plus&recipe=r1'
    );
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

  it('moves focus to the heading after a related film is opened, never otherwise', () => {
    const other = film({
      uuid: 'o',
      slug: 'o',
      brand: 'Kodak',
      name: 'Tri-X 400',
    });
    const { rerender, props } = renderPage({ relatedFilms: [other] });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).not.toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /Tri-X 400/ }));
    rerender(
      <TemperatureProvider>
        <FilmPage {...props} film={other} />
      </TemperatureProvider>
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Tri-X 400' })
    ).toHaveFocus();

    // A change of film without a tap (Back, a link) does not take focus.
    // (The heading is the same element, so drop its focus first.)
    screen.getByRole('heading', { level: 2 }).blur();
    rerender(
      <TemperatureProvider>
        <FilmPage
          {...props}
          film={film({ uuid: 'third', slug: 'third', name: 'Third' })}
        />
      </TemperatureProvider>
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Third' })
    ).not.toHaveFocus();
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

  it('ignores the second click of a double-click on Back to films', () => {
    const onClose = vi.fn();
    renderPage({ onClose });
    const back = screen.getByRole('button', { name: /back to films/i });

    fireEvent.click(back, { detail: 2 });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(back, { detail: 1 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores the second click of a double-click on Share', () => {
    const onShare = vi.fn();
    renderPage({ onShare });
    const share = screen.getByRole('button', { name: 'Share this film' });

    fireEvent.click(share, { detail: 2 });
    expect(onShare).not.toHaveBeenCalled();

    fireEvent.click(share, { detail: 1 });
    expect(onShare).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText(/^Repackaged/)).toHaveTextContent(
      'Repackaged Ilford Base'
    );
  });

  it('opens the base film from the rebrand line', () => {
    const base = film({
      slug: 'base',
      uuid: 'b',
      brand: 'Ilford',
      name: 'Base',
    });
    const { props } = renderPage({
      film: film({ baseFilmSlug: 'base' }),
      baseFilm: base,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ilford Base' }));
    expect(props.onSelectFilm).toHaveBeenCalledWith(base);
  });
});

describe('FilmPage back button and focus', () => {
  it('renders Back to films only when onClose is given, and calls it', () => {
    const onClose = vi.fn();
    renderPage({ onClose });
    const back = screen.getByRole('button', { name: 'Back to films' });
    expect(back).toHaveClass('min-h-11');
    fireEvent.click(back);
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
    renderPage();
    expect(screen.queryByRole('button', { name: 'Back to films' })).toBeNull();
  });

  it('focuses the heading on mount only when asked', () => {
    renderPage({ focusHeadingOnMount: true });
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
    cleanup();
    renderPage();
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveFocus();
  });

  it('does not refocus the heading when the film changes', () => {
    const { rerender, props } = renderPage({ focusHeadingOnMount: true });
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    rerender(
      <TemperatureProvider>
        <FilmPage
          {...props}
          focusHeadingOnMount
          film={film({ uuid: 'other', slug: 'other', name: 'Other' })}
        />
      </TemperatureProvider>
    );
    expect(button).toHaveFocus();
    button.remove();
  });
});

describe('FilmPage layout', () => {
  it('uses a smaller photo and a one-row auto-fit stats grid when wide', () => {
    renderPage({ layout: 'wide' });
    expect(stat('ISO')?.parentElement).toHaveClass(
      'grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]'
    );
    expect(document.querySelector('.\\!w-28')).not.toBeNull();
  });

  it('keeps the narrow stats grid and photo size', () => {
    renderPage({ layout: 'narrow' });
    expect(stat('ISO')?.parentElement).toHaveClass(
      'grid-cols-2',
      'sm:grid-cols-3'
    );
    expect(document.querySelector('.\\!w-32')).not.toBeNull();
  });

  it('keeps the text tile for a film with no photo outside none mode', () => {
    renderPage();
    expect(document.querySelector('.lucide-film')).not.toBeNull();
  });
});

describe('FilmPage with no photos', () => {
  it('shows no photo and no credit in none mode', () => {
    const credited = film({
      staticImageUrl: 'https://example.com/hp5.jpg',
      imageCredit: 'A. Photographer',
      imageSourceUrl: 'https://example.com',
    });
    render(
      <FilmImageModeContext value="none">
        <TemperatureProvider>
          <FilmPage
            film={credited}
            baseFilm={null}
            recipes={{ status: 'unavailable' }}
            relatedFilms={[]}
            onSelectFilm={vi.fn()}
            layout="wide"
          />
        </TemperatureProvider>
      </FilmImageModeContext>
    );
    expect(document.querySelector('img')).toBeNull();
    // No empty tile either.
    expect(document.querySelector('.lucide-film')).toBeNull();
    expect(screen.queryByText(/A\. Photographer/)).toBeNull();
    expect(
      screen.getByRole('heading', { level: 2, name: 'HP5 Plus' })
    ).toBeVisible();
  });
});

describe('FilmPage photo in detail-only mode', () => {
  it('still shows the opened film photo and its credit', () => {
    const credited = film({
      staticImageUrl: 'https://example.com/hp5.jpg',
      imageCredit: 'Photo by A. Photographer, CC BY 4.0',
      imageSourceUrl: 'https://example.com/source',
    });
    render(
      <FilmImageModeContext value="detail-only">
        <TemperatureProvider>
          <FilmPage
            film={credited}
            baseFilm={null}
            recipes={{ status: 'unavailable' }}
            relatedFilms={[]}
            onSelectFilm={vi.fn()}
            layout="wide"
          />
        </TemperatureProvider>
      </FilmImageModeContext>
    );
    expect(document.querySelector('img')).not.toBeNull();
    expect(screen.getByText(/A\. Photographer/)).toBeInTheDocument();
  });
});
