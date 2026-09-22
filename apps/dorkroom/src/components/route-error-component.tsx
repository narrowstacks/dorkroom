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

import { ErrorFallback } from '@dorkroom/ui';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';

/**
 * Chunk-load failures a retry can't fix: `React.lazy` caches a rejected
 * dynamic import permanently, so re-rendering the same lazy route (what
 * `router.invalidate()`'s retry does) throws the identical error again — only
 * a full page reload builds a fresh module graph. Pattern covers Vite's own
 * `vite:preloadError` payload plus the browser module-loading errors it
 * wraps (Chromium/Firefox/Safari phrase dynamic-import and CSS-preload
 * failures differently).
 */
const CHUNK_LOAD_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

/**
 * The router's `defaultErrorComponent` (see `routeErrorOptions` in
 * `../app/lib/route-error-options`, spread into `createRouter` in main.tsx).
 *
 * TanStack Router gives every matched route its own error boundary keyed off
 * `route.options.errorComponent ?? router.options.defaultErrorComponent`. That
 * boundary sits around the route's own slot in the tree, not around its
 * parent's — so when this fires for a nested route, `__root.tsx`'s header and
 * nav (rendered by the *parent* match, which gets this same default component
 * but never throws) stay mounted, and only the failed route's content area is
 * replaced. Setting `errorComponent` on the root route instead would catch
 * the error one level higher, at the boundary wrapping the root layout
 * itself, which would take the header down with it.
 *
 * The outer app-level `ErrorBoundary` around `<RouterProvider>` (main.tsx)
 * still exists, but now only ever sees an error thrown outside the router
 * entirely — e.g. from one of the providers wrapping it (`ThemeProvider`,
 * `QueryClientProvider`, …) or from the `<Analytics>` component next to it —
 * or one thrown by this component itself. A root-route render error still
 * goes through this same `defaultErrorComponent`/`defaultOnCatch`, just
 * without a surviving header, since the root match is what renders the
 * header in the first place.
 */
export function RouteErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter();
  const err = error instanceof Error ? error : null;
  const isChunkLoadError = err
    ? CHUNK_LOAD_ERROR_PATTERN.test(err.message)
    : false;

  const tryAgain = { label: 'Try Again', onClick: () => router.invalidate() };
  const reloadPage = {
    label: 'Reload Page',
    onClick: () => window.location.reload(),
  };

  // A retry can't recover from a chunk-load failure (see the pattern above),
  // so lead with the action that actually can.
  const [primary, secondary] = isChunkLoadError
    ? [reloadPage, tryAgain]
    : [tryAgain, reloadPage];

  return (
    <ErrorFallback
      error={err}
      message="We ran into a problem loading this page. Try again, or reload the page if that keeps happening."
      reloadLabel={primary.label}
      onReload={primary.onClick}
      secondaryAction={secondary}
    />
  );
}
