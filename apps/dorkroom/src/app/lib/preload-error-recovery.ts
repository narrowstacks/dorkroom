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
 */
export function handleVitePreloadError(event: Event): void {
  const now = Date.now();
  const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
  if (now - lastReload > RELOAD_GUARD_WINDOW_MS) {
    event.preventDefault();
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    window.location.reload();
  }
}

/** Registers {@link handleVitePreloadError} for Vite's `vite:preloadError` event. */
export function installVitePreloadErrorRecovery(): void {
  window.addEventListener('vite:preloadError', handleVitePreloadError);
}
