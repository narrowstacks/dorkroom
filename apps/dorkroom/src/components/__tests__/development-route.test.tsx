import '@testing-library/jest-dom/vitest';
import type { Combination, Developer, Film } from '@dorkroom/api';
import {
  MeasurementProvider,
  ThemeProvider,
  ToastProvider,
  VolumeProvider,
} from '@dorkroom/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
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
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSearch, stringifySearch } from '../../routes/search-params';
import { developmentSearchSchema } from '../../routes/search-schemas';
import { DevelopmentRoute } from '../development-route';

/**
 * The /development route's component with the real page, behind a real router on the
 * browser history (the page reads and writes the URL through the router). A
 * link to the page already open, such as a recipe answer in the nav search,
 * must apply.
 */

const TIMESTAMP = '2026-01-01T00:00:00.000Z';
const RECIPE_ID = '11111111-1111-4111-8111-111111111111';

const HP5: Film = {
  id: 1,
  uuid: 'f1',
  slug: 'hp5-plus',
  brand: 'Ilford',
  name: 'HP5 Plus',
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const DDX: Developer = {
  id: 1,
  uuid: 'd1',
  slug: 'dd-x',
  name: 'DD-X',
  manufacturer: 'Ilford',
  type: 'concentrate',
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const HP5_DDX: Combination = {
  id: 1,
  uuid: RECIPE_ID,
  name: 'HP5 in DD-X',
  filmStockId: 'f1',
  filmSlug: 'hp5-plus',
  developerId: 'd1',
  developerSlug: 'dd-x',
  shootingIso: 400,
  dilutionId: null,
  customDilution: '1+4',
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 9,
  agitationMethod: 'standard',
  agitationSchedule: null,
  pushPull: 0,
  tags: [],
  notes: null,
  infoSource: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

async function renderDevelopment(initialUrl = '/development') {
  window.history.replaceState(null, '', initialUrl);
  // A link outside the page, as the nav search's answer link is. Clicking it
  // is a discrete event: React renders the remounted page before the
  // router's queued history write reaches window.location.
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Link
          to="/development"
          search={{
            film: 'hp5-plus',
            developer: 'dd-x',
            iso: '400',
            dilution: '1+4',
            recipe: RECIPE_ID,
          }}
        >
          Open recipe
        </Link>
        <Outlet />
      </>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/development',
        validateSearch: developmentSearchSchema,
        component: DevelopmentRoute,
      }),
    ]),
    history: createBrowserHistory(),
    parseSearch,
    stringifySearch,
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  // Literal keys: @dorkroom/logic does not publish its query-key factory.
  queryClient.setQueryData(['films', 'list'], [HP5]);
  queryClient.setQueryData(['developers', 'list'], [DDX]);
  queryClient.setQueryData(['combinations', 'list'], [HP5_DDX]);

  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MeasurementProvider>
          <VolumeProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </VolumeProvider>
        </MeasurementProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  // The real recipes page is heavy; under a full parallel run its first render
  // can take longer than findAllByText's default 1s.
  await screen.findAllByText(/Ilford HP5 Plus/, undefined, { timeout: 5000 });
  return router;
}

const detailPanel = () =>
  screen.queryByRole('region', { name: /recipe details$/ });

beforeEach(() => {
  localStorage.clear();
  // Desktop width: the detail panel is a region beside the table.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
  // happy-dom lays nothing out; give the virtualized table a viewport.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 1300, height: 800 })
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1300);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('/development route', () => {
  it('applies a recipe link that arrives while the page is open', async () => {
    const router = await renderDevelopment();
    expect(detailPanel()).toBeNull();

    await act(() =>
      router.navigate({
        to: '/development',
        search: { film: 'hp5-plus', developer: 'dd-x', recipe: RECIPE_ID },
      })
    );

    await waitFor(() =>
      expect(detailPanel()).toHaveAccessibleName(
        'Ilford HP5 Plus with Ilford DD-X recipe details'
      )
    );
    const params = new URLSearchParams(window.location.search);
    expect(params.get('film')).toBe('hp5-plus');
    expect(params.get('developer')).toBe('dd-x');
  });

  it('applies a link clicked while the page shows its own search', async () => {
    await renderDevelopment();
    const box = screen.getByRole('textbox', { name: 'Search recipes' });
    fireEvent.change(box, { target: { value: 'tri-x' } });
    await waitFor(
      () =>
        expect(new URLSearchParams(window.location.search).get('q')).toBe(
          'tri-x'
        ),
      { timeout: 2000 }
    );

    fireEvent.click(screen.getByRole('link', { name: 'Open recipe' }));

    await waitFor(() =>
      expect(detailPanel()).toHaveAccessibleName(
        'Ilford HP5 Plus with Ilford DD-X recipe details'
      )
    );
    // Past the page's 300ms URL writer: it must not put the old search back.
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('film')).toBe('hp5-plus');
    expect(params.get('developer')).toBe('dd-x');
    expect(params.get('recipe')).toBe(RECIPE_ID);
    expect(params.get('q')).toBeNull();
  });

  it('replaces the filters of an open link with those of a new one', async () => {
    const router = await renderDevelopment('/development?film=hp5-plus');
    const historyLength = window.history.length;

    await act(() =>
      router.navigate({
        to: '/development',
        search: { developer: 'dd-x', iso: '400' },
      })
    );

    // Past the page's 300ms URL writer: the remounted page writes back the
    // filters it applied, which are the new link's, not the old film.
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('film')).toBeNull();
    expect(params.get('developer')).toBe('dd-x');
    expect(params.get('iso')).toBe('400');
    // The link pushed one entry; the page's own write replaced it.
    expect(window.history.length).toBe(historyLength + 1);
  });

  it('syncs its filters with a replace that keeps the hash and other params', async () => {
    await renderDevelopment('/development?utm_source=forum#notes');
    const historyLength = window.history.length;
    const box = screen.getByRole('textbox', { name: 'Search recipes' });
    fireEvent.change(box, { target: { value: 'hp5' } });

    await waitFor(
      () =>
        expect(new URLSearchParams(window.location.search).get('q')).toBe(
          'hp5'
        ),
      { timeout: 2000 }
    );
    expect(new URLSearchParams(window.location.search).get('utm_source')).toBe(
      'forum'
    );
    expect(window.location.hash).toBe('#notes');
    expect(window.history.length).toBe(historyLength);
  });

  it('keeps the page mounted while it syncs its own filters to the URL', async () => {
    await renderDevelopment();
    const box = screen.getByRole('textbox', { name: 'Search recipes' });
    box.focus();
    fireEvent.change(box, { target: { value: 'hp5' } });

    // The page's debounced writer puts q= in the URL through the history.
    await waitFor(
      () =>
        expect(new URLSearchParams(window.location.search).get('q')).toBe(
          'hp5'
        ),
      { timeout: 2000 }
    );
    // A remount would have swapped the box for a new, unfocused one.
    expect(screen.getByRole('textbox', { name: 'Search recipes' })).toBe(box);
    expect(box).toHaveFocus();
  });
});
