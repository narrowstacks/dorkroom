/**
 * Rate-limit policy for the Dorkroom API, in one place.
 *
 * Three consumers read it, and none of them restates a number or a namespace
 * rule of its own:
 *  - `withHandler.ts` (Node runtime): keyed and anonymous limits on the data
 *    endpoints.
 *  - `edgeRateLimit.ts` (edge runtime, `api/og.tsx`): the anonymous limit,
 *    and the global budget on the card renders' catalogue lookups.
 *  - `scripts/unkey-keys.ts`: per-key tier limits and namespace bootstrap.
 *
 * The per-key tier limits are also quoted in `docs/API.md`, `api/CLAUDE.md`
 * and `packages/api/CLAUDE.md`; `utils/__tests__/rateLimitPolicy.test.ts`
 * fails if those copies drift from the values here. `api/docs.ts` renders
 * them straight from this module.
 *
 * Keep this file free of Node-only imports: it ships in the edge bundle.
 */

/** Every Unkey ratelimit window in this API is one minute. */
export const RATE_WINDOW_MS = 60_000;

/** Anonymous (per-IP) budget on `dorkroom.art/api/*`, shared by Node and edge handlers. */
export const ANONYMOUS_RATE_LIMIT = 30;
export const ANONYMOUS_RATE_WINDOW_MS = RATE_WINDOW_MS;

/**
 * One budget shared by every `api/og.tsx` render, counted in upstream
 * catalogue calls (a render is charged its worst-case call count up front).
 * The card lookups skip the anonymous `/api/*` limiter (#443), so this is
 * the ceiling on how hard renders can drive the data layer, whatever the
 * spread of client IPs. Generous: share bursts mostly hit the CDN, and a
 * cache miss costs at most a handful of calls.
 */
export const OG_UPSTREAM_RATE_LIMIT = 1200;
export const OG_UPSTREAM_RATE_WINDOW_MS = RATE_WINDOW_MS;

/**
 * The same cost, against a daily bucket. The per-minute cap alone is a burst
 * limit: sustained, 1200/min is 72k calls an hour.
 *
 * Plan assumption: the Supabase project is on the Free plan, about 500k Edge
 * Function invocations a month (roughly 16k a day), and a project over quota
 * can be restricted, which would take the whole site's data down. 10k a day
 * keeps OG cards to at most about 300k a month, leaving room for the site
 * itself. Revisit both numbers if the plan changes.
 *
 * This does not fully protect the quota: the public `dorkroom.art/api/*`
 * path is limited per IP only, with no global ceiling.
 *
 * Unkey allows a window of up to 30 days, so a 24-hour one is fine.
 */
export const OG_UPSTREAM_DAILY_LIMIT = 10_000;
export const OG_UPSTREAM_DAILY_WINDOW_MS = 24 * 60 * RATE_WINDOW_MS;

/**
 * Per-client budgets on the keyed (`api.dorkroom.art`) path, applied only when
 * a request carries a well-formed `X-Client-Id`. The key's own Unkey limit
 * (the tier below) stays a global brake; these bound one install and one IP.
 */
export const CLIENT_RATE_LIMIT = 60;
export const CLIENT_IP_RATE_LIMIT = 240;
export const CLIENT_RATE_WINDOW_MS = RATE_WINDOW_MS;

export type KeyTier = 'free' | 'standard' | 'partner';

export interface KeyTierPolicy {
  /** Requests per `duration` for one API key. */
  limit: number;
  duration: number;
  /** Unkey key prefix, so a leaked key's tier is visible at a glance. */
  defaultPrefix: string;
}

/** Per-key limits written onto each API key when it is issued or re-tiered. */
export const KEY_TIERS = {
  free: { limit: 60, duration: RATE_WINDOW_MS, defaultPrefix: 'dk_f' },
  standard: { limit: 300, duration: RATE_WINDOW_MS, defaultPrefix: 'dk_s' },
  partner: {
    limit: 1_000_000_000,
    duration: RATE_WINDOW_MS,
    defaultPrefix: 'dk_e',
  },
} as const satisfies Record<KeyTier, KeyTierPolicy>;

export type RateLimitScope = 'anonymous' | 'client';

/** The budget `keys:anon-bootstrap` checks a namespace against, per scope. */
export const SCOPE_DEFAULT_LIMIT = {
  anonymous: ANONYMOUS_RATE_LIMIT,
  client: CLIENT_RATE_LIMIT,
} as const satisfies Record<RateLimitScope, number>;

/**
 * Unkey ratelimit namespace for a scope. Resolution order, identical for every
 * consumer: the scope's explicit env var, then `${UNKEY_API_ID}-<scope>`, then
 * `dorkroom-<scope>`.
 *
 * Unkey creates a namespace on first use only when the root key holds
 * `create_namespace`; the runtime fails closed in production without it, so
 * pre-create both with `bun run keys:anon-bootstrap -- --scope <scope>`.
 */
export function getRateLimitNamespace(
  scope: RateLimitScope,
  env: Readonly<Record<string, string | undefined>> = process.env
): string {
  // Literal property reads, never `env[name]`: bundlers that inline env vars
  // at build time (the edge bundle) only recognize `env.NAME`.
  const configured = (
    scope === 'anonymous'
      ? env.UNKEY_ANON_NAMESPACE
      : env.UNKEY_CLIENT_NAMESPACE
  )?.trim();
  if (configured) {
    return configured;
  }

  const apiId = env.UNKEY_API_ID;
  return apiId ? `${apiId}-${scope}` : `dorkroom-${scope}`;
}

/**
 * Unkey reports `reset` as a unix ms timestamp (v2) but has returned a
 * duration in ms before; normalize either to a unix ms timestamp.
 */
export function normalizeResetMs(reset: number, now = Date.now()): number {
  return reset > 1_000_000_000_000 ? reset : now + reset;
}
