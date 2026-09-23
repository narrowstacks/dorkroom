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

const RELOAD_GUARD_KEY = 'vite-preload-reload-at';
const RELOAD_GUARD_WINDOW_MS = 10_000;

/**
 * Recover from stale chunk hashes after a new deploy (or a failed HMR fetch
 * in dev): when a lazy route's module can't be fetched, reload once to pick
 * up the current index.html. The timestamp guard prevents an infinite reload
 * loop if the chunk is genuinely unreachable (e.g. offline), while still
 * allowing recovery from a future deploy.
 *
 * `event.preventDefault()` is called *only* when a reload is actually
 * scheduled. Vite's preload helper re-throws the original error when the
 * event's default action isn't prevented, so leaving it un-prevented here
 * lets the real chunk error surface (and reach a React error boundary)
 * instead of being silently swallowed while the guard is cooling down.
 *
 * `sessionStorage` access is wrapped in `try`/`catch`: private-mode Safari,
 * a full quota, or a locked-down embed can all make it throw. When that
 * happens there's no safe way to tell whether a reload loop is already in
 * progress, so this bails out entirely — no reload, no `preventDefault()` —
 * and lets the error surface instead of guessing.
 */
export function handleVitePreloadError(event: Event): void {
  const now = Date.now();
  let lastReload: number;
  try {
    lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
  } catch {
    return;
  }
  if (now - lastReload <= RELOAD_GUARD_WINDOW_MS) {
    return;
  }
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
}

/**
 * Whether {@link handleVitePreloadError} scheduled a reload within the last
 * `windowMs` (default ~2s — comfortably longer than it takes `reload()` to
 * actually navigate away, shorter than the 10s reload-loop guard above).
 *
 * Used to skip reporting `app_error` for a route error caused by a stale
 * chunk that's about to be fixed by that reload: `React.lazy` caches a
 * rejected import forever, so once a chunk fails, every remaining render
 * before the reload takes effect throws the same error again, and none of
 * those retries reflect a real, still-broken error worth counting.
 */
export function wasRecentPreloadReload(windowMs = 2_000): boolean {
  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    return Date.now() - lastReload <= windowMs;
  } catch {
    return false;
  }
}

/** Registers {@link handleVitePreloadError} for Vite's `vite:preloadError` event. */
export function installVitePreloadErrorRecovery(): void {
  window.addEventListener('vite:preloadError', handleVitePreloadError);
}
