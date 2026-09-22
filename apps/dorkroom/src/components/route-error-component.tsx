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
 * The router's `defaultErrorComponent` (wired up in main.tsx).
 *
 * TanStack Router gives every matched route its own error boundary keyed off
 * `route.options.errorComponent ?? router.options.defaultErrorComponent`. That
 * boundary sits around the route's own slot in the tree, not around its
 * parent's — so when this fires for a nested route, `__root.tsx`'s header and
 * nav (rendered by the *parent* match) stay mounted, and only the failed
 * route's content area is replaced. Setting `errorComponent` on the root
 * route instead would catch the error one level higher, at the boundary
 * wrapping the root layout itself, which would take the header down with it.
 *
 * `app_error` is reported from `defaultOnCatch` in main.tsx, not from an
 * effect here: `onCatch` fires exactly once per caught error, the same way
 * `componentDidCatch` does for the outer app-level `ErrorBoundary` (which
 * wraps `<RouterProvider>` and only ever sees errors from outside the router,
 * e.g. a render error in `__root.tsx` itself — a per-route boundary here means
 * the two never fire for the same error).
 */
export function RouteErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <ErrorFallback
      error={error instanceof Error ? error : null}
      reloadLabel="Try Again"
      // Per TanStack Router's docs, `router.invalidate()` covers both a
      // failed loader (by re-running it) and a render error (it also bumps
      // the boundary's reset key), so it works as the retry action regardless
      // of which one produced this error.
      onReload={() => {
        router.invalidate();
      }}
    />
  );
}
