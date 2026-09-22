import { ErrorBoundary } from '@dorkroom/ui';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { lazy, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routeErrorOptions } from '../../app/lib/route-error-options';

function ThrowingPage(): never {
  throw new Error('boom');
}

/**
 * A stand-in for the real app: a root layout with a header and nav around an
 * `<Outlet />`, plus a `/border` route rendering `component`. Spreads
 * `routeErrorOptions`, the exact object main.tsx uses, so this exercises the
 * real wiring rather than a copy that could silently drift from it.
 */
function buildRouter(component: ComponentType) {
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
    ...routeErrorOptions,
  });
}

describe('RouteErrorComponent', () => {
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
    expect(
      screen.getByRole('button', { name: 'Try Again' })
    ).toBeInTheDocument();
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

  it('offers a Reload Page action for a chunk-load failure, since a retry alone cannot recover from it', async () => {
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
    // Both actions are offered — a retry never helps here, but it's still on
    // offer alongside the reload in case the failure was misclassified.
    expect(
      screen.getByRole('button', { name: 'Reload Page' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try Again' })
    ).toBeInTheDocument();
  });
});
