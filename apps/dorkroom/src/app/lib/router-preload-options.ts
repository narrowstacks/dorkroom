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

/**
 * The preload options for `createRouter`, in their own module (like
 * `routeFallbackOptions`) so a test can build its router with exactly the
 * app's.
 */
export const routerPreloadOptions = {
  // Preload a route when a link to it is hovered or focused (after 50 ms) or
  // touched: that runs its loader with `preload: true`, which starts the page
  // chunk. Data waits for the navigation itself, since a touch-scroll over a
  // link counts as intent. Without `defaultPreload` the router never
  // preloads, and the delay did nothing.
  defaultPreload: 'intent',
  defaultPreloadDelay: 50,
  // The loaders only start work and keep nothing themselves (TanStack Query
  // holds the data), so let every navigation call them even right after a
  // preload, and leave freshness to the query cache. This is the router docs'
  // setting for an external cache. Without it, a navigation within 30 s of a
  // hover reused the preload and never prefetched the page's data.
  defaultPreloadStaleTime: 0,
} as const;
