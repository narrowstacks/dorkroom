import '@testing-library/jest-dom/vitest';
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
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import { Route as rootRouteOptions } from '../__root';

// `__root.tsx` intentionally exports only `Route` (react-doctor's
// only-export-components rule blocks a component file from also exporting a
// non-component, which a named `RootComponent` export would trip). The
// component itself is reachable off the route object the same way the router
// reads it internally (see `route.options.component` in
// @tanstack/react-router's `Match.js`).
// SAFETY: `createRootRoute({ component: RootComponent })` in `__root.tsx`
// always sets `options.component` to a component function; the router relies
// on this same field being set to render the route (see `Match.js` above).
const RootComponent = rootRouteOptions.options.component as ComponentType;

/**
 * Regression cover for #345: on phones (<640px), the fixed mobile-nav toggle
 * (`MobileNav`, bottom-right, size-12) sat directly on top of whatever a
 * route rendered last — e.g. the right-aligned "Next" pagination button on
 * /development — so tapping it opened the nav drawer instead. `<main>` now
 * reserves space below the content on small screens so nothing can end up
 * under the floating button. A real geometry/overlap check isn't possible in
 * jsdom (no layout engine), so this asserts the reserved-space class is
 * present on the main content container instead.
 */
async function renderRootLayout() {
  const rootRoute = createRootRoute({ component: RootComponent });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>page content</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
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

  await screen.findByText('page content');
}

describe('root layout', () => {
  it('reserves space below the main content on small screens so nothing sits under the floating mobile-nav toggle, and removes it at sm+', async () => {
    await renderRootLayout();

    const main = document.getElementById('main-content');
    expect(main).not.toBeNull();
    expect(main).toHaveClass(
      'pb-[calc(env(safe-area-inset-bottom)+5rem)]',
      'sm:pb-0'
    );
  });
});
