import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/react';
import { lazy, StrictMode, Suspense } from 'react';
import * as ReactDOM from 'react-dom/client';
import '@fontsource-variable/montserrat/index.css';
import './styles.css';
import {
  ErrorBoundary,
  MeasurementProvider,
  ThemeProvider,
  ToastProvider,
  VolumeProvider,
} from '@dorkroom/ui';
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
      refetchOnWindowFocus: true,
    },
  },
});

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreloadDelay: 50,
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Recover from stale chunk hashes after a new deploy (or a failed HMR fetch in
// dev): when a lazy route's module can't be fetched, reload once to pick up the
// current index.html. The timestamp guard prevents an infinite reload loop if
// the chunk is genuinely unreachable (e.g. offline), while still allowing
// recovery from a future deploy.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const now = Date.now();
  const lastReload = Number(
    sessionStorage.getItem('vite-preload-reload-at') ?? 0
  );
  if (now - lastReload > 10_000) {
    sessionStorage.setItem('vite-preload-reload-at', String(now));
    window.location.reload();
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <Analytics />
    <ErrorBoundary>
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
