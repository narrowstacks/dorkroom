import '@testing-library/jest-dom/vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LENS_CALCULATOR_LINK_PARAMS, LENS_STORAGE_KEY } from '@dorkroom/logic';
import {
  MeasurementProvider,
  ThemeProvider,
  ToastProvider,
  VolumeProvider,
} from '@dorkroom/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  type RouteComponent,
  RouterProvider,
} from '@tanstack/react-router';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SITE_SEARCH_SETTLE_MS } from '../../../app/lib/analytics/use-site-search-analytics';
import LensCalculatorPage from '../../../app/pages/lens-calculator/lens-calculator-page';
import { Route as rootRouteOptions } from '../../../routes/__root';
import { parseSearch, stringifySearch } from '../../../routes/search-params';
import { calculatorRoute } from '../../calculator-route';
import { SearchPanel } from '../search-panel';

// SAFETY: `__root.tsx` sets `options.component`; see root-layout.test.tsx.
const RootComponent = rootRouteOptions.options.component as RouteComponent;

/** Routes the search's links point at, as stand-ins. */
const STUB_PATHS = [
  '/border',
  '/stops',
  '/resize',
  '/mat',
  '/reciprocity',
  '/development',
  '/exposure',
  '/films',
];

/** The real root layout, with /lenses as the app declares it. */
async function renderApp(url: string) {
  const rootRoute = createRootRoute({ component: RootComponent });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => <SearchPanel variant="hero" />,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/lenses',
        ...calculatorRoute(
          'lenses',
          LENS_CALCULATOR_LINK_PARAMS,
          LensCalculatorPage
        ),
      }),
      ...STUB_PATHS.map((path) =>
        createRoute({
          getParentRoute: () => rootRoute,
          path,
          component: () => (
            <label>
              {path} field
              <input />
            </label>
          ),
        })
      ),
    ]),
    history: createMemoryHistory({ initialEntries: [url] }),
    parseSearch,
    stringifySearch,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
  await waitFor(() =>
    expect(screen.getByRole('main')).not.toBeEmptyDOMElement()
  );
  return router;
}

/**
 * The header's Search button. On '/' the hero's answer card renders a second
 * banner, so take the site header, which comes first.
 */
const headerSearchButton = () =>
  within(screen.getAllByRole('banner')[0]).getByRole('button', {
    name: 'Search',
  });
const findDialog = () => screen.findByRole('dialog', { name: 'Search' });
const box = () =>
  within(screen.getByRole('dialog')).getByRole('combobox', {
    name: /search/i,
  });
const type = (text: string) =>
  fireEvent.change(box(), { target: { value: text } });

beforeEach(() => {
  window.localStorage.clear();
  // The catalog loads once the box takes focus; an empty one is enough here.
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(JSON.stringify({ data: [], count: 0 }), {
        headers: { 'content-type': 'application/json' },
      })
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  // jsdom has no scrollIntoView; drop the stub the home test adds.
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

describe('nav search', () => {
  it('focuses the home page’s own search box there, never opening a second one', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await renderApp('/');
    const heroBox = within(screen.getByRole('main')).getByRole('combobox');

    // The header keeps the same buttons as on every other page.
    expect(headerSearchButton()).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(headerSearchButton());
    expect(heroBox).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
    expect(screen.queryByRole('dialog')).toBeNull();

    heroBox.blur();
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    expect(heroBox).toHaveFocus();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens from the header button into the search box, and Escape closes it back to the button', async () => {
    await renderApp('/border');
    expect(
      screen.getAllByRole('button', { name: 'Search' }),
      'the header button and the phone button'
    ).toHaveLength(2);

    expect(headerSearchButton()).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(headerSearchButton());
    const dialog = await findDialog();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(box()).toHaveFocus());
    // Try chips only: no example answer until something is typed.
    expect(
      within(dialog).getByRole('button', { name: 'tri-x 30s' })
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/^Example:/)).toBeNull();
    expect(within(dialog).queryByRole('link')).toBeNull();
    // No "/" key hint: the box already has focus, so "/" would type a slash.
    expect(dialog.querySelector('kbd')).toBeNull();

    // No options until something is typed.
    expect(box()).toHaveAttribute('aria-expanded', 'false');

    // With a query, one Escape closes the dialog rather than clearing the box.
    type('80mm on 6x6');
    await waitFor(() => expect(box()).toHaveAttribute('aria-expanded', 'true'));
    fireEvent.keyDown(box(), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(headerSearchButton()).toHaveFocus();

    // The next open starts afresh: an empty box and the Try chips.
    fireEvent.click(headerSearchButton());
    await findDialog();
    await waitFor(() => expect(box()).toHaveFocus());
    expect(box()).toHaveValue('');
    expect(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'tri-x 30s',
      })
    ).toBeInTheDocument();
  });

  it('opens the top result with Enter, and closes', async () => {
    const router = await renderApp('/border');
    fireEvent.click(headerSearchButton());
    await findDialog();

    type('16x20 mat 8x10');
    await screen.findByRole('article', { name: /16×20 mat, 8×10 print/ });
    // The answer is preselected, so Enter opens it.
    const top = within(screen.getByRole('dialog')).getByRole('option', {
      selected: true,
    });
    expect(box()).toHaveAttribute('aria-activedescendant', top.id);
    fireEvent.keyDown(box(), { key: 'Enter' });

    await waitFor(() => expect(router.state.location.pathname).toBe('/mat'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens with Ctrl+K or Cmd+K from anywhere, and with "/" outside a text field', async () => {
    await renderApp('/border');
    const field = screen.getByRole('textbox', { name: '/border field' });

    // "/" typed into a field is just a slash.
    field.focus();
    fireEvent.keyDown(field, { key: '/' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Ctrl+K works even from inside a field, and focus goes back there.
    fireEvent.keyDown(field, { key: 'k', ctrlKey: true });
    await findDialog();
    await waitFor(() => expect(box()).toHaveFocus());
    fireEvent.keyDown(box(), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(field).toHaveFocus();

    fireEvent.keyDown(document.body, { key: 'K', metaKey: true });
    await findDialog();
    fireEvent.keyDown(box(), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.keyDown(document.body, { key: '/' });
    expect(await findDialog()).toBeInTheDocument();
  });

  it('closes when a result navigates', async () => {
    const router = await renderApp('/border');
    fireEvent.click(headerSearchButton());
    await findDialog();

    type('16x20 mat 8x10');
    const answer = await screen.findByRole('article', {
      name: /16×20 mat, 8×10 print/,
    });
    fireEvent.click(within(answer).getByRole('link', { name: /open in mat/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/mat'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes when a result links to the page already open', async () => {
    const router = await renderApp('/border');
    fireEvent.click(headerSearchButton());
    await findDialog();

    type('border');
    // While there is a query the result rows are the box's options.
    fireEvent.click(
      await within(screen.getByRole('dialog')).findByRole('option', {
        name: /border calculator/i,
      })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(router.state.location.pathname).toBe('/border');
  });

  it('stays open when the page updates its own search params', async () => {
    const router = await renderApp('/films');
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    await findDialog();

    // As /films does when it syncs its filters to the URL.
    await act(() =>
      router.navigate({
        to: '/films',
        search: { search: 'hp5' },
        replace: true,
      })
    );

    expect(router.state.location.search).toEqual({ search: 'hp5' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('applies an answer for the calculator already open', async () => {
    window.localStorage.setItem(
      LENS_STORAGE_KEY,
      JSON.stringify({ focalLength: 35 })
    );
    const router = await renderApp('/lenses');
    const focalLength = () =>
      screen.findByRole('spinbutton', { name: /Focal length/ });
    await waitFor(async () => expect(await focalLength()).toHaveValue(35));

    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    await findDialog();
    type('80mm on 6x6');
    const answer = await screen.findByRole('article', {
      name: '80mm on 6×6 as Full Frame',
    });
    fireEvent.click(
      within(answer).getByRole('link', { name: /open in lens equivalency/i })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(async () => expect(await focalLength()).toHaveValue(80));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  describe('analytics', () => {
    const va = vi.fn();

    beforeEach(() => {
      va.mockReset();
      window.va = va;
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
      delete window.va;
    });

    it('reports a settled search as nav_search, never the query text', async () => {
      await renderApp('/border');
      fireEvent.click(headerSearchButton());
      await findDialog();

      type('11x14 6x7 1.45');
      await act(async () => {
        vi.advanceTimersByTime(SITE_SEARCH_SETTLE_MS + 50);
      });

      await waitFor(() =>
        expect(va).toHaveBeenCalledWith('event', {
          name: 'nav_search',
          data: { result: 'border', count: expect.any(Number) },
          options: undefined,
        })
      );
      const sent = JSON.stringify(va.mock.calls);
      expect(sent).not.toContain('11x14');
      expect(sent).not.toContain('home_search');
    });

    it('opens a calculator answer without counting it as an opened share', async () => {
      const router = await renderApp('/lenses');
      const focalLength = () =>
        screen.findByRole('spinbutton', { name: /Focal length/ });
      await focalLength();

      fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
      await findDialog();
      type('80mm on 6x6');
      const answer = await screen.findByRole('article', {
        name: '80mm on 6×6 as Full Frame',
      });
      const link = within(answer).getByRole('link', {
        name: /open in lens equivalency/i,
      });
      // The answer links with the calculator's own params, never the marker.
      expect(link.getAttribute('href')).toContain('focal=80');
      expect(link.getAttribute('href')).not.toContain('source=');
      fireEvent.click(link);

      await waitFor(async () => expect(await focalLength()).toHaveValue(80));
      await waitFor(() => expect(router.state.location.search).toEqual({}));
      const sent = JSON.stringify(va.mock.calls);
      expect(sent).not.toContain('share_opened');
    });
  });
});

describe('nav search bundle', () => {
  const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

  /** Relative modules `file` imports statically (dynamic `import()` excluded). */
  function staticImports(file: string): string[] {
    const source = readFileSync(file, 'utf8');
    return [
      ...source.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+'(\.[^']+)'/gm),
    ]
      .map(([, path]) => resolve(dirname(file), path))
      .flatMap((base) =>
        ['.tsx', '.ts', '/index.ts']
          .map((ext) => base + ext)
          .filter((candidate) => existsSync(candidate))
      );
  }

  it('keeps the search panel out of the root layout’s static imports', () => {
    const seen = new Set<string>();
    const stack = [join(srcDir, 'routes/__root.tsx')];
    for (let file = stack.pop(); file !== undefined; file = stack.pop()) {
      if (seen.has(file)) continue;
      seen.add(file);
      stack.push(...staticImports(file));
    }
    const reached = [...seen].map((file) => file.slice(srcDir.length + 1));

    expect(reached).toContain('components/search/nav-search.tsx');
    expect(reached).not.toContain('components/search/search-dialog.tsx');
    expect(reached).not.toContain('components/search/search-panel.tsx');
    expect(
      readFileSync(join(srcDir, 'components/search/nav-search.tsx'), 'utf8')
    ).toContain("import('./search-dialog')");
  });
});
