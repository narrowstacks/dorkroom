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

/*
 * Global upstream budget for anonymous `dorkroom.art/api/*` traffic (#598).
 *
 * The per-IP limit above bounds one caller, not the total: a query string
 * that varies on every request misses the CDN, so each one reaches the
 * function and costs one Supabase Edge Function invocation, and enough IPs
 * (or one IPv6 host rotating addresses) at 30/min each can exhaust the
 * project's monthly quota. These two buckets cap the total of those requests,
 * cost 1 each.
 *
 * Only requests the CDN cannot absorb are charged (`withHandler.ts`): any
 * query string in the raw URL (including params the proxy later drops, since
 * `?junk=<random>` misses the CDN just as well), or an `Authorization` or
 * `Range` header, which Vercel's CDN never caches. Path variants
 * (`/API/films`, `/api/%66ilms`, `/api/films/`) are first redirected to the
 * canonical path, uncharged. A bare canonical URL is never charged: the CDN
 * bounds it, and it is what the app itself fetches (`INTERNAL_API_BASE_URL`
 * plus the resource, no query), so a flood of filtered requests can never
 * take the site's own data down. Keyed `api.dorkroom.art` traffic is never
 * charged: it does not take the anonymous path.
 *
 * Sizing, for the maintainer to confirm (plan from the Supabase org settings).
 * Before changing either number, check the real origin call counts for
 * `/api/films`, `/api/developers`, `/api/combinations` and `/api/stats`, with
 * and without a query string, in Vercel observability:
 *  - Free plan: about 500k Edge Function invocations a month, about 16.1k a
 *    day over a 31-day month.
 *  - The OG budget (PR #595) reserves up to 10k a day, 310k a month at most.
 *    These numbers assume #595 has landed (merge it first): it moves the
 *    `api/og.tsx` film, developer and combination lookups off
 *    `dorkroom.art/api/*` to direct Supabase calls, so OG cards are not
 *    charged here. Only its fallback, used when the Supabase env vars are
 *    missing (local dev, a preview without them), sends filtered `/api/*`
 *    requests and is charged. Before #595, those lookups are filtered
 *    `/api/*` calls and would draw on this budget.
 *  - Query-string traffic: no first-party client sends any, so whatever
 *    arrives is third-party or abuse. 2k a day caps it at 62k a month.
 *  - That leaves about 128k a month (about 4.1k a day) for what these
 *    buckets do not cover: bare-URL CDN revalidations and keyed traffic. A
 *    bare URL costs at most one origin call per CDN region per `s-maxage`
 *    (300 s), so 4 URLs x 288 = 1,152 a day per region kept busy around the
 *    clock; the headroom covers about three such regions.
 *  - Burst cap, 60 a minute: no legitimate client needs one, and it keeps a
 *    flood from spending the day's budget in under about half an hour, long
 *    enough to notice and add a WAF rule.
 *
 * Exhausting a bucket refuses filtered requests until it frees up, which for
 * the daily bucket can take hours. Revisit both numbers if the plan, the OG
 * budget, or the app's fetch pattern changes. Unkey allows windows up to 30
 * days.
 */
export const ANONYMOUS_UPSTREAM_RATE_LIMIT = 60;
export const ANONYMOUS_UPSTREAM_RATE_WINDOW_MS = RATE_WINDOW_MS;
export const ANONYMOUS_UPSTREAM_DAILY_LIMIT = 2_000;
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
