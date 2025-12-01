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
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
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
