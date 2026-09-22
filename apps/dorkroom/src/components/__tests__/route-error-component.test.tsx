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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentRouteLabel } from '../../app/lib/analytics/redact';
import { trackEvent } from '../../app/lib/analytics/tracked-events';
import { RouteErrorComponent } from '../route-error-component';

function ThrowingPage(): never {
  throw new Error('boom');
}

/**
 * A stand-in for the real app: a root layout with a header and nav around an
 * `<Outlet />`, plus one route that throws during render. Wires up
 * `defaultErrorComponent`/`defaultOnCatch` the same way main.tsx does.
 */
function buildRouter() {
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
  const boomRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/border',
    component: ThrowingPage,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([boomRoute]),
    history: createMemoryHistory({ initialEntries: ['/border'] }),
    defaultErrorComponent: RouteErrorComponent,
    defaultOnCatch: () =>
      trackEvent('app_error', { route: currentRouteLabel() }),
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
    render(<RouterProvider router={buildRouter()} />);

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
        <RouterProvider router={buildRouter()} />
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
});
