// Point the shared @dorkroom/api singleton at the public API for mobile.
//
// The `@dorkroom/logic` hooks (useFilms / useDevelopers / useCombinations) call
// fetch helpers bound to a module-level `apiClient` that defaults to the
// same-origin proxy ('/api') used by the web app. The native app has no proxy,
// so it must hit https://api.dorkroom.art directly with an X-API-Key. We
// reconfigure that singleton once, at startup, before any query runs.
import { configureApiClient, PUBLIC_API_BASE_URL } from '@dorkroom/api';

/**
 * Free-tier public key (`dk_f_*`, 60 req/min, read-only public data). Inlined
 * at build time from `EXPO_PUBLIC_DORKROOM_API_KEY` (an EAS secret / .env
 * value). Never hard-code the key here — a missing value surfaces as an
 * auth error from the API, which the query error states handle.
 */
const API_KEY = process.env.EXPO_PUBLIC_DORKROOM_API_KEY;

let configured = false;

/**
 * Configure the Dorkroom API client for native use. Idempotent; safe to call
 * from a module side-effect. Must run before the first films/developers/
 * combinations query.
 */
export function configureDorkroomApi(): void {
  if (configured) {
    return;
  }
  configureApiClient({ baseUrl: PUBLIC_API_BASE_URL, apiKey: API_KEY });
  configured = true;

  if (__DEV__ && !API_KEY) {
    console.warn(
      '[dorkroom] EXPO_PUBLIC_DORKROOM_API_KEY is unset — live API requests ' +
        'will be rejected. Set it in apps/mobile/.env (see .env.example).'
    );
  }
}
