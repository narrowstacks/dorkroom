import '@testing-library/jest-dom/vitest';
import type { RawFilm } from '@dorkroom/api';
import { ThemeProvider } from '@dorkroom/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type FilmsSearchParams,
  filmsSearchSchema,
} from '../../../../routes/search-schemas';
import FilmsPage from '../films-page';

/**
 * Page-level coverage for /films at phone, tablet and desktop widths through
 * one tree (#380).
 *
 * Everything is real except the two things happy-dom cannot supply: the
 * network (fetch serves /api/films) and the viewport (matchMedia and element
 * boxes). The page runs under a real TanStack router with the real /films
 * search schema, so URL assertions read the router's own location.
 *
 * Also carries the #329 regression: the rebrand line must name the real base
 * film ("Repackaged Ilford HP5 Plus"), not the slug fallback, at every width.
 */

function rawFilm(fields: Partial<RawFilm> & Pick<RawFilm, 'id' | 'slug'>) {
  const film: RawFilm = {
    uuid: `${fields.slug}-uuid`,
    brand: 'Brand',
    name: 'Name',
    color_type: 'bw',
    iso_speed: 400,
    grain_structure: null,
    description: '',
    manufacturer_notes: null,
    reciprocity_failure: null,
    discontinued: false,
    static_image_url: null,
    image_credit: null,
    image_source_url: null,
    aliases: [],
    base_film_slug: null,
    date_added: '2023-01-01',
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
    ...fields,
  };
  return film;
}

const CATALOG: RawFilm[] = [
  rawFilm({
    id: 1,
    slug: 'hp5-plus',
    brand: 'Ilford',
    name: 'HP5 Plus',
    static_image_url: 'https://example.com/hp5.jpg',
    image_credit: 'A. Photographer',
    image_source_url: 'https://example.com/source',
  }),
  rawFilm({
    id: 2,
    slug: 'store-brand-400',
    brand: 'Store',
    name: 'Brand 400',
    base_film_slug: 'hp5-plus',
  }),
  rawFilm({
    id: 3,
    slug: 'portra-400',
    brand: 'Kodak',
    name: 'Portra 400',
    color_type: 'color',
  }),
];

// --- network ----------------------------------------------------------------

const catalogResponse = (films: RawFilm[]) =>
  Promise.resolve(
    new Response(JSON.stringify({ data: films, count: films.length }), {
      headers: { 'content-type': 'application/json' },
    })
  );

const serverFailure = () =>
  Promise.resolve(
    new Response('down', { status: 500, statusText: 'Server Error' })
  );

const listResponse = (rows: unknown[]) =>
  Promise.resolve(
    new Response(JSON.stringify({ data: rows, count: rows.length }), {
      headers: { 'content-type': 'application/json' },
    })
  );

const DEVELOPER = {
  id: 1,
  uuid: 'dev-uuid',
  slug: 'kodak-d-76',
  name: 'Kodak D-76',
  manufacturer: 'Kodak',
  type: 'powder',
  description: '',
  film_or_paper: true,
  dilutions: [{ id: '1', name: '1+1', dilution: '1+1' }],
  mixing_instructions: null,
  storage_requirements: null,
  safety_notes: null,
  image_credit: null,
  image_source_url: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const combinationRow = (id: number, filmSlug: string) => ({
  id,
  uuid: `recipe-${id}`,
  name: '',
  film_stock: filmSlug,
  developer: 'kodak-d-76',
  shooting_iso: 400,
  dilution_id: '1',
  custom_dilution: null,
  temperature_celsius: 20,
  time_minutes: 9.5,
  agitation_method: 'Inversion',
  push_pull: 0,
  tags: null,
  notes: null,
  info_source: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
});

// One HP5 Plus recipe, plus a row for a color film that must never show.
const COMBINATIONS = [
  combinationRow(1, 'hp5-plus'),
  combinationRow(2, 'portra-400'),
];

let respond: () => Promise<Response> = () => catalogResponse(CATALOG);
let combinationsRespond: () => Promise<Response> = () =>
  listResponse(COMBINATIONS);
let developersRespond: () => Promise<Response> = () =>
  listResponse([DEVELOPER]);
let combinationFetches = 0;

function stubFetch() {
  vi.stubGlobal('fetch', (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.endsWith('/api/combinations')) {
      combinationFetches += 1;
      return combinationsRespond();
    }
    if (url.endsWith('/api/developers')) return developersRespond();
    if (!url.endsWith('/api/films')) {
      throw new Error(`FilmsPage requested something unexpected: ${url}`);
    }
    return respond();
  });
}

// --- viewport ---------------------------------------------------------------

const PHONE = 375;
const TABLET = 820;
const DESKTOP = 1280;

let viewportWidth = DESKTOP;
const mediaListeners = new Set<(event: { matches: boolean }) => void>();

function setViewport(width: number) {
  viewportWidth = width;
  for (const listener of mediaListeners) listener({ matches: false });
}

/** Evaluates `(min-width: N)` and `(max-width: N)` against `viewportWidth`. */
function mediaMatches(query: string): boolean {
  const limit = Number(/(\d+)px/.exec(query)?.[1]);
  if (query.includes('max-width')) return viewportWidth <= limit;
  if (query.includes('min-width')) return viewportWidth >= limit;
  return false;
}

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return mediaMatches(query);
    },
    media: query,
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (event: { matches: boolean }) => void
    ) => mediaListeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (event: { matches: boolean }) => void
    ) => mediaListeners.delete(listener),
    addListener: (listener: (event: { matches: boolean }) => void) =>
      mediaListeners.add(listener),
    removeListener: (listener: (event: { matches: boolean }) => void) =>
      mediaListeners.delete(listener),
    dispatchEvent: () => false,
  }));
}

// happy-dom lays nothing out, so the virtualizer would see a 0px viewport and
// render no rows. Give every element a box so the (few) rows render.
function stubLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 1300, height: 800 })
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1300);
}

// --- rendering --------------------------------------------------------------

function renderPage({
  width,
  url = '/films',
  theme,
}: {
  width: number;
  url?: string;
  theme?: string;
}) {
  viewportWidth = width;
  if (theme) localStorage.setItem('dorkroom-theme', theme);

  const rootRoute = createRootRoute({ component: Outlet });
  const filmsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/films',
    validateSearch: filmsSearchSchema,
    component: FilmsPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([filmsRoute]),
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  // A fresh client per render keeps one test's catalog out of the next one's.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );

  return { router, queryClient };
}

/** Renders and waits for the page header, i.e. the route has mounted. */
async function renderFilmsPage(options: {
  width: number;
  url?: string;
  theme?: string;
}) {
  const rendered = renderPage(options);
  await screen.findByRole('heading', { name: 'Film Database' });
  return rendered;
}

/** The results wrapper: a table, a side list or phone rows live in it. */
function results(): HTMLElement {
  const element = document.getElementById('film-results');
  if (!element) throw new Error('no #film-results');
  return element;
}

/**
 * A film's row button in the results list or table (not the film page beside
 * it), found by the film's name alone: the table reads "Ilford HP5 Plus" and
 * the list and phone rows read "HP5 Plus Ilford · B&W ...".
 */
function filmRow(name: string): HTMLElement {
  const row = [...results().querySelectorAll('[data-list-item-key]')].find(
    (candidate) => candidate.textContent?.includes(name)
  );
  if (!(row instanceof HTMLElement)) throw new Error(`no row for ${name}`);
  return within(row).getByRole('button');
}

/** Waits for the catalog to land in the results. */
async function findFilmRow(name: string): Promise<HTMLElement> {
  await waitFor(() => filmRow(name));
  return filmRow(name);
}

/** The open film's page: an article named "<brand> <name>" at every width. */
function getFilmPage(name: string): HTMLElement {
  return screen.getByRole('article', { name });
}

function queryFilmPage(name: string): HTMLElement | null {
  return screen.queryByRole('article', { name });
}

/** The toolbar's search box, the same at every width. */
function searchInput(): HTMLElement {
  return screen.getByRole('textbox', { name: 'Search films' });
}

type Router = ReturnType<typeof renderPage>['router'];

function urlSearch(router: Router): FilmsSearchParams {
  return router.state.location.search;
}

/** The URL sync is debounced by 500ms; give it room. */
const URL_SYNC = { timeout: 2000 };

const columnHeaders = () =>
  within(results())
    .queryAllByRole('columnheader')
    .map((header) => header.textContent);

beforeEach(() => {
  respond = () => catalogResponse(CATALOG);
  combinationsRespond = () => listResponse(COMBINATIONS);
  developersRespond = () => listResponse([DEVELOPER]);
  combinationFetches = 0;
  stubFetch();
  stubMatchMedia();
  stubLayout();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mediaListeners.clear();
  localStorage.clear();
  document.body.style.overflow = '';
});

describe.each([
  { name: 'phone', width: PHONE },
  { name: 'tablet', width: TABLET },
  { name: 'desktop', width: DESKTOP },
])('FilmsPage at $name width', ({ width }) => {
  const mobile = width === PHONE;

  it('renders the toolbar at every width, with the sort select on mobile only', async () => {
    await renderFilmsPage({ width });
    await findFilmRow('HP5 Plus');

    expect(searchInput()).toBeVisible();
    expect(
      screen.getByRole('radiogroup', { name: 'Film type' })
    ).toBeInTheDocument();
    expect(screen.getByText('3 films')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Filters/ })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sort')).toBe(
      mobile ? screen.getByLabelText('Sort') : null
    );
  });

  it('announces the result count in the page live region', async () => {
    await renderFilmsPage({ width });
    await findFilmRow('HP5 Plus');

    const live = screen.getByText('3 films found');
    expect(live.tagName).toBe('OUTPUT');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps a focusable skip link target at every width', async () => {
    await renderFilmsPage({ width });
    await findFilmRow('HP5 Plus');

    expect(results().tagName).toBe('DIV');
    expect(results()).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('link', { name: /skip to/i })).toHaveAttribute(
      'href',
      '#film-results'
    );
  });

  it('lists every film: rows on a phone, a sortable table otherwise', async () => {
    await renderFilmsPage({ width });
    await findFilmRow('HP5 Plus');
    expect(filmRow('Brand 400')).toBeInTheDocument();
    expect(filmRow('Portra 400')).toBeInTheDocument();

    if (mobile) {
      expect(within(results()).queryByRole('table')).toBeNull();
      expect(within(results()).getAllByRole('listitem')).toHaveLength(3);
      // Name, then "Brand · Type · N recipes", then ISO.
      await waitFor(() =>
        expect(filmRow('HP5 Plus')).toHaveTextContent(
          'HP5 PlusIlford \u00B7 B&W \u00B7 1 recipeISO 400'
        )
      );
      return;
    }
    expect(within(results()).getByRole('table')).toBeInTheDocument();
    expect(columnHeaders()).toEqual(
      width === DESKTOP
        ? ['Photo', 'Film', 'Type', 'ISO', 'Reciprocity', 'Recipes', 'Status']
        : ['Photo', 'Film', 'Type', 'ISO', 'Recipes']
    );
  });

  it('filters the list through the breakpoint filter module and syncs the URL', async () => {
    const { router } = await renderFilmsPage({ width });
    await findFilmRow('HP5 Plus');

    fireEvent.change(searchInput(), { target: { value: 'portra' } });

    await waitFor(() =>
      expect(
        within(results()).queryByRole('button', { name: /HP5 Plus/ })
      ).not.toBeInTheDocument()
    );
    expect(filmRow('Portra 400')).toBeInTheDocument();
    await waitFor(
      () => expect(urlSearch(router)).toMatchObject({ search: 'portra' }),
      URL_SYNC
    );
  });

  it('opens the film page on click with the real base film, and closes it', async () => {
    const { router } = await renderFilmsPage({ width });
    fireEvent.click(await findFilmRow('Brand 400'));

    const page = getFilmPage('Store Brand 400');
    expect(
      within(page).getByText('Repackaged Ilford HP5 Plus')
    ).toBeInTheDocument();
    expect(
      within(page).queryByText('Repackaged Hp5 Plus')
    ).not.toBeInTheDocument();
    // The film page is a page, not a dialog: it never locks scrolling.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');

    await waitFor(
      () =>
        expect(urlSearch(router)).toMatchObject({ film: 'store-brand-400' }),
      URL_SYNC
    );

    fireEvent.click(
      within(page).getByRole('button', { name: 'Back to films' })
    );

    expect(queryFilmPage('Store Brand 400')).toBeNull();
    await waitFor(
      () => expect(urlSearch(router).film).toBeUndefined(),
      URL_SYNC
    );
  });

  it('moves focus to the heading on open and back to the row on close (#604)', async () => {
    await renderFilmsPage({ width });
    const row = await findFilmRow('Portra 400');
    row.focus();
    fireEvent.click(row);

    const page = getFilmPage('Kodak Portra 400');
    expect(
      within(page).getByRole('heading', { level: 2, name: 'Portra 400' })
    ).toHaveFocus();

    fireEvent.click(
      within(page).getByRole('button', { name: 'Back to films' })
    );

    expect(document.activeElement).toBe(filmRow('Portra 400'));
  });

  it('returns focus to the row when Escape closes the film', async () => {
    await renderFilmsPage({ width });
    fireEvent.click(await findFilmRow('Portra 400'));
    getFilmPage('Kodak Portra 400');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(queryFilmPage('Kodak Portra 400')).toBeNull();
    expect(document.activeElement).toBe(filmRow('Portra 400'));
  });

  it('opens the film page from a ?film= deep link without moving focus', async () => {
    const { router } = await renderFilmsPage({
      width,
      url: '/films?film=store-brand-400',
    });

    const page = await waitFor(() => getFilmPage('Store Brand 400'));
    expect(
      within(page).getByText('Repackaged Ilford HP5 Plus')
    ).toBeInTheDocument();
    expect(within(page).getByRole('heading', { level: 2 })).not.toHaveFocus();

    // Outlast the debounced sync, then check it wrote the slug back.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(urlSearch(router)).toMatchObject({ film: 'store-brand-400' });
    expect(getFilmPage('Store Brand 400')).toBeVisible();
  });

  it('shows recipes on an opened black and white film, linked to /development', async () => {
    await renderFilmsPage({ width, url: '/films?film=hp5-plus' });
    const page = await waitFor(() => getFilmPage('Ilford HP5 Plus'));

    const link = await within(page).findByRole('link', {
      name: /Kodak D-76/,
    });
    expect(link).toHaveAttribute('href', '/development?recipe=recipe-1');
    expect(link).toHaveTextContent('1+1');
    expect(link).toHaveTextContent('9m 30s');
    expect(
      within(page).getByRole('heading', { name: 'Recipes' })
    ).toBeInTheDocument();
  });

  it('never mentions recipes on a color film, even with a recipe row for it', async () => {
    await renderFilmsPage({ width, url: '/films?film=portra-400' });
    const page = await waitFor(() => getFilmPage('Kodak Portra 400'));
    await waitFor(() => expect(combinationFetches).toBeGreaterThan(0));
    expect(page.textContent).not.toMatch(/recipe/i);
    // Nor in its own row in the results, where there are results to see.
    if (width !== PHONE) {
      expect(filmRow('Portra 400').closest('li, tr')).not.toHaveTextContent(
        /recipe/i
      );
    }
  });

  it('leads with About, and shows no recipes section, for a black and white film without recipes', async () => {
    combinationsRespond = () => listResponse([]);
    await renderFilmsPage({ width, url: '/films?film=store-brand-400' });
    const page = await waitFor(() => getFilmPage('Store Brand 400'));
    await waitFor(() => expect(combinationFetches).toBeGreaterThan(0));

    expect(
      within(page).queryByRole('heading', { name: 'Recipes' })
    ).not.toBeInTheDocument();
    expect(
      within(page).queryByRole('link', { name: 'View Development Recipes' })
    ).not.toBeInTheDocument();
    expect(page.textContent).not.toMatch(/\b0\b/);
  });

  it('keeps the plain link to /development when the combinations request fails', async () => {
    combinationsRespond = serverFailure;
    await renderFilmsPage({ width, url: '/films?film=hp5-plus' });
    const page = await waitFor(() => getFilmPage('Ilford HP5 Plus'));
    expect(
      await within(page).findByRole('link', {
        name: 'View Development Recipes',
      })
    ).toHaveAttribute('href', '/development?film=hp5-plus');
  });

  it('falls back to the plain link when developers fail to load', async () => {
    developersRespond = serverFailure;
    await renderFilmsPage({ width, url: '/films?film=hp5-plus' });
    const page = await waitFor(() => getFilmPage('Ilford HP5 Plus'));
    expect(
      await within(page).findByRole('link', {
        name: 'View Development Recipes',
      })
    ).toHaveAttribute('href', '/development?film=hp5-plus');
  });

  it('opens a related film from the film page', async () => {
    await renderFilmsPage({ width, url: '/films?film=hp5-plus' });
    const page = await waitFor(() => getFilmPage('Ilford HP5 Plus'));
    fireEvent.click(
      within(page).getByRole('button', { name: /Store Brand 400/ })
    );
    await waitFor(() => getFilmPage('Store Brand 400'));
    // The related-film tap moves focus to the new page's heading.
    expect(
      within(getFilmPage('Store Brand 400')).getByRole('heading', {
        level: 2,
      })
    ).toHaveFocus();
  });

  it('shares the open film as its ?film= deep link', async () => {
    // A desktop browser, so the link goes to the clipboard.
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      maxTouchPoints: 0,
      clipboard: { writeText },
    });
    window.va = vi.fn();
    await renderFilmsPage({ width });

    fireEvent.click(await findFilmRow('Portra 400'));
    const page = getFilmPage('Kodak Portra 400');
    fireEvent.click(
      within(page).getByRole('button', { name: 'Share this film' })
    );

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/films?film=portra-400&source=share`
      )
    );
    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'share',
      data: { tool: 'film', method: 'clipboard' },
      options: undefined,
    });

    // Sharing the same film again hands over the same link: not recounted.
    fireEvent.click(
      within(page).getByRole('button', { name: 'Share this film' })
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    const shares = vi
      .mocked(window.va)
      .mock.calls.filter((call) => JSON.stringify(call).includes('"share"'));
    expect(shares).toHaveLength(1);
    delete window.va;
  });

  it('counts a shared film link once on arrival and strips the marker', async () => {
    const va = vi.fn();
    window.va = va;
    const { router } = await renderFilmsPage({
      width,
      url: '/films?film=hp5-plus&source=share',
    });
    await waitFor(() => getFilmPage('Ilford HP5 Plus'));

    await waitFor(
      () => expect(urlSearch(router)).toEqual({ film: 'hp5-plus' }),
      URL_SYNC
    );
    const opened = va.mock.calls.filter((call) =>
      JSON.stringify(call).includes('"share_opened"')
    );
    expect(opened).toEqual([
      [
        'event',
        { name: 'share_opened', data: { tool: 'film' }, options: undefined },
      ],
    ]);
    delete window.va;
  });

  it('counts a shared link to the film already open, and the same link again', async () => {
    const va = vi.fn();
    window.va = va;
    const shareOpenedCount = () =>
      va.mock.calls.filter((call) =>
        JSON.stringify(call).includes('"share_opened"')
      ).length;
    const { router } = await renderFilmsPage({
      width,
      url: '/films?film=hp5-plus',
    });
    await waitFor(() => getFilmPage('Ilford HP5 Plus'));
    // Let the debounced sync settle so nothing else is pending.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(shareOpenedCount()).toBe(0);

    // The same film, now through its shared link: no film or filter change.
    const arrive = () =>
      act(() =>
        router.navigate({
          to: '/films',
          search: { film: 'hp5-plus', source: 'share' },
        })
      );
    await arrive();
    await waitFor(
      () => expect(urlSearch(router)).toEqual({ film: 'hp5-plus' }),
      URL_SYNC
    );
    expect(shareOpenedCount()).toBe(1);

    await arrive();
    await waitFor(
      () => expect(urlSearch(router)).toEqual({ film: 'hp5-plus' }),
      URL_SYNC
    );
    expect(shareOpenedCount()).toBe(2);
    expect(getFilmPage('Ilford HP5 Plus')).toBeVisible();
    delete window.va;
  });

  it('does not count a film link without the marker', async () => {
    const va = vi.fn();
    window.va = va;
    await renderFilmsPage({ width, url: '/films?film=hp5-plus' });
    await waitFor(() => getFilmPage('Ilford HP5 Plus'));

    expect(JSON.stringify(va.mock.calls)).not.toContain('share_opened');
    delete window.va;
  });

  it('follows the URL: a new slug swaps the film, a removed one closes it', async () => {
    const { router } = await renderFilmsPage({
      width,
      url: '/films?film=hp5-plus',
    });
    await waitFor(() => getFilmPage('Ilford HP5 Plus'));

    await act(() =>
      router.navigate({ to: '/films', search: { film: 'portra-400' } })
    );
    await waitFor(() => getFilmPage('Kodak Portra 400'));
    expect(queryFilmPage('Ilford HP5 Plus')).toBeNull();

    await act(() => router.navigate({ to: '/films', search: {} }));
    await waitFor(() => expect(queryFilmPage('Kodak Portra 400')).toBeNull());
  });

  it('ignores a ?film= slug that matches no film', async () => {
    await renderFilmsPage({ width, url: '/films?film=no-such-film' });
    await findFilmRow('HP5 Plus');

    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.queryByLabelText('Loading film')).toBeNull();
    expect(filmRow('Portra 400')).toBeInTheDocument();
  });

  it('restores filters from the URL', async () => {
    await renderFilmsPage({ width, url: '/films?search=ilford' });
    await findFilmRow('HP5 Plus');

    expect(searchInput()).toHaveValue('ilford');
    await waitFor(() =>
      expect(
        within(results()).queryByRole('button', { name: /Portra 400/ })
      ).not.toBeInTheDocument()
    );
  });

  it('shows a film skeleton for a deep link until a slow catalog arrives', async () => {
    let release: () => void = () => {
      throw new Error('fetch was never called');
    };
    respond = () =>
      new Promise<Response>((resolve) => {
        release = () => {
          void catalogResponse(CATALOG).then(resolve);
        };
      });

    await renderFilmsPage({ width, url: '/films?film=hp5-plus' });
    expect(queryFilmPage('Ilford HP5 Plus')).toBeNull();

    act(() => release());
    await waitFor(() => getFilmPage('Ilford HP5 Plus'));
  });

  it('shows row placeholders while loading, not the empty state', async () => {
    respond = () => new Promise<Response>(() => {});

    await renderFilmsPage({ width });

    expect(screen.queryByText('No films found')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Loading films')).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('shows the empty state with a working Clear filters button', async () => {
    await renderFilmsPage({ width, url: '/films?search=zzz-no-match' });

    const empty = await screen.findByText('No films found');
    const container = empty.parentElement;
    if (!container) throw new Error('empty state has no container');
    fireEvent.click(
      within(container).getByRole('button', { name: 'Clear filters' })
    );

    expect(await findFilmRow('HP5 Plus')).toBeInTheDocument();
  });

  it('replaces the page body with a retry fallback when nothing loaded', async () => {
    respond = serverFailure;

    await renderFilmsPage({ width });

    expect(
      await screen.findByText(/We couldn't load the film database/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Search films' })
    ).not.toBeInTheDocument();
  });

  it('keeps cached results under a stale-data notice when a refetch fails', async () => {
    const { queryClient } = await renderFilmsPage({ width });
    await findFilmRow('HP5 Plus');

    respond = serverFailure;
    await act(() => queryClient.refetchQueries());

    expect(
      await screen.findByText(/Couldn't refresh the film database/)
    ).toBeInTheDocument();
    expect(filmRow('HP5 Plus')).toBeInTheDocument();
  });

  it('hides the Recipes column and the recipes meta when the combinations request fails', async () => {
    combinationsRespond = serverFailure;
    await renderFilmsPage({ width });
    await findFilmRow('HP5 Plus');
    await waitFor(() => expect(combinationFetches).toBeGreaterThan(0));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(columnHeaders()).not.toContain('Recipes');
    expect(results().textContent).not.toMatch(/recipe/i);
  });

  it('shows no photos in the darkroom theme, on rows or on the film page', async () => {
    await renderFilmsPage({
      width,
      theme: 'darkroom',
      url: '/films?film=hp5-plus',
    });
    const page = await waitFor(() => getFilmPage('Ilford HP5 Plus'));

    expect(document.querySelector('img')).toBeNull();
    expect(within(page).queryByText(/A\. Photographer/)).toBeNull();
    expect(
      within(page).getByRole('heading', { level: 2, name: 'HP5 Plus' })
    ).toBeVisible();
  });

  it('loads photos and credits in the other themes', async () => {
    await renderFilmsPage({
      width,
      theme: 'dark',
      url: '/films?film=hp5-plus',
    });
    const page = await waitFor(() => getFilmPage('Ilford HP5 Plus'));

    expect(within(page).getByRole('img')).toBeInTheDocument();
    expect(within(page).getByText(/A\. Photographer/)).toBeInTheDocument();
  });
});

describe('FilmsPage at wide widths', () => {
  it.each([
    { name: 'desktop', width: DESKTOP, listWidth: 'w-80' },
    { name: 'tablet', width: TABLET, listWidth: 'w-[260px]' },
  ])(
    'shows the table closed and a $name side list beside the page when a film is open',
    async ({ width, listWidth }) => {
      await renderFilmsPage({ width });
      await findFilmRow('Portra 400');
      expect(within(results()).getByRole('table')).toBeInTheDocument();

      fireEvent.click(filmRow('Portra 400'));

      getFilmPage('Kodak Portra 400');
      expect(within(results()).queryByRole('table')).toBeNull();
      expect(results().querySelector('ul')).not.toBeNull();
      expect(filmRow('Portra 400')).toHaveAttribute('aria-current', 'true');
      expect(filmRow('HP5 Plus')).not.toHaveAttribute('aria-current');
      expect(screen.getByRole('article').previousElementSibling).toHaveClass(
        listWidth
      );
      // The toolbar stays above both.
      expect(searchInput()).toBeVisible();
    }
  );

  it('closing returns to the table with the filters intact', async () => {
    const { router } = await renderFilmsPage({ width: DESKTOP });
    await findFilmRow('HP5 Plus');
    fireEvent.change(searchInput(), { target: { value: 'ilford' } });
    await waitFor(() =>
      expect(
        within(results()).queryByRole('button', { name: /Portra 400/ })
      ).toBeNull()
    );

    fireEvent.click(filmRow('HP5 Plus'));
    fireEvent.click(
      within(getFilmPage('Ilford HP5 Plus')).getByRole('button', {
        name: 'Back to films',
      })
    );

    expect(within(results()).getByRole('table')).toBeInTheDocument();
    expect(searchInput()).toHaveValue('ilford');
    expect(filmRow('HP5 Plus')).toBeInTheDocument();
    expect(
      within(results()).queryByRole('button', { name: /Portra 400/ })
    ).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(urlSearch(router)).toMatchObject({ search: 'ilford' });
    expect(urlSearch(router).film).toBeUndefined();
  });

  it('keeps focus on the row when switching films in the side list', async () => {
    await renderFilmsPage({ width: DESKTOP, url: '/films?film=hp5-plus' });
    await waitFor(() => getFilmPage('Ilford HP5 Plus'));

    const portra = filmRow('Portra 400');
    portra.focus();
    fireEvent.click(portra);

    await waitFor(() => getFilmPage('Kodak Portra 400'));
    expect(document.activeElement).toBe(filmRow('Portra 400'));
    expect(filmRow('Portra 400')).toHaveAttribute('aria-current', 'true');
  });

  it('keeps the results mounted when a film opens and closes', async () => {
    await renderFilmsPage({ width: DESKTOP });
    await findFilmRow('Portra 400');
    const scroller = results().querySelector('[tabindex="-1"]');

    fireEvent.click(filmRow('Portra 400'));
    expect(results().querySelector('[tabindex="-1"]')).toBe(scroller);
    fireEvent.click(
      within(getFilmPage('Kodak Portra 400')).getByRole('button', {
        name: 'Back to films',
      })
    );
    expect(results().querySelector('[tabindex="-1"]')).toBe(scroller);
  });

  it('sets the sort from a column header and writes it to the URL', async () => {
    const { router } = await renderFilmsPage({ width: DESKTOP });
    await findFilmRow('HP5 Plus');

    const header = (name: string) =>
      within(results()).getByRole('columnheader', { name });
    expect(header('Film')).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(within(header('ISO')).getByRole('button'));
    expect(header('ISO')).toHaveAttribute('aria-sort', 'ascending');
    expect(header('Film')).not.toHaveAttribute('aria-sort');
    await waitFor(
      () => expect(urlSearch(router)).toMatchObject({ sort: 'iso' }),
      URL_SYNC
    );

    fireEvent.click(within(header('Recipes')).getByRole('button'));
    expect(header('Recipes')).toHaveAttribute('aria-sort', 'descending');
    await waitFor(
      () => expect(urlSearch(router)).toMatchObject({ sort: 'recipes' }),
      URL_SYNC
    );

    fireEvent.click(within(header('Film')).getByRole('button'));
    await waitFor(
      () => expect(urlSearch(router).sort).toBeUndefined(),
      URL_SYNC
    );
  });

  it('removes the Recipes column when the type filter moves to color, and sorts by name', async () => {
    await renderFilmsPage({ width: DESKTOP, url: '/films?sort=recipes' });
    await findFilmRow('HP5 Plus');
    expect(columnHeaders()).toContain('Recipes');
    expect(
      within(results()).getByRole('columnheader', { name: 'Recipes' })
    ).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(screen.getByRole('radio', { name: 'Color' }));

    await waitFor(() => expect(columnHeaders()).not.toContain('Recipes'));
    expect(
      within(results()).getByRole('columnheader', { name: 'Film' })
    ).toHaveAttribute('aria-sort', 'ascending');
    expect(results().textContent).not.toMatch(/recipe/i);
  });

  it('leaves a color film empty in the Recipes cell while black and white shows a count', async () => {
    await renderFilmsPage({ width: DESKTOP });
    await findFilmRow('HP5 Plus');

    const cells = (name: string) => {
      const row = filmRow(name).closest('tr');
      if (!row) throw new Error(`no table row for ${name}`);
      return within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent);
    };
    await waitFor(() => expect(cells('HP5 Plus')[5]).toBe('1'));
    expect(cells('Brand 400')[5]).toBe('1');
    expect(cells('Portra 400')[5]).toBe('');
  });
});

describe('FilmsPage on a phone', () => {
  it('replaces the list with the film page, and Back returns the list', async () => {
    await renderFilmsPage({ width: PHONE });
    fireEvent.click(await findFilmRow('Portra 400'));

    getFilmPage('Kodak Portra 400');
    expect(document.getElementById('film-results')).toBeNull();
    expect(searchInput).toThrow();
    expect(screen.queryByRole('list', { name: /./ })).toBeNull();
    // No results to skip to.
    expect(screen.queryByRole('link', { name: /skip to/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back to films' }));

    expect(queryFilmPage('Kodak Portra 400')).toBeNull();
    expect(filmRow('Portra 400')).toBeInTheDocument();
    expect(searchInput()).toBeVisible();
    expect(screen.getByRole('link', { name: /skip to/i })).toBeVisible();
  });

  it('restores the page scroll position when Back returns to the list', async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(240);
    await renderFilmsPage({ width: PHONE });
    fireEvent.click(await findFilmRow('Portra 400'));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    fireEvent.click(screen.getByRole('button', { name: 'Back to films' }));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 240);
  });
});

describe('FilmsPage across a breakpoint change', () => {
  it('keeps the selected film when the viewport crosses the breakpoint', async () => {
    await renderFilmsPage({ width: PHONE });

    fireEvent.click(await findFilmRow('HP5 Plus'));
    expect(getFilmPage('Ilford HP5 Plus')).toBeVisible();
    expect(document.getElementById('film-results')).toBeNull();

    act(() => setViewport(DESKTOP));
    expect(getFilmPage('Ilford HP5 Plus')).toBeVisible();
    expect(searchInput()).toBeVisible();
    expect(filmRow('HP5 Plus')).toHaveAttribute('aria-current', 'true');

    act(() => setViewport(PHONE));
    expect(getFilmPage('Ilford HP5 Plus')).toBeVisible();
    expect(document.getElementById('film-results')).toBeNull();
  });

  it('carries a typed search across the breakpoint', async () => {
    await renderFilmsPage({ width: DESKTOP });
    await findFilmRow('HP5 Plus');

    fireEvent.change(searchInput(), { target: { value: 'kodak' } });
    act(() => setViewport(PHONE));

    expect(searchInput()).toHaveValue('kodak');
    expect(await findFilmRow('Portra 400')).toBeInTheDocument();
  });
});

describe('FilmsPage sort in the URL', () => {
  const SORT_CATALOG: RawFilm[] = [
    rawFilm({
      id: 1,
      slug: 'hp5-plus',
      brand: 'Ilford',
      name: 'HP5 Plus',
      iso_speed: 400,
    }),
    rawFilm({
      id: 2,
      slug: 'store-brand-100',
      brand: 'Store',
      name: 'Brand 100',
      iso_speed: 100,
    }),
    rawFilm({
      id: 3,
      slug: 'portra-160',
      brand: 'Kodak',
      name: 'Portra 160',
      color_type: 'color',
      iso_speed: 160,
    }),
    rawFilm({
      id: 4,
      slug: 'ektar-200',
      brand: 'Kodak',
      name: 'Ektar 200',
      color_type: 'color',
      iso_speed: 200,
    }),
  ];
  // Store has two recipes and HP5 one, so most-recipes-first reads Store, HP5.
  const SORT_COMBINATIONS = [
    combinationRow(1, 'hp5-plus'),
    combinationRow(2, 'store-brand-100'),
    combinationRow(3, 'store-brand-100'),
  ];

  const NAME_ORDER = [
    'Ilford HP5 Plus',
    'Kodak Ektar 200',
    'Kodak Portra 160',
    'Store Brand 100',
  ];

  beforeEach(() => {
    respond = () => catalogResponse(SORT_CATALOG);
    combinationsRespond = () => listResponse(SORT_COMBINATIONS);
  });

  // Row text reads "Ilford HP5 Plus" in the table and "HP5 Plus" first in the
  // phone rows, so the order is read off the film name alone.
  const NAME_PARTS = ['HP5 Plus', 'Ektar 200', 'Portra 160', 'Brand 100'];

  /** The film rows in rendered order, as the known film names. */
  function cardOrder(): string[] {
    return [...results().querySelectorAll('[data-list-item-key]')].map(
      (row) => {
        const index = NAME_PARTS.findIndex((part) =>
          row.textContent?.includes(part)
        );
        return NAME_ORDER[index] ?? `unknown: ${row.textContent}`;
      }
    );
  }

  async function renderSorted(
    url: string,
    first = 'HP5 Plus',
    width = DESKTOP
  ) {
    const rendered = await renderFilmsPage({ width, url });
    await findFilmRow(first);
    return rendered;
  }

  it('orders by ISO for ?sort=iso', async () => {
    await renderSorted('/films?sort=iso');
    await waitFor(() =>
      expect(cardOrder()).toEqual([
        'Store Brand 100',
        'Kodak Portra 160',
        'Kodak Ektar 200',
        'Ilford HP5 Plus',
      ])
    );
  });

  it('puts the film with the most recipes first for ?sort=recipes', async () => {
    await renderSorted('/films?sort=recipes');
    await waitFor(() => expect(cardOrder()[0]).toMatch(/^Store Brand 100/));
    expect(cardOrder()[1]).toMatch(/^Ilford HP5 Plus/);
  });

  it('keeps sort=recipes in the URL under a colour filter', async () => {
    const { router } = await renderSorted(
      '/films?color=color&sort=recipes',
      'Ektar 200'
    );
    await waitFor(() =>
      expect(cardOrder()).toEqual(['Kodak Ektar 200', 'Kodak Portra 160'])
    );
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(urlSearch(router)).toMatchObject({
      color: 'color',
      sort: 'recipes',
    });
  });

  it('treats an invalid sort as name order and drops it from the URL', async () => {
    const { router } = await renderSorted('/films?sort=bogus');
    expect(cardOrder()).toEqual(NAME_ORDER);
    await waitFor(
      () => expect(urlSearch(router).sort).toBeUndefined(),
      URL_SYNC
    );
  });

  it('keeps the sort when navigating to /films without it', async () => {
    const { router } = await renderSorted('/films?sort=iso');
    await waitFor(() => expect(cardOrder()[0]).toMatch(/^Store Brand/));

    await act(() =>
      router.navigate({ to: '/films', search: { film: 'hp5-plus' } })
    );
    await waitFor(
      () => expect(urlSearch(router)).toMatchObject({ sort: 'iso' }),
      URL_SYNC
    );
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(urlSearch(router)).toMatchObject({ film: 'hp5-plus', sort: 'iso' });
    expect(cardOrder()[0]).toMatch(/^Store Brand/);
  });

  it('restores the sort in the URL after navigating to plain /films', async () => {
    const { router } = await renderSorted('/films?sort=iso');
    await waitFor(() => expect(cardOrder()[0]).toMatch(/^Store Brand/));
    await new Promise((resolve) => setTimeout(resolve, 700));

    await act(() => router.navigate({ to: '/films', search: {} }));
    await waitFor(
      () => expect(urlSearch(router)).toMatchObject({ sort: 'iso' }),
      URL_SYNC
    );
    expect(cardOrder()[0]).toMatch(/^Store Brand/);
  });

  it('omits sort from the URL by default', async () => {
    const { router } = await renderSorted('/films?search=ilford');
    await waitFor(
      () => expect(urlSearch(router)).toMatchObject({ search: 'ilford' }),
      URL_SYNC
    );
    expect(urlSearch(router).sort).toBeUndefined();
  });

  it('sorts from the toolbar select on mobile and writes sort=iso to the URL', async () => {
    const { router } = await renderSorted('/films', 'HP5 Plus', PHONE);

    const sortSelect = screen.getByLabelText('Sort');
    expect(sortSelect).toHaveValue('name');
    fireEvent.change(sortSelect, { target: { value: 'iso' } });

    await waitFor(() => expect(cardOrder()[0]).toMatch(/^Store Brand/));
    expect(sortSelect).toHaveValue('iso');
    await waitFor(
      () => expect(urlSearch(router)).toMatchObject({ sort: 'iso' }),
      URL_SYNC
    );
  });

  it('offers no sort select on desktop, where the headers sort', async () => {
    await renderSorted('/films');
    expect(screen.queryByLabelText('Sort')).not.toBeInTheDocument();
  });
});
