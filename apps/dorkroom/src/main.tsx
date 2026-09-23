/**
 * Dorkroom
 * Copyright (C) 2026 Aaron F. Anderson <aaron@affords.art>
 *
 * Licensed under the GNU Affero General Public License, version 3, WITH the
 * additional permission for app store distribution granted under AGPLv3
 * section 7. See LICENSE and LICENSE-EXCEPTION at the repository root.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/react';
import { lazy, StrictMode, Suspense } from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  currentRouteLabel,
  redactAnalyticsUrl,
} from './app/lib/analytics/redact';
import { trackEvent } from './app/lib/analytics/tracked-events';
import { installVitePreloadErrorRecovery } from './app/lib/preload-chunk-recovery';
import { parseSearch, stringifySearch } from './routes/search-params';
import '@fontsource-variable/montserrat/index.css';
import '@fontsource-variable/fraunces/index.css';
import './styles.css';
import {
  ErrorBoundary,
  MeasurementProvider,
  ThemeProvider,
  ToastProvider,
  VolumeProvider,
} from '@dorkroom/ui';
import { routeFallbackOptions } from './app/lib/route-fallback-options';
import { routeTree } from './routeTree.gen';

// Lazy load devtools only in development
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((module) => ({
          default: module.ReactQueryDevtools,
        }))
      )
    : () => null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreloadDelay: 50,
  // Keep search params as plain strings instead of JSON-parsing them; see
  // ./routes/search-params for why.
  parseSearch,
  stringifySearch,
  // Gives every matched route its own styled error boundary (see
  // ./components/route-fallback), instead of falling through to TanStack's
  // built-in one. That built-in boundary wraps the *entire* match tree, so an
  // uncaught render error was replacing the root layout — header, nav,
  // everything — with an unstyled "Something went wrong!" box, and the
  // app-level ErrorBoundary around <RouterProvider> never saw the error to
  // report it. `defaultErrorComponent`/`defaultOnCatch` scope each boundary to
  // its own route instead, so the layout survives and the fallback UI renders
  // in its place.
  ...routeFallbackOptions,
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

installVitePreloadErrorRecovery();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html is missing its #root element');

const root = ReactDOM.createRoot(rootElement);

root.render(
  <StrictMode>
    <Analytics
      // Vite does not expose NODE_ENV the way the auto-detector expects, so
      // name the mode rather than letting it guess and report dev traffic.
      mode={
        process.env.NODE_ENV === 'production' ? 'production' : 'development'
      }
      beforeSend={redactAnalyticsUrl}
    />
    <ErrorBoundary
      // Route only. The error message is deliberately left out: it is
      // unbounded text that can quote whatever the user typed.
      onError={() => trackEvent('app_error', { route: currentRouteLabel() })}
    >
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
        {process.env.NODE_ENV === 'development' && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
