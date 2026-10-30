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

let respond: () => Promise<Response> = () => catalogResponse(CATALOG);

function stubFetch() {
  vi.stubGlobal('fetch', (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
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

/**
 * The search box of whichever filter module is mounted. The mobile module
 * starts collapsed behind its "Filters" toggle, so open that first.
 */
function searchInput(mobile: boolean): HTMLElement {
  if (!mobile) return screen.getByPlaceholderText('Type to search...');
  const existing = screen.queryByPlaceholderText('Search films...');
  if (existing) return existing;
  fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
  return screen.getByPlaceholderText('Search films...');
}

type Router = ReturnType<typeof renderPage>['router'];

function urlSearch(router: Router): FilmsSearchParams {
  return router.state.location.search;
}

/** The URL sync is debounced by 500ms; give it room. */
const URL_SYNC = { timeout: 2000 };

beforeEach(() => {
  respond = () => catalogResponse(CATALOG);
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
  it('renders the breakpoint filter module and no other', async () => {
    await renderFilmsPage({ mobile });
    await findFilmCard(/Ilford HP5 Plus/);

    if (mobile) {
      expect(
        screen.getByRole('button', { name: /^Filters\s*3 films found/ })
      ).toBeInTheDocument();
      expect(searchInput(mobile)).toBeVisible();
      expect(
        screen.queryByPlaceholderText('Type to search...')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Collapse filters' })
      ).not.toBeInTheDocument();
    } else {
      expect(searchInput(mobile)).toBeVisible();
      expect(
        screen.queryByPlaceholderText('Search films...')
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Collapse filters' })
      ).toBeInTheDocument();
    }
  });

  it('keeps the results landmark where it was (desktop main#film-results only)', async () => {
    await renderFilmsPage({ mobile });
    await findFilmCard(/Ilford HP5 Plus/);

    const results = document.getElementById('film-results');
    if (mobile) {
      expect(results).toBeNull();
      expect(screen.queryByRole('main')).not.toBeInTheDocument();
    } else {
      expect(results?.tagName).toBe('MAIN');
    }
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

    fireEvent.change(searchInput(mobile), { target: { value: 'portra' } });

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

  it('narrows the desktop grid to one column while the panel is open', async () => {
    await renderFilmsPage({ mobile });
    fireEvent.click(await findFilmCard(/Kodak Portra 400/));

    const selected = screen.getByRole('button', {
      name: /Kodak Portra 400/,
      pressed: true,
    });
    expect(selected.parentElement?.style.gridTemplateColumns).toBe(
      mobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(1, minmax(0, 1fr))'
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

    expect(searchInput(mobile)).toHaveValue('ilford');
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
      screen.queryByPlaceholderText('Type to search...')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Filters/ })
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
    expect(searchInput(false)).toBeVisible();
    expect(document.body.style.overflow).toBe('');

    act(() => setViewport(true));
    expect(
      screen.getByRole('dialog', { name: 'Ilford HP5 Plus details' })
    ).toBeVisible();
    expect(searchInput(true)).toBeVisible();
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
    expect(
      within(drawer).getByRole('button', { name: /Drag handle/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Collapse to panel' })
    ).not.toBeInTheDocument();
  });

  it('carries a typed search across the breakpoint', async () => {
    await renderFilmsPage({ mobile: false });
    await findFilmCard(/Ilford HP5 Plus/);

    fireEvent.change(searchInput(false), { target: { value: 'kodak' } });
    act(() => setViewport(true));

    expect(searchInput(true)).toHaveValue('kodak');
    expect(await findFilmCard(/Kodak Portra 400/)).toBeInTheDocument();
  });
});
