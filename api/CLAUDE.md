# /api - Vercel Serverless Functions

Serverless API endpoints deployed to Vercel that proxy requests to Supabase Edge Functions and filmdev.org.

Their shared helpers live in **`/utils` at the repo root**, not `api/utils`.
Handlers import them as `../utils/…`. Only `api/` is a Vercel entrypoint
directory, so anything importable but not itself a route belongs in `/utils`.

## Endpoints

Supabase proxies (built by `createSupabaseProxy`):

- `films.ts` - Film database queries
- `developers.ts` - Developer database queries
- `combinations.ts` - Development recipe combinations
- `stats.ts` - Aggregate database counts; takes no query params

Everything else:

- `filmdev.ts` - filmdev.org import endpoint; the one handler that calls `withHandler` directly
- `docs.ts` - `api.dorkroom.art` landing page
- `not-found.ts` - JSON 404 (`{ error, message, requestId }`) for any other path on
  `api.dorkroom.art`. Envelope only, never `withHandler`, which would demand
  an API key and turn a mistyped path into a 401. Answers every method with
  the 404 (`methods: 'any'`), since a 405 would claim the path exists
- `openapi.ts` - serves the OpenAPI 3.1 spec (`/openapi.json`)
- `reference.ts` - interactive API reference (Scalar) at `/reference`
- `meta.ts` - server-rendered meta tags for social crawlers. `vercel.json`
  rewrites any non-`/api/` path to it when the user-agent matches a known
  crawler, so link previews get per-route titles out of an SPA. Unknown or
  duplicated query params get a 308 to the canonical URL rather than a 400,
  because shared links routinely carry `utm_*` junk. A calculator route also
  accepts its link params, and every route accepts the share marker `source`
  (any value, never part of the card). A calculator link gets its own title,
  description and card (`utils/calculatorShare.ts`).
- `og.tsx` - Open Graph card images via `@vercel/og` (edge runtime). Reads
  `route`, `film`, `developer`, and `recipe` params, plus a calculator
  route's link params, for which it draws the result (border, lens, resize,
  mat) or a text card (stops, reciprocity, exposure). See the `og-image-routes`
  skill. `og.tsx` runs on the edge, outside the Node-only envelope, so it
  carries its own guards: unknown params 400; malformed values (checked by
  `utils/queryPatterns.ts`, the same patterns `meta.ts` uses) are treated as
  absent before any upstream lookup; fonts are cached per isolate; and every
  request other than a bare static card (`?route=<known page>`) is limited per
  IP through `utils/edgeRateLimit.ts`. Over the limit it answers a `no-store`
  307 to the static card rather than a 429, so crawlers still get an image.

Host-based routing lives in `vercel.json`: on `api.dorkroom.art` the bare paths
(`/films`, `/openapi.json`, `/reference`, …) map onto these handlers, while
`dorkroom.art` reaches the same functions under `/api/*`.

## OpenAPI Spec

The OpenAPI 3.1 document (`api/openapi-spec.json`) is **generated** from the Zod
schemas in `packages/api` by `scripts/generate-openapi.ts`. The builder lives at
`packages/api/src/dorkroom/openapi.ts` (exported from `@dorkroom/api` as
`buildOpenApiDocument`).

After changing any request/response schema or endpoint, regenerate it:

```bash
bun run openapi:generate
```

A vitest drift guard (`packages/api/src/dorkroom/__tests__/openapi.test.ts`)
fails if the committed JSON is stale. `openapi-spec.json` is excluded from
`bun fmt` (it is a generated artifact; see `ignorePatterns` in `bunfig.toml`). It is named distinctly from
`openapi.ts` because Vercel derives a function path from each file's basename:
`openapi.json` would collide with the `openapi.ts` handler.

## Core Pattern

Every Node handler runs inside the **request envelope**,
`withEnvelope(policy, handler)` from `../utils/requestEnvelope.ts`. Data
handlers add the **API-key layer** on top through `withHandler` from
`../utils/withHandler.ts`, either directly (`filmdev.ts`) or through
`createSupabaseProxy`. Nothing hand-rolls CORS, `OPTIONS`, or a method guard.

The envelope centralizes:

1. Request ID, user-agent normalization, request logging
2. Host classification (`ctx.isPublicApi`: `api.dorkroom.art`, or any host it
   cannot place)
3. `X-Content-Type-Options: nosniff` on every response
4. CORS per `policy.cors`: `'public-api'` (data endpoints), `'any-host'`
   (`openapi`, `not-found`), or `'none'`
5. `OPTIONS` answers **204** with `Allow`; a method outside `policy.methods`
   answers **405** with `Allow` and `{ error, allowed, requestId }`. `Allow`
   and `Access-Control-Allow-Methods` both list `policy.methods` plus `OPTIONS`
6. Cache policy: `policy.cache` pins `Cache-Control` (`publicApi` on the api
   host, `always` everywhere) before the handler runs. Handlers call
   `ctx.setCacheControl(value)` for a cacheable success, which is a no-op where
   a value is pinned, so no handler branches on host to pick its cache
7. Required env var validation
8. Outer error mapping (`AbortError`/`TimeoutError` => 504, fetch network => 502, generic => 500)

`withHandler` = envelope (`methods: ['GET']`, `cors: 'public-api'`,
`cache.publicApi: 'private, no-store'`) + `withApiKey`, which sets `Vary` and
runs host-based Unkey auth and rate limiting before the handler. Unkey is
reached only through the `UnkeyClient` interface; `HandlerConfig.createUnkeyClient`
swaps in a test stand-in, and deployed handlers get the real SDK client.

`docs.ts`, `openapi.ts`, `reference.ts`, `meta.ts`, and `not-found.ts` use the
envelope alone: they serve static or derived content and need no key. `meta.ts`
also allows `HEAD`, since some crawlers probe with it. `og.tsx` is edge
runtime and keeps its own guards (above); it calls `/api/films`,
`/api/developers`, and `/api/combinations`, which is why it has its own rate
limit.

### Upstream fetches

Both data paths fetch through `fetchUpstreamJson(res, ctx, { url, headers,
label, cache })` in `../utils/fetchUpstreamJson.ts`: 30s timeout, non-OK to a
generic 502 (an `onUpstreamStatus` hook may claim a status first: the proxy
passes a 400 through, `filmdev` maps a 404), JSON `content-type` check,
declared `content-length` over 1 MB to 502, parse failure to 502, logging, and
the success cache through `ctx.setCacheControl`.

### Supabase proxies

A proxy route is a config object plus one call. `createSupabaseProxy` supplies
the upstream URL and headers, query sanitization against `allowedParams`, and
the 400 pass-through; `fetchUpstreamJson` does the rest:

```typescript
export const filmsProxyConfig: SupabaseProxyConfig = {
  name: 'films',
  allowedParams: ['query', 'fuzzy', 'limit', 'colorType', 'brand', 'slug'],
};

export default createSupabaseProxy(filmsProxyConfig);
```

`name` is both the Supabase Edge Function name and the log label. Exporting the
config separately lets tests drive the handler with an explicit
`HandlerContext`; `createSupabaseProxyHandler` returns the inner handler without
the `withHandler` wrapper for the same reason.

Adding a query param to a proxy means adding it to `allowedParams`. Anything not
on that list is dropped before the upstream call.

## Shared Utilities

All under `/utils`:

- `requestEnvelope.ts` - `withEnvelope`, the request envelope every Node handler uses
- `withHandler.ts` - the API-key layer (`withApiKey`) and `withHandler`
  (envelope + key layer) for data endpoints; Unkey integration
- `fetchUpstreamJson.ts` - the shared upstream JSON fetch described above
- `rateLimitPolicy.ts` - the one home for rate-limit policy: anonymous and
  per-client budgets, per-key tiers, and namespace
  resolution. Imported by `withHandler.ts`, `edgeRateLimit.ts`,
  `scripts/unkey-keys.ts`, and `api/docs.ts`. Edge-safe (no Node imports).
  `utils/__tests__/rateLimitPolicy.test.ts` fails if the limits quoted in
  `docs/API.md`, this file, or `packages/api/CLAUDE.md` drift from it
- `edgeRateLimit.ts` - edge-safe Unkey rate limit over plain `fetch` (no SDK,
  no Node imports), using the anonymous namespace and budget from `rateLimitPolicy.ts`
- `queryPatterns.ts` - slug/UUID/ISO/brand/preset patterns shared by `meta.ts` and `og.tsx`
- `createSupabaseProxy.ts` - the proxy factory described above
- `queryValidation.ts` - allowlist-based query sanitization
- `serverlessLogger.ts` - structured serverless logs
- `routeMetadata.ts` - per-route titles and descriptions used by `meta.ts` and `og.tsx`
- `calculatorShare.ts` - shared calculator link previews for `meta.ts` and
  `og.tsx`: accepted link params, title, description and drawing. It imports
  the published **`@dorkroom/logic/calculators`** entry (pure modules, no
  React), never the package root, so the param names, validation (each
  calculator's `*Link.read`) and math are the calculator's own rather than
  copies. That entry resolves to logic's built `dist/`:
  - Vercel: the functions are traced after the build command (which builds
    logic through turbo's `^build`). `@vercel/node` follows the `exports`
    map to `dist/calculators.js` for both the Node and the edge function,
    and compiles the ESM output to CommonJS for Node
  - `typecheck:api` (TypeScript 6, `node10` resolution, which ignores
    `exports`): `typesVersions` maps it to `dist/calculators.d.ts`; turbo
    runs `@dorkroom/logic#build` first
  - `test:serverless`: vitest follows `exports`; turbo builds logic first

  Both turbo tasks depend on `@dorkroom/logic#build`, so a logic change busts
  their caches. The edge bundle for `og.tsx` grows by zod (about 100 KB
  gzipped)
- `htmlEscape.ts` - `escapeHtml` for the HTML that `meta.ts` emits

## Authentication + Rate Limiting

Two access modes are supported from one Vercel project:

- `api.dorkroom.art/*`
  - Requires `X-API-Key`
  - Verifies key through Unkey
  - Returns `401` on missing/invalid keys
  - Returns `429` with `Retry-After` when key is rate-limited
  - Optional `X-Client-Id` header (opaque per-install id, `^[A-Za-z0-9_-]{8,64}$`)
    adds **per-client** rate limiting on top of the key's own limit: 60
    req/min for `client:<id>` plus a 240 req/min `ip:<ip>` ceiling (bounds
    id-rotation abuse from one address). This is how the iOS app, which ships
    one shared free-tier key, keeps installs from sharing a single 60 req/min
    budget. See `apps/mobile/src/lib/client-id.ts` and
    `apps/mobile/src/lib/api-config.ts`. Requests **without** the header get
    key-only limiting; a malformed value is treated as
    absent (never rejected). Implemented in
    `applyClientIdentityRateLimit`/`applyNamespaceRateLimit` in
    `utils/withHandler.ts`; the numbers live in `utils/rateLimitPolicy.ts`.

- `dorkroom.art/api/*`
  - No API key required
  - Anonymous rate limiting by client IP (30 req/min)
  - `/api/og` uses the same namespace and budget under a separate `og:<ip>`
    identifier, and fails open if Unkey is unreachable

When Unkey is not configured (`UNKEY_ROOT_KEY` missing), anonymous rate limiting is skipped with warning logs for local development.

## Required Environment Variables

Supabase proxy handlers (`films`, `developers`, `combinations`, `stats`):

- `SUPABASE_MASTER_API_KEY` - Supabase secret API key (`sb_secret_...`) used as the `Bearer` token when calling Edge Functions
- `SUPABASE_ENDPOINT` - Project URL, e.g. `https://<ref>.supabase.co`
- `SUPABASE_PROXY_SECRET` - shared secret sent as the `x-proxy-secret` header on every outbound call, so the Edge Functions can reject requests that don't come through this proxy. The same value must be set as `PROXY_SHARED_SECRET` in the Supabase function environment; the functions fail closed (503) if it's unset there.

Unkey integration:

- `UNKEY_ROOT_KEY` - root key used for verification and anonymous rate limits
- `UNKEY_API_ID` - required for public API host configuration
- `UNKEY_API_KEY_PERMISSION` - required permission expression checked for every API key verification
- `UNKEY_ANON_NAMESPACE` (optional) - explicit pre-created namespace for anonymous IP rate limiting
- `UNKEY_CLIENT_NAMESPACE` (optional) - explicit pre-created namespace for the per-client (`X-Client-Id`) rate limiting on the keyed path; falls back to `${UNKEY_API_ID}-client`, then `dorkroom-client`

Operational note:

- Use `bun run keys:anon-bootstrap` to create/check the anonymous ratelimit
  namespace, and `bun run keys:anon-bootstrap -- --scope client` for the
  per-client one. Both resolve the namespace exactly as the runtime does
  (`getRateLimitNamespace` in `utils/rateLimitPolicy.ts`). In production the
  runtime fails closed (500) if a namespace is missing and the key lacks
  `create_namespace`, so bootstrap both before deploying.
- This command uses `UNKEY_ROOT_KEY` (runtime key), not `UNKEY_ADMIN_ROOT_KEY`.

## Testing

`bun run test:serverless` runs the `serverless` vitest project, defined at the
repo root in `vitest.config.ts`. It covers `api/__tests__`, `scripts/__tests__`,
and `utils/__tests__/*.test.ts` (a glob, so new `utils` tests are picked up
automatically).

`bun run typecheck:api` is a second, separate gate: it compiles `api/**` plus
`../utils/**` with **TypeScript 6** through `api/tsconfig.json`, matching what
`@vercel/node` does at deploy time. Test files are excluded from it. Both tasks
run inside `bun run test`.

## Request Flow

```
Client -> Vercel Serverless -> (Unkey auth/rate limit) -> Upstream API -> Response
```
