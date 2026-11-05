import '@testing-library/jest-dom/vitest';
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
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { filmsSearchSchema } from '../../../../routes/search-schemas';

const FILM = {
  id: 1,
  uuid: 'hp5-uuid',
  slug: 'hp5-plus',
  brand: 'Ilford',
  name: 'HP5 Plus',
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
};

const requested: string[] = [];

// Recipes are decided once, when the page module loads, from the real e-ink
// check (the `monochrome` media feature). So the media query is stubbed before
// the page is imported, and this file keeps its own module graph.
const stubMatchMedia = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(monochrome)',
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));

let FilmsPage: typeof import('../films-page').default;

beforeAll(async () => {
  stubMatchMedia();
  ({ default: FilmsPage } = await import('../films-page'));
});

beforeEach(() => {
  requested.length = 0;
  vi.stubGlobal('fetch', (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    requested.push(url);
    return Promise.resolve(
      new Response(JSON.stringify({ data: [FILM], count: 1 }), {
        headers: { 'content-type': 'application/json' },
      })
    );
  });
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FilmsPage on an e-ink device', () => {
  it('does not fetch combinations and keeps the link to /development', async () => {
    const rootRoute = createRootRoute({ component: Outlet });
    const filmsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/films',
      validateSearch: filmsSearchSchema,
      component: FilmsPage,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([filmsRoute]),
      history: createMemoryHistory({
        initialEntries: ['/films?film=hp5-plus'],
      }),
    });
    render(
      <ThemeProvider>
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ThemeProvider>
    );

    const panel = await waitFor(() =>
      screen.getByRole('article', { name: 'Ilford HP5 Plus' })
    );
    expect(
      within(panel).getByRole('link', { name: 'View Development Recipes' })
    ).toHaveAttribute('href', '/development?film=hp5-plus');

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(requested.some((url) => url.endsWith('/api/films'))).toBe(true);
    expect(requested.some((url) => url.includes('combinations'))).toBe(false);
    expect(requested.some((url) => url.includes('developers'))).toBe(false);
  });
});
