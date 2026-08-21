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
- `openapi.ts` - serves the OpenAPI 3.1 spec (`/openapi.json`)
- `reference.ts` - interactive API reference (Scalar) at `/reference`
- `meta.ts` - server-rendered meta tags for social crawlers. `vercel.json`
  rewrites any non-`/api/` path to it when the user-agent matches a known
  crawler, so link previews get per-route titles out of an SPA. Unknown or
  duplicated query params get a 308 to the canonical URL rather than a 400,
  because shared links routinely carry `utm_*` junk.
- `og.tsx` - Open Graph card images via `@vercel/og`. Reads `route`, `film`,
  `developer`, and `recipe` params. See the `og-image-routes` skill.

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
Biome formatting (it is a generated artifact). It is named distinctly from
`openapi.ts` because Vercel derives a function path from each file's basename:
`openapi.json` would collide with the `openapi.ts` handler.

## Core Pattern

Every data handler is wrapped by `withHandler` from `../utils/withHandler.ts`,
either directly (`filmdev.ts`) or through `createSupabaseProxy`.

`withHandler` centralizes:

1. Request ID + user-agent normalization
2. CORS headers and `OPTIONS` handling
3. GET-only method guard
4. Required env var validation
5. Host-based Unkey auth and rate limiting
6. Outer error mapping (`AbortError` => 504, fetch network => 502, generic => 500)

`docs.ts`, `openapi.ts`, `reference.ts`, `meta.ts`, and `og.tsx` are plain
handlers. They serve static or derived content, hit no upstream, and need no
key.

### Supabase proxies

A proxy route is a config object plus one call. `createSupabaseProxy` supplies
the fetch, the 30s timeout, the 1 MB response cap, query sanitization against
`allowedParams`, and structured logging:

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

- `withHandler.ts` - common wrapper and Unkey integration
- `createSupabaseProxy.ts` - the proxy factory described above
- `queryValidation.ts` - allowlist-based query sanitization
- `timeoutSignal.ts` - `createTimeoutSignal(timeoutMs)` helper
- `serverlessLogger.ts` - structured serverless logs
- `routeMetadata.ts` - per-route titles and descriptions used by `meta.ts` and `og.tsx`
- `htmlEscape.ts` - escaping for the HTML that `meta.ts` and `docs.ts` emit

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
    `apps/mobile/src/lib/api-config.ts`. Requests **without** the header keep
    today's key-only limiting, unaffected; a malformed value is treated as
    absent (never rejected). Implemented in
    `applyClientIdentityRateLimit`/`applyNamespaceRateLimit` in
    `utils/withHandler.ts`.

- `dorkroom.art/api/*`
  - No API key required
  - Anonymous rate limiting by client IP (30 req/min)

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

- Use `bun run keys:anon-bootstrap` to create/check the anonymous ratelimit namespace.
- This command uses `UNKEY_ROOT_KEY` (runtime key), not `UNKEY_ADMIN_ROOT_KEY`.

## Testing

`bun run test:serverless` runs the `serverless` vitest project, defined at the
repo root in `vitest.config.ts`. It covers `api/__tests__`, `scripts/__tests__`,
and three named suites under `utils/__tests__` (`withHandler`,
`queryValidation`, `routeMetadata`). Adding a new `utils` test means adding it
to that `include` list, or it silently never runs.

`bun run typecheck:api` is a second, separate gate: it compiles `api/**` plus
`../utils/**` with **TypeScript 6** through `api/tsconfig.json`, matching what
`@vercel/node` does at deploy time. Test files are excluded from it. Both tasks
run inside `bun run test`.

## Request Flow

```
Client -> Vercel Serverless -> (Unkey auth/rate limit) -> Upstream API -> Response
```
