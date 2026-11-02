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

import { type ComponentType, lazy, type LazyExoticComponent } from 'react';

/** A `React.lazy` page whose chunk a route loader can start ahead of render. */
export type LazyPage<P extends object> = LazyExoticComponent<
  ComponentType<P>
> & {
  /**
   * Starts loading the page's chunk and returns at once. Safe to call any
   * number of times: the import is shared with the lazy component, so the
   * chunk downloads once. Pass `speculative` (the loader's `preload` flag)
   * when nobody has asked for the page yet: see
   * {@link isSpeculativeImportInFlight}.
   */
  preload: (speculative?: boolean) => void;
};

/**
 * Page imports in flight that only a speculative preload (hover, focus,
 * touch) asked for. A render or a real navigation joining the import takes
 * it off the count, and every import leaves it when it settles.
 */
let speculativeImports = 0;

/**
 * Whether a page chunk is loading only because a link was hovered, focused
 * or touched. The stale-chunk recovery reads this to skip its reload: a
 * hover must not reload the page. A click afterwards imports the chunk
 * again, non-speculatively, and that failure reloads as before.
 */
export function isSpeculativeImportInFlight(): boolean {
  return speculativeImports > 0;
}

const preloaders = new WeakMap<WeakKey, (speculative?: boolean) => void>();

/**
 * `React.lazy` plus a fire-and-forget `preload`, for a route's `loader`.
 *
 * The router runs loaders on intent (`defaultPreload: 'intent'`) and at the
 * start of every navigation, before the route renders, so a loader that calls
 * `preload` starts the chunk on hover and, on a click, in parallel with the
 * page's data prefetches instead of after them. `preload` deliberately
 * returns nothing: a loader that returned the promise would make the router
 * hold the previous page until the chunk arrived, where today the route
 * renders straight away and the page's own `<Suspense>` spinner covers the
 * wait.
 *
 * A failed import is dropped, so the next call (or the lazy component's
 * render, which surfaces the failure to the route's error boundary as
 * before) tries again.
 */
export function lazyPage<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>
): LazyPage<P> {
  let pending: Promise<{ default: ComponentType<P> }> | undefined;
  let pendingIsSpeculative = false;
  const leaveSpeculative = () => {
    if (!pendingIsSpeculative) return;
    pendingIsSpeculative = false;
    speculativeImports -= 1;
  };
  const begin = (speculative: boolean) => {
    if (pending) {
      if (!speculative) leaveSpeculative();
      return pending;
    }
    const attempt = load();
    pending = attempt;
    pendingIsSpeculative = speculative;
    if (speculative) speculativeImports += 1;
    attempt.then(
      () => {
        if (pending === attempt) leaveSpeculative();
      },
      () => {
        if (pending !== attempt) return;
        leaveSpeculative();
        pending = undefined;
      }
    );
    return attempt;
  };
  const preload = (speculative = false) => {
    begin(speculative).catch(() => undefined);
  };
  const page = Object.assign(
    lazy(() => begin(false)),
    { preload }
  );
  preloaders.set(page, preload);
  return page;
}

/**
 * Calls `preload` on a component made by `lazyPage`, and does nothing for any
 * other component. For helpers such as `calculatorRoute` that take a page as
 * a plain component type: requiring a `LazyPage` there would weaken the
 * check that a route hands a page its own link params.
 */
export function preloadPage<P>(
  component: ComponentType<P>,
  speculative = false
): void {
  preloaders.get(component)?.(speculative);
}
