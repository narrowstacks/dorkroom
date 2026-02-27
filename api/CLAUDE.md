# /api - Vercel Serverless Functions

Serverless API endpoints deployed to Vercel that proxy requests to Supabase Edge Functions and filmdev.org.

## Endpoints

- `films.ts` - Film database queries
- `developers.ts` - Developer database queries
- `combinations.ts` - Development recipe combinations
- `filmdev.ts` - filmdev.org import endpoint
- `docs.ts` - `api.dorkroom.art` landing page

## Core Pattern

All API handlers should use `withHandler` from `utils/withHandler.ts`.

`withHandler` centralizes:
1. Request ID + user-agent normalization
2. CORS headers and `OPTIONS` handling
3. GET-only method guard
4. Required env var validation
5. Host-based Unkey auth and rate limiting
6. Outer error mapping (`AbortError` => 504, fetch network => 502, generic => 500)

## Shared Utilities

- `utils/withHandler.ts` - common wrapper and Unkey integration
- `utils/timeoutSignal.ts` - `createTimeoutSignal(timeoutMs)` helper
- `utils/queryValidation.ts` - allowlist-based query sanitization
- `utils/serverlessLogger.ts` - structured serverless logs

## Authentication + Rate Limiting

Two access modes are supported from one Vercel project:

- `api.dorkroom.art/*`
  - Requires `X-API-Key`
  - Verifies key through Unkey
  - Returns `401` on missing/invalid keys
  - Returns `429` with `Retry-After` when key is rate-limited

- `dorkroom.art/api/*`
  - No API key required
  - Anonymous rate limiting by client IP (30 req/min)

When Unkey is not configured (`UNKEY_ROOT_KEY` missing), anonymous rate limiting is skipped with warning logs for local development.

## Required Environment Variables

Supabase proxy handlers (`films`, `developers`, `combinations`):
- `SUPABASE_MASTER_API_KEY`
- `SUPABASE_ENDPOINT`

Unkey integration:
- `UNKEY_ROOT_KEY` - root key used for verification and anonymous rate limits
- `UNKEY_API_ID` - required for public API host configuration
- `UNKEY_API_KEY_PERMISSION` - required permission expression checked for every API key verification
- `UNKEY_ANON_NAMESPACE` (optional) - explicit pre-created namespace for anonymous IP rate limiting

Operational note:
- Use `bun run keys:anon-bootstrap` to create/check the anonymous ratelimit namespace.
- This command uses `UNKEY_ROOT_KEY` (runtime key), not `UNKEY_ADMIN_ROOT_KEY`.

## Request Flow

```
Client -> Vercel Serverless -> (Unkey auth/rate limit) -> Upstream API -> Response
```
