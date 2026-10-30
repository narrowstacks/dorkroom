import { ErrorBoundary } from '@dorkroom/ui';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouteComponent,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import { lazy, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routeFallbackOptions } from '../../app/lib/route-fallback-options';

function ThrowingPage(): never {
  throw new Error('boom');
}

/**
 * A stand-in for the real app: a root layout with a header and nav around an
 * `<Outlet />`, plus a `/border` route rendering `component`. Spreads
 * `routeFallbackOptions`, the exact object main.tsx uses, so this exercises
 * the real wiring rather than a copy that could silently drift from it.
 */
function buildRouter(component: RouteComponent) {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <header>App Header</header>
        <nav>App Nav</nav>
        <main>
          <Outlet />
        </main>
      </>
    ),
  });
  const childRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/border',
    component,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([childRoute]),
    history: createMemoryHistory({ initialEntries: ['/border'] }),
    ...routeFallbackOptions,
  });
}

/**
 * The fallback's action labels in DOM order. `ErrorFallback` renders the
 * primary action first and the secondary after it, and RouteFallback always
 * offers both, so the order is the only thing a chunk-load error changes.
 */
function fallbackActions(): string[] {
  return within(screen.getByRole('alert'))
    .getAllByRole('button')
    .map((button) => button.textContent ?? '');
}

describe('RouteFallback', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // currentRouteLabel() reads the real window location, not the router's
    // (memory) history, so it has to be pointed at the route under test.
    window.history.replaceState({}, '', '/border');
    window.va = vi.fn();
    // wasRecentPreloadReload() reads this key; a leftover value from another
    // test (or a real preload failure earlier in the suite) would otherwise
    // suppress app_error here for the wrong reason.
    sessionStorage.clear();
    // A route render throw is expected here; keep it out of the test output,
    // matching how the rest of the repo tests error boundaries.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete window.va;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('renders the styled fallback in place of the failed route, with the header and nav still mounted', async () => {
    render(<RouterProvider router={buildRouter(ThrowingPage)} />);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('App Header')).toBeInTheDocument();
    expect(screen.getByText('App Nav')).toBeInTheDocument();
    // An ordinary render error leads with the in-app retry.
    expect(fallbackActions()).toEqual(['Try Again', 'Reload Page']);
  });

  it('reports app_error exactly once, and does not also reach an outer boundary', async () => {
    const outerOnError = vi.fn();

    render(
      <ErrorBoundary onError={outerOnError}>
        <RouterProvider router={buildRouter(ThrowingPage)} />
      </ErrorBoundary>
    );

    await screen.findByText('Something went wrong');

    expect(window.va).toHaveBeenCalledTimes(1);
    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'app_error',
      data: { route: '/border' },
      options: undefined,
    });
    expect(outerOnError).not.toHaveBeenCalled();
  });

  it('leads with Reload Page for a chunk-load failure, since a retry alone cannot recover from it', async () => {
    // React.lazy caches a rejected import permanently: once this module
    // "fails to load", every subsequent render throws the same error again,
    // exactly like a stale chunk after a deploy. router.invalidate() (the
    // "Try Again" action) re-renders the same route and hits the same cached
    // rejection, so it can never recover from this — only a full reload can.
    const RejectingLazy = lazy(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module'))
    );
    function ChunkFailurePage() {
      return (
        <Suspense fallback={<div>Loading…</div>}>
          <RejectingLazy />
        </Suspense>
      );
    }

    render(<RouterProvider router={buildRouter(ChunkFailurePage)} />);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    // Reload leads, since it is the only action that can recover. The retry
    // stays on offer second in case the failure was misclassified.
    expect(fallbackActions()).toEqual(['Reload Page', 'Try Again']);
  });
});

/**
 * `defaultOnCatch` skips `app_error` while a stale-chunk reload is already in
 * flight: that reload is the fix, and every render before it lands re-throws
 * the same cached rejection. The key and window come from
 * `preload-chunk-recovery.ts`; only `Date` is faked, so nothing here depends on
 * how long the test takes to run.
 */
describe('routeFallbackOptions.defaultOnCatch', () => {
  const RELOAD_GUARD_KEY = 'vite-preload-reload-at';
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    window.history.replaceState({}, '', '/border');
    window.va = vi.fn();
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    delete window.va;
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('does not report app_error while a preload reload is in flight', () => {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(NOW - 500));

    routeFallbackOptions.defaultOnCatch();

    expect(window.va).not.toHaveBeenCalled();
  });

  it('reports app_error once the preload reload is no longer recent', () => {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(NOW - 2_001));

    routeFallbackOptions.defaultOnCatch();

    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'app_error',
      data: { route: '/border' },
      options: undefined,
    });
  });
});
