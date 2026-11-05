import '@testing-library/jest-dom/vitest';
import type { RawFilm } from '@dorkroom/api';
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
 * Page-level coverage for /films at both breakpoints through one tree (#380).
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
  rawFilm({ id: 1, slug: 'hp5-plus', brand: 'Ilford', name: 'HP5 Plus' }),
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

let viewportIsMobile = false;
const mediaListeners = new Set<(event: { matches: boolean }) => void>();

function setViewport(mobile: boolean) {
  viewportIsMobile = mobile;
  for (const listener of mediaListeners) listener({ matches: mobile });
}

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('max-width') ? viewportIsMobile : false;
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
// render no rows. Give every element a box so the (few) rows render, and give
// the results container a 1300px width (Tailwind xl).
function stubLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 1300, height: 800 })
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1300);
}

// --- rendering --------------------------------------------------------------

function renderPage({
  mobile,
  url = '/films',
}: {
  mobile: boolean;
  url?: string;
}) {
  viewportIsMobile = mobile;

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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return { router, queryClient };
}

/** Renders and waits for the page header, i.e. the route has mounted. */
async function renderFilmsPage(options: { mobile: boolean; url?: string }) {
  const rendered = renderPage(options);
  await screen.findByRole('heading', { name: 'Film Database' });
  return rendered;
}

/** Waits for the catalog to land in the results list. */
function findFilmCard(label: RegExp): Promise<HTMLElement> {
  return screen.findByRole('button', { name: label, pressed: false });
}

function filmCard(label: RegExp): HTMLElement {
  return screen.getByRole('button', { name: label, pressed: false });
}

/** The open detail panel: a dialog drawer on mobile, a section on desktop. */
function getDetailPanel(name: string, mobile: boolean): HTMLElement {
  return mobile
    ? screen.getByRole('dialog', { name })
    : screen.getByRole('region', { name });
}

function queryDetailPanel(name: string): HTMLElement | null {
  return (
    screen.queryByRole('dialog', { name }) ??
    screen.queryByRole('region', { name })
  );
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
  document.body.style.overflow = '';
});

describe.each([
  { width: 'mobile', mobile: true },
  { width: 'desktop', mobile: false },
])('FilmsPage at $width width', ({ mobile }) => {
  it('renders the toolbar at every width, with the sort select on mobile only', async () => {
    await renderFilmsPage({ mobile });
    await findFilmCard(/Ilford HP5 Plus/);

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
    await renderFilmsPage({ mobile });
    await findFilmCard(/Ilford HP5 Plus/);

    const live = screen.getByText('3 films found');
    expect(live.tagName).toBe('OUTPUT');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps a focusable skip link target at every width', async () => {
    await renderFilmsPage({ mobile });
    await findFilmCard(/Ilford HP5 Plus/);

    const results = document.getElementById('film-results');
    expect(results?.tagName).toBe('DIV');
    expect(results).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('link', { name: /skip to/i })).toHaveAttribute(
      'href',
      '#film-results'
    );
  });

  it('lists every film in a two-column grid on mobile and the measured grid on desktop', async () => {
    await renderFilmsPage({ mobile });

    const hp5 = await findFilmCard(/Ilford HP5 Plus/);
    expect(filmCard(/Store Brand 400/)).toBeInTheDocument();
    expect(filmCard(/Kodak Portra 400/)).toBeInTheDocument();

    // Desktop shows the hook's 3-column default, not the 4 a 1300px container
    // measures: the catalog arrives after the loading skeleton, which has no
    // container ref, so the measuring effect ran once against null and never
    // re-ran. Pinned as current behavior; it is not a breakpoint concern.
    expect(hp5.parentElement?.style.gridTemplateColumns).toBe(
      mobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))'
    );
  });

  it('filters the list through the breakpoint filter module and syncs the URL', async () => {
    const { router } = await renderFilmsPage({ mobile });
    await findFilmCard(/Ilford HP5 Plus/);

    fireEvent.change(searchInput(), { target: { value: 'portra' } });

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Ilford HP5 Plus/ })
      ).not.toBeInTheDocument()
    );
    expect(filmCard(/Kodak Portra 400/)).toBeInTheDocument();
    await waitFor(
      () => expect(urlSearch(router)).toMatchObject({ search: 'portra' }),
      URL_SYNC
    );
  });

  it('opens the detail panel on click with the real base film, and closes it', async () => {
    const { router } = await renderFilmsPage({ mobile });
    fireEvent.click(await findFilmCard(/Store Brand 400/));

    const panel = getDetailPanel('Store Brand 400 details', mobile);
    expect(
      within(panel).getByText('Repackaged Ilford HP5 Plus')
    ).toBeInTheDocument();
    expect(
      within(panel).queryByText('Repackaged Hp5 Plus')
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Store Brand 400/, pressed: true })
    ).toBeInTheDocument();
    expect(document.body.style.overflow).toBe(mobile ? 'hidden' : '');

    await waitFor(
      () =>
        expect(urlSearch(router)).toMatchObject({ film: 'store-brand-400' }),
      URL_SYNC
    );

    fireEvent.click(within(panel).getByRole('button', { name: 'Close panel' }));

    expect(queryDetailPanel('Store Brand 400 details')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    await waitFor(
      () => expect(urlSearch(router).film).toBeUndefined(),
      URL_SYNC
    );
  });

  it('keeps focus on the card that opens the panel and returns it there on close (#604)', async () => {
    await renderFilmsPage({ mobile });
    const card = await findFilmCard(/Kodak Portra 400/);
    card.focus();
    fireEvent.click(card);

    const selected = () =>
      screen.getByRole('button', { name: /Kodak Portra 400/, pressed: true });
    const panel = getDetailPanel('Kodak Portra 400 details', mobile);
    // The mobile sheet is modal and takes focus; the desktop sidebar is not,
    // so focus stays on the card even though the narrower grid remounts it.
    if (!mobile) expect(document.activeElement).toBe(selected());

    const close = within(panel).getByRole('button', { name: 'Close panel' });
    close.focus();
    fireEvent.click(close);

    expect(document.activeElement).toBe(filmCard(/Kodak Portra 400/));
  });

  it('narrows the desktop grid to two columns while the panel is open', async () => {
    await renderFilmsPage({ mobile });
    fireEvent.click(await findFilmCard(/Kodak Portra 400/));

    const selected = screen.getByRole('button', {
      name: /Kodak Portra 400/,
      pressed: true,
    });
    expect(selected.parentElement?.style.gridTemplateColumns).toBe(
      'repeat(2, minmax(0, 1fr))'
    );
  });

  it('opens the panel from a ?film= deep link and keeps it in the URL', async () => {
    const { router } = await renderFilmsPage({
      mobile,
      url: '/films?film=store-brand-400',
    });

    const panel = await waitFor(() =>
      getDetailPanel('Store Brand 400 details', mobile)
    );
    expect(
      within(panel).getByText('Repackaged Ilford HP5 Plus')
    ).toBeInTheDocument();

    // Outlast the debounced sync, then check it wrote the slug back.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(urlSearch(router)).toMatchObject({ film: 'store-brand-400' });
    expect(getDetailPanel('Store Brand 400 details', mobile)).toBeVisible();
  });

  it('shows recipes on an opened black and white film, linked to /development', async () => {
    await renderFilmsPage({ mobile, url: '/films?film=hp5-plus' });
    const panel = await waitFor(() =>
      getDetailPanel('Ilford HP5 Plus details', mobile)
    );

    const link = await within(panel).findByRole('link', {
      name: /Kodak D-76/,
    });
    expect(link).toHaveAttribute('href', '/development?recipe=recipe-1');
    expect(link).toHaveTextContent('1+1');
    expect(link).toHaveTextContent('9m 30s');
    expect(
      within(panel).getByRole('heading', { name: 'Recipes' })
    ).toBeInTheDocument();
  });

  it('never mentions recipes on a color film, even with a recipe row for it', async () => {
    await renderFilmsPage({ mobile, url: '/films?film=portra-400' });
    const panel = await waitFor(() =>
      getDetailPanel('Kodak Portra 400 details', mobile)
    );
    await waitFor(() => expect(combinationFetches).toBeGreaterThan(0));
    expect(panel.textContent).not.toMatch(/recipe/i);
  });

  it('keeps the plain link to /development when the combinations request fails', async () => {
    combinationsRespond = serverFailure;
    await renderFilmsPage({ mobile, url: '/films?film=hp5-plus' });
    const panel = await waitFor(() =>
      getDetailPanel('Ilford HP5 Plus details', mobile)
    );
    expect(
      await within(panel).findByRole('link', {
        name: 'View Development Recipes',
      })
    ).toHaveAttribute('href', '/development?film=hp5-plus');
  });

  it('falls back to the plain link when developers fail to load', async () => {
    developersRespond = serverFailure;
    await renderFilmsPage({ mobile, url: '/films?film=hp5-plus' });
    const panel = await waitFor(() =>
      getDetailPanel('Ilford HP5 Plus details', mobile)
    );
    expect(
      await within(panel).findByRole('link', {
        name: 'View Development Recipes',
      })
    ).toHaveAttribute('href', '/development?film=hp5-plus');
  });

  it('opens a related film from the film page', async () => {
    await renderFilmsPage({ mobile, url: '/films?film=hp5-plus' });
    const panel = await waitFor(() =>
      getDetailPanel('Ilford HP5 Plus details', mobile)
    );
    fireEvent.click(
      within(panel).getByRole('button', { name: /Store Brand 400/ })
    );
    await waitFor(() => getDetailPanel('Store Brand 400 details', mobile));
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
    await renderFilmsPage({ mobile });

    fireEvent.click(await findFilmCard(/Kodak Portra 400/));
    const panel = getDetailPanel('Kodak Portra 400 details', mobile);
    fireEvent.click(
      within(panel).getByRole('button', { name: 'Share this film' })
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
      within(panel).getByRole('button', { name: 'Share this film' })
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
      mobile,
      url: '/films?film=hp5-plus&source=share',
    });
    await waitFor(() => getDetailPanel('Ilford HP5 Plus details', mobile));

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
      mobile,
      url: '/films?film=hp5-plus',
    });
    await waitFor(() => getDetailPanel('Ilford HP5 Plus details', mobile));
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
    expect(getDetailPanel('Ilford HP5 Plus details', mobile)).toBeVisible();
    delete window.va;
  });

  it('does not count a film link without the marker', async () => {
    const va = vi.fn();
    window.va = va;
    await renderFilmsPage({ mobile, url: '/films?film=hp5-plus' });
    await waitFor(() => getDetailPanel('Ilford HP5 Plus details', mobile));

    expect(JSON.stringify(va.mock.calls)).not.toContain('share_opened');
    delete window.va;
  });

  it('follows the URL: a new slug swaps the film, a removed one closes it', async () => {
    const { router } = await renderFilmsPage({
      mobile,
      url: '/films?film=hp5-plus',
    });
    await waitFor(() => getDetailPanel('Ilford HP5 Plus details', mobile));

    await act(() =>
      router.navigate({ to: '/films', search: { film: 'portra-400' } })
    );
    await waitFor(() => getDetailPanel('Kodak Portra 400 details', mobile));
    expect(queryDetailPanel('Ilford HP5 Plus details')).toBeNull();

    await act(() => router.navigate({ to: '/films', search: {} }));
    await waitFor(() =>
      expect(queryDetailPanel('Kodak Portra 400 details')).toBeNull()
    );
  });

  it('restores filters from the URL', async () => {
    await renderFilmsPage({ mobile, url: '/films?search=ilford' });
    await findFilmCard(/Ilford HP5 Plus/);

    expect(searchInput()).toHaveValue('ilford');
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Kodak Portra 400/ })
      ).not.toBeInTheDocument()
    );
  });

  it('opens a deep link once a slow catalog arrives', async () => {
    let release: () => void = () => {
      throw new Error('fetch was never called');
    };
    respond = () =>
      new Promise<Response>((resolve) => {
        release = () => {
          void catalogResponse(CATALOG).then(resolve);
        };
      });

    await renderFilmsPage({ mobile, url: '/films?film=hp5-plus' });
    expect(queryDetailPanel('Ilford HP5 Plus details')).toBeNull();

    act(() => release());
    await waitFor(() => getDetailPanel('Ilford HP5 Plus details', mobile));
  });

  it('shows card skeletons while loading, not the empty state', async () => {
    respond = () => new Promise<Response>(() => {});

    await renderFilmsPage({ mobile });

    expect(screen.queryByText('No films found')).not.toBeInTheDocument();
    // Three rows of the column count: 2 on mobile, and on desktop the 3-column
    // default, since the skeleton grid has no container to measure.
    expect(screen.getAllByLabelText('Loading film card')).toHaveLength(
      mobile ? 6 : 9
    );
  });

  it('shows the empty state with a working Clear filters button', async () => {
    await renderFilmsPage({ mobile, url: '/films?search=zzz-no-match' });

    const empty = await screen.findByText('No films found');
    const results = empty.parentElement;
    if (!results) throw new Error('empty state has no container');
    fireEvent.click(
      within(results).getByRole('button', { name: 'Clear filters' })
    );

    expect(await findFilmCard(/Ilford HP5 Plus/)).toBeInTheDocument();
  });

  it('replaces the page body with a retry fallback when nothing loaded', async () => {
    respond = serverFailure;

    await renderFilmsPage({ mobile });

    expect(
      await screen.findByText(/We couldn't load the film database/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Search films' })
    ).not.toBeInTheDocument();
  });

  it('keeps cached results under a stale-data notice when a refetch fails', async () => {
    const { queryClient } = await renderFilmsPage({ mobile });
    await findFilmCard(/Ilford HP5 Plus/);

    respond = serverFailure;
    await act(() => queryClient.refetchQueries());

    expect(
      await screen.findByText(/Couldn't refresh the film database/)
    ).toBeInTheDocument();
    expect(filmCard(/Ilford HP5 Plus/)).toBeInTheDocument();
  });

  it('unmounts the panel on close, so a reopened panel starts fresh', async () => {
    await renderFilmsPage({ mobile });

    fireEvent.click(await findFilmCard(/Ilford HP5 Plus/));
    let panel = getDetailPanel('Ilford HP5 Plus details', mobile);

    if (!mobile) {
      fireEvent.click(
        within(panel).getByRole('button', { name: 'Expand to full screen' })
      );
      expect(
        screen.getByRole('dialog', { name: 'Ilford HP5 Plus details' })
      ).toBeVisible();
      fireEvent.click(
        screen.getAllByRole('button', { name: 'Collapse to panel' })[0]
      );
      panel = getDetailPanel('Ilford HP5 Plus details', mobile);
    }

    fireEvent.click(within(panel).getByRole('button', { name: 'Close panel' }));
    expect(queryDetailPanel('Ilford HP5 Plus details')).toBeNull();

    fireEvent.click(filmCard(/Kodak Portra 400/));
    panel = getDetailPanel('Kodak Portra 400 details', mobile);
    if (!mobile) {
      expect(
        within(panel).getByRole('button', { name: 'Expand to full screen' })
      ).toBeInTheDocument();
    }
  });
});

describe('FilmsPage across a breakpoint change', () => {
  it('keeps the selected film when the viewport crosses the breakpoint', async () => {
    await renderFilmsPage({ mobile: true });

    fireEvent.click(await findFilmCard(/Ilford HP5 Plus/));
    expect(
      screen.getByRole('dialog', { name: 'Ilford HP5 Plus details' })
    ).toBeVisible();

    act(() => setViewport(false));
    expect(
      screen.getByRole('region', { name: 'Ilford HP5 Plus details' })
    ).toBeVisible();
    expect(searchInput()).toBeVisible();
    expect(document.body.style.overflow).toBe('');

    act(() => setViewport(true));
    expect(
      screen.getByRole('dialog', { name: 'Ilford HP5 Plus details' })
    ).toBeVisible();
    expect(searchInput()).toBeVisible();
  });

  it('drops an expanded panel back to the drawer when crossing to mobile', async () => {
    await renderFilmsPage({ mobile: false });

    fireEvent.click(await findFilmCard(/Ilford HP5 Plus/));
    fireEvent.click(
      within(
        screen.getByRole('region', { name: 'Ilford HP5 Plus details' })
      ).getByRole('button', { name: 'Expand to full screen' })
    );
    expect(
      screen.getAllByRole('button', { name: 'Collapse to panel' }).length
    ).toBeGreaterThan(0);

    act(() => setViewport(true));

    const drawer = screen.getByRole('dialog', {
      name: 'Ilford HP5 Plus details',
    });
    // The drag handle is pointer-only, so it is hidden from the a11y tree.
    expect(
      drawer.querySelector('[aria-label^="Drag handle"]')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Collapse to panel' })
    ).not.toBeInTheDocument();
  });

  it('carries a typed search across the breakpoint', async () => {
    await renderFilmsPage({ mobile: false });
    await findFilmCard(/Ilford HP5 Plus/);

    fireEvent.change(searchInput(), { target: { value: 'kodak' } });
    act(() => setViewport(true));

    expect(searchInput()).toHaveValue('kodak');
    expect(await findFilmCard(/Kodak Portra 400/)).toBeInTheDocument();
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

  /** The film cards in rendered order, as the known film names. */
  function cardOrder(): string[] {
    return screen
      .getAllByRole('button', {
        name: /^(Ilford|Kodak|Store) /,
        pressed: false,
      })
      .map(
        (card) =>
          NAME_ORDER.find((name) => card.textContent?.includes(name)) ??
          `unknown: ${card.textContent}`
      );
  }

  async function renderSorted(
    url: string,
    first = /Ilford HP5 Plus/,
    mobile = false
  ) {
    const rendered = await renderFilmsPage({ mobile, url });
    await findFilmCard(first);
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
      /Kodak Ektar 200/
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
    const { router } = await renderSorted('/films', /Ilford HP5 Plus/, true);

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

  it('offers no sort select on desktop until header sorting lands', async () => {
    await renderSorted('/films');
    expect(screen.queryByLabelText('Sort')).not.toBeInTheDocument();
  });
});
