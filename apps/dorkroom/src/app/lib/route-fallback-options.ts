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

import type { ErrorInfo } from 'react';
import { RouteFallback } from '../../components/route-fallback';
import { currentRouteLabel } from './analytics/redact';
import { trackEvent } from './analytics/tracked-events';
import { wasRecentPreloadReload } from './preload-chunk-recovery';

/**
 * `defaultErrorComponent`/`defaultOnCatch` for `createRouter`, kept together
 * in one exported object (rather than inlined separately in main.tsx) so a
 * test can import the exact options the app uses instead of redeclaring its
 * own copy that could silently drift from main.tsx.
 *
 * Deliberately not in `../../components/route-fallback.tsx`: that file
 * exports only the `RouteFallback` component, which is what keeps
 * react-doctor's `only-export-components` rule (a Fast Refresh boundary
 * check) happy — a non-component export like this object belongs in a
 * plain module instead.
 */
export const routeFallbackOptions = {
  defaultErrorComponent: RouteFallback,
  /**
   * Fires exactly once per caught error, mirroring the outer `ErrorBoundary`'s
   * `onError` in main.tsx. `route` is deliberately the only property: see
   * that `onError` for why the raw error message isn't included.
   *
   * Clicking "Try Again" on a *deterministic* render error re-throws the same
   * error every time, so repeated clicks re-report `app_error` on every one —
   * that's accepted here; there's no dedupe.
   */
  defaultOnCatch: (_error: Error, _errorInfo: ErrorInfo) => {
    // A stale-chunk error whose reload is already in flight isn't a real,
    // still-broken error worth counting — the reload about to happen is the
    // fix, not a fresh failure. See wasRecentPreloadReload.
    if (wasRecentPreloadReload()) {
      return;
    }
    trackEvent('app_error', { route: currentRouteLabel() });
  },
};
