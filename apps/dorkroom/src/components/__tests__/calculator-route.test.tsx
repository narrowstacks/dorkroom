import '@testing-library/jest-dom/vitest';
import {
  type CalculatorLinkSearch,
  clearPresetFromUrl,
  LENS_CALCULATOR_LINK_PARAMS,
  LENS_STORAGE_KEY,
  MAT_CALCULATOR_LINK_PARAMS,
} from '@dorkroom/logic';
import {
  createBrowserHistory,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import { type ComponentType, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LensCalculatorPage from '../../app/pages/lens-calculator/lens-calculator-page';
import MatCalculatorPage from '../../app/pages/mat-calculator/mat-calculator-page';
import { parseSearch, stringifySearch } from '../../routes/search-params';
import { calculatorRoute } from '../calculator-route';

type LensLinkSearch = CalculatorLinkSearch<
  keyof typeof LENS_CALCULATOR_LINK_PARAMS
>;

/**
 * The /lenses route as the app declares it. A memory history by default;
 * pass `browser` to run on the real (jsdom) window history.
 */
function renderLensesRoute(
  url: string,
  {
    page = LensCalculatorPage,
    browser = false,
  }: {
    page?: ComponentType<{ linkSearch?: LensLinkSearch }>;
    browser?: boolean;
  } = {}
) {
  const rootRoute = createRootRoute({ component: Outlet });
  const lensesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/lenses',
    ...calculatorRoute('lenses', LENS_CALCULATOR_LINK_PARAMS, page),
  });
  if (browser) window.history.replaceState(null, '', url);
  const router = createRouter({
    routeTree: rootRoute.addChildren([lensesRoute]),
    history: browser
      ? createBrowserHistory()
      : createMemoryHistory({ initialEntries: [url] }),
    parseSearch,
    stringifySearch,
  });
  render(<RouterProvider router={router} />);
  cleanups.push(() => router.history.destroy());
  return router;
}

const cleanups: (() => void)[] = [];

const focalLengthInput = () =>
  screen.findByRole('spinbutton', { name: /Focal length/ });

describe('calculatorRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('opens the calculator pre-filled from its link params, over stored inputs', async () => {
    window.localStorage.setItem(
      LENS_STORAGE_KEY,
      JSON.stringify({ focalLength: 35, sourceFormat: 'aps-c-canon' })
    );
    renderLensesRoute('/lenses?focal=80&from=film-6x6&to=full-frame');

    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(80));
    await waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(LENS_STORAGE_KEY) ?? '{}'
      );
      expect(stored).toEqual({
        focalLength: 80,
        sourceFormat: 'film-6x6',
        targetFormat: 'full-frame',
      });
    });
  });

  it('strips its own params from the URL once read, keeping the others', async () => {
    const router = renderLensesRoute('/lenses?focal=80&utm=home');

    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(80));
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ utm: 'home' })
    );
    expect(router.state.location.pathname).toBe('/lenses');
  });

  it('drops an invalid param and keeps the stored value', async () => {
    window.localStorage.setItem(
      LENS_STORAGE_KEY,
      JSON.stringify({ focalLength: 35 })
    );
    const router = renderLensesRoute('/lenses?focal=-5');

    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(35));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it('leaves a URL without link params alone', async () => {
    const router = renderLensesRoute('/lenses?utm=home');
    await focalLengthInput();
    expect(router.state.location.search).toEqual({ utm: 'home' });
  });

  it("does not put back a param the page cleared itself (the border calculator's preset)", async () => {
    // Renders synchronously, so its effect runs before the route's strip,
    // the order a cached lazy page gives. It clears `preset` the way
    // useUrlPresetLoader does: a raw history.replaceState.
    function PresetClearingPage({
      linkSearch,
    }: {
      linkSearch?: LensLinkSearch;
    }) {
      useEffect(() => clearPresetFromUrl(), []);
      return <p>focal {linkSearch?.focal}</p>;
    }
    const router = renderLensesRoute('/lenses?preset=abc&focal=80&utm=home', {
      page: PresetClearingPage,
      browser: true,
    });

    expect(await screen.findByText('focal 80')).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe('?utm=home'));
    expect(router.state.location.search).toEqual({ utm: 'home' });
  });

  it('applies a link to the calculator already open, and strips it again', async () => {
    window.localStorage.setItem(
      LENS_STORAGE_KEY,
      JSON.stringify({ focalLength: 35 })
    );
    const router = renderLensesRoute('/lenses?utm=home');
    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(35));

    // What a search answer's link does from /lenses itself.
    await act(() =>
      router.navigate({
        to: '/lenses',
        search: { focal: '80', from: 'film-6x6', to: 'full-frame' },
      })
    );

    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(80));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    await waitFor(() =>
      expect(
        JSON.parse(window.localStorage.getItem(LENS_STORAGE_KEY) ?? '{}')
      ).toMatchObject({ focalLength: 80, sourceFormat: 'film-6x6' })
    );
  });

  it('remounts the page once per link, never for its own strip', async () => {
    const mounts: (LensLinkSearch | undefined)[] = [];
    function MountCountingPage({
      linkSearch,
    }: {
      linkSearch?: LensLinkSearch;
    }) {
      useEffect(() => {
        mounts.push(linkSearch);
      }, [linkSearch]);
      return <p>focal {linkSearch?.focal ?? 'none'}</p>;
    }
    const router = renderLensesRoute('/lenses?focal=50', {
      page: MountCountingPage,
    });
    expect(await screen.findByText('focal 50')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search).toEqual({}));

    // A same-route navigation without link params leaves the page alone.
    await act(() => router.navigate({ to: '/lenses', search: { utm: 'x' } }));
    await act(() =>
      router.navigate({ to: '/lenses', search: { focal: '80', utm: 'x' } })
    );
    expect(await screen.findByText('focal 80')).toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ utm: 'x' })
    );

    expect(mounts).toEqual([{ focal: '50' }, { focal: '80' }]);
  });

  it('only accepts a page that reads its own link params', () => {
    // @ts-expect-error the mat page reads the mat link, not the lens one
    calculatorRoute('lenses', LENS_CALCULATOR_LINK_PARAMS, MatCalculatorPage);
    expect(
      calculatorRoute('mat', MAT_CALCULATOR_LINK_PARAMS, MatCalculatorPage)
    ).toHaveProperty('component');
  });
});

/**
 * A link from a Share button carries `source=share`. The route counts the
 * arrival as `share_opened` once, and strips the marker with the link params.
 * `window.va` is the queue `@vercel/analytics` forwards to.
 */
describe('calculatorRoute opened shares', () => {
  const shareOpened = [
    'event',
    { name: 'share_opened', data: { tool: 'lenses' }, options: undefined },
  ];
  const va = vi.fn();
  const shareOpenedCalls = () =>
    va.mock.calls.filter((call) =>
      JSON.stringify(call).includes('"share_opened"')
    );

  beforeEach(() => {
    window.localStorage.clear();
    va.mockReset();
    window.va = va;
  });

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    delete window.va;
  });

  it('reports share_opened once for a shared link and strips the marker', async () => {
    const router = renderLensesRoute(
      '/lenses?focal=80&to=full-frame&source=share&utm=x'
    );

    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(80));
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ utm: 'x' })
    );
    expect(va).toHaveBeenCalledWith(...shareOpened);
    expect(shareOpenedCalls()).toHaveLength(1);
  });

  it('applies the link params whatever the marker says', async () => {
    const router = renderLensesRoute('/lenses?focal=80&source=share');

    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(80));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it('does not report a link without the marker', async () => {
    const router = renderLensesRoute('/lenses?focal=80');

    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(80));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(shareOpenedCalls()).toHaveLength(0);
  });

  it('strips a marker with another value without reporting it', async () => {
    const router = renderLensesRoute('/lenses?focal=80&source=newsletter');

    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(shareOpenedCalls()).toHaveLength(0);
  });

  it('strips and reports a marker that arrives with no link params', async () => {
    const router = renderLensesRoute('/lenses?source=share');

    await focalLengthInput();
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(shareOpenedCalls()).toHaveLength(1);
  });

  it('reports the same shared link again when it lands on the inputs it already applied', async () => {
    const router = renderLensesRoute('/lenses?focal=80&source=share');
    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(80));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(shareOpenedCalls()).toHaveLength(1);

    await act(() =>
      router.navigate({
        to: '/lenses',
        search: { focal: '80', source: 'share' },
      })
    );
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(await focalLengthInput()).toHaveValue(80);
    expect(shareOpenedCalls()).toHaveLength(2);
  });

  it('reports a second shared link that lands while the route is open', async () => {
    const router = renderLensesRoute('/lenses?focal=50&source=share');
    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(50));
    await waitFor(() => expect(router.state.location.search).toEqual({}));

    // Same-route navigations: an unmarked link, then a marked one.
    await act(() =>
      router.navigate({ to: '/lenses', search: { focal: '65' } })
    );
    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(65));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(shareOpenedCalls()).toHaveLength(1);

    await act(() =>
      router.navigate({
        to: '/lenses',
        search: { focal: '80', source: 'share' },
      })
    );
    await waitFor(async () => expect(await focalLengthInput()).toHaveValue(80));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(shareOpenedCalls()).toHaveLength(2);
  });
});
