/**
 * Rate-limit policy for the Dorkroom API, in one place.
 *
 * Three consumers read it, and none of them restates a number or a namespace
 * rule of its own:
 *  - `withHandler.ts` (Node runtime): keyed and anonymous limits on the data
 *    endpoints.
 *  - `edgeRateLimit.ts` (edge runtime, `api/og.tsx`): the anonymous limit.
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

/*
 * Global upstream budget for anonymous `dorkroom.art/api/*` traffic (#598).
 *
 * The per-IP limit above bounds one caller, not the total: a query string
 * that varies on every request misses the CDN, so each one reaches the
 * function and costs one Supabase Edge Function invocation, and enough IPs
 * (or one IPv6 host rotating addresses) at 30/min each can exhaust the
 * project's monthly quota. These two buckets cap the total, cost 1 per
 * request that reaches a Supabase proxy (`createSupabaseProxy`). CDN hits never
 * reach the function, so they are never charged. Keyed `api.dorkroom.art`
 * traffic is not charged either: it never takes the anonymous path, so
 * anonymous abuse cannot starve API-key holders.
 *
 * Sizing, for the maintainer to confirm (plan from the Supabase org settings):
 *  - Free plan: about 500k Edge Function invocations a month, which is
 *    about 16.1k a day over a 31-day month.
 *  - OG cards (#595, `OG_UPSTREAM_DAILY_LIMIT`) reserve up to 10k a day:
 *    310k a month at most.
 *  - This daily cap, 5k: 155k a month at most. With the OG ceiling that is
 *    465k, leaving about 35k a month (about 1.1k a day) for keyed traffic
 *    and headroom.
 *  - The app's own traffic: it fetches four fixed URLs (`/api/films`,
 *    `/api/developers`, `/api/combinations`, `/api/stats`), cached for
 *    `s-maxage=300`, so one CDN region costs at most 4 x 288 = 1,152 origin
 *    calls a day even under constant load, and far fewer at today's traffic.
 *    5k a day covers four regions busy around the clock.
 *  - Burst cap, 120 a minute: a cold cache across every region is
 *    4 URLs x about 20 regions = 80 calls, so it fits with room to spare. It
 *    keeps a flood from spending the whole day's budget in a few minutes
 *    (at 120/min the day lasts at least 42 minutes, long enough to notice
 *    and add a WAF rule).
 *
 * Revisit both numbers if the plan, the OG reservation, or the app's fetch
 * pattern changes. Unkey allows a window of up to 30 days.
 */
export const ANONYMOUS_UPSTREAM_RATE_LIMIT = 120;
export const ANONYMOUS_UPSTREAM_RATE_WINDOW_MS = RATE_WINDOW_MS;
export const ANONYMOUS_UPSTREAM_DAILY_LIMIT = 5_000;
export const ANONYMOUS_UPSTREAM_DAILY_WINDOW_MS = 24 * 60 * RATE_WINDOW_MS;

/**
 * The buckets in check order, in the anonymous namespace (their identifiers
 * cannot collide with an IP or an `og:<ip>` identifier). Burst first, so a
 * request the burst cap turns away is not charged to the day as well.
 */
export const ANONYMOUS_UPSTREAM_BUCKETS = [
  {
    identifier: 'api-upstream',
    limit: ANONYMOUS_UPSTREAM_RATE_LIMIT,
    durationMs: ANONYMOUS_UPSTREAM_RATE_WINDOW_MS,
  },
  {
    identifier: 'api-upstream-day',
    limit: ANONYMOUS_UPSTREAM_DAILY_LIMIT,
    durationMs: ANONYMOUS_UPSTREAM_DAILY_WINDOW_MS,
  },
] as const;
