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
  type RouteComponent,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
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
const RootComponent = rootRouteOptions.options.component as RouteComponent;

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
  it('reserves space below the main content on small screens so nothing sits under the floating mobile-nav toggle, and removes it at lg+', async () => {
    await renderRootLayout();

    const main = document.getElementById('main-content');
    expect(main).not.toBeNull();
    expect(main).toHaveClass(
      'pb-[calc(env(safe-area-inset-bottom)+5rem)]',
      'lg:pb-0'
    );
  });

  it('keeps the logo link named while the wordmark is visually hidden below xl', async () => {
    await renderRootLayout();

    const wordmark = screen.getByText('Dorkroom', {
      selector: 'header a span',
    });
    // jsdom has no layout, so assert the class: sr-only keeps the text in the
    // accessibility tree, where display:none would leave the link unnamed.
    expect(wordmark).toHaveClass('sr-only', 'xl:not-sr-only');
    expect(wordmark).not.toHaveClass('hidden');
    expect(wordmark.closest('a')).toHaveAccessibleName('Dorkroom');
  });

  // #552: the padding above only clears the END of the page. Mid-scroll,
  // recipe times and match badges slid under the floating buttons. A bar
  // behind them, as tall as that padding, keeps content out from under them
  // at every scroll position.
  it('docks the floating buttons in a bar as tall as the reserved padding, below lg only', async () => {
    await renderRootLayout();

    const bar = screen.getByTestId('mobile-fab-bar');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveClass(
      'fixed',
      'bottom-0',
      'h-[calc(env(safe-area-inset-bottom)+5rem)]',
      'lg:hidden'
    );
  });
});
