import { isIP } from 'node:net';
import { Unkey } from '@unkey/api';
import type {
  VercelApiHandler,
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import {
  ANONYMOUS_RATE_LIMIT,
  ANONYMOUS_RATE_WINDOW_MS,
  ANONYMOUS_UPSTREAM_BUCKETS,
  CLIENT_IP_RATE_LIMIT,
  CLIENT_RATE_LIMIT,
  CLIENT_RATE_WINDOW_MS,
  getRateLimitNamespace,
  normalizeResetMs,
} from './rateLimitPolicy';
import {
  type EnvelopeHandler,
  getHeaderValue,
  type HandlerContext,
  withEnvelope,
} from './requestEnvelope';
import { serverlessError, serverlessWarn } from './serverlessLogger';

export type { HandlerContext } from './requestEnvelope';

/**
 * The API-key layer for data endpoints: Unkey key verification and rate
 * limiting, run inside the request envelope (`requestEnvelope.ts`), which owns
 * request IDs, CORS, the method guard, cache policy, env checks and error
 * mapping. Limits and namespaces come from `rateLimitPolicy.ts`.
 *
 *  - `api.dorkroom.art` (and unknown hosts): `X-API-Key` verified through
 *    Unkey, the key's own tier limit, plus optional per-client limits.
 *  - `dorkroom.art`: no key, anonymous per-IP limit, then (for handlers that
 *    opt in with `upstreamBudget`, and only for a URL with a query string)
 *    the global anonymous upstream budget.
 */

interface VerifyRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  exceeded: boolean;
}

/**
 * The Unkey seam: the two calls this module makes, taken off the SDK client so
 * the signatures cannot drift. Production builds the real SDK client
 * (`createRealUnkeyClient`); tests inject a stand-in through
 * `HandlerConfig.createUnkeyClient`.
 */
export interface UnkeyClient {
  keys: Pick<Unkey['keys'], 'verifyKey'>;
  ratelimit: Pick<Unkey['ratelimit'], 'limit'>;
}

export type CreateUnkeyClient = (rootKey: string) => UnkeyClient;

const createRealUnkeyClient: CreateUnkeyClient = (rootKey) =>
  new Unkey({ rootKey });

export interface HandlerConfig {
  name: string;
  requiredEnv?: string[];
  handler: (
    req: VercelRequest,
    res: VercelResponse,
    ctx: HandlerContext
  ) => Promise<void>;
  /**
   * Builds the Unkey client once `UNKEY_ROOT_KEY` is present. Defaults to the
   * real SDK client; deployed handlers leave it unset, tests pass a stand-in.
   */
  createUnkeyClient?: CreateUnkeyClient;
  /**
   * Charge each anonymous request with a query string that reaches this
   * handler to the global upstream budget (`ANONYMOUS_UPSTREAM_BUCKETS`). Set by the Supabase
   * proxies, whose every request costs one Edge Function invocation; off for
   * handlers that do not call Supabase. Never applies to keyed traffic.
   */
  upstreamBudget?: boolean;
  /**
   * The one path (`/api/<name>`) anonymous requests for this resource should
   * use. When the raw `req.url` path differs byte for byte, `withApiKey`
   * answers a CDN-cacheable 308 to it before any Unkey or upstream call, with
   * the raw query passed through untouched, so case, percent-encoding,
   * trailing-slash and `.ts` variants collapse onto one CDN cache key instead
   * of each reaching Supabase. The query is never rewritten: Vercel
   * normalises query encoding itself, so rewriting it could redirect a URL
   * to itself. Website host only: keyed `api.dorkroom.art` callers are never
   * redirected.
   */
  canonicalPath?: string;
}

export interface ApiKeyOptions {
  /** See `HandlerConfig.upstreamBudget`. */
  upstreamBudget?: boolean;
  /** See `HandlerConfig.canonicalPath`. */
  canonicalPath?: string;
}

/**
 * Cache-Control for the canonicalising 308: the CDN keeps it a day and
 * answers repeats itself; browsers do not keep it, so a deploy that changes
 * the routing is never stuck behind a stale browser redirect.
 */
const CANONICAL_REDIRECT_CACHE_CONTROL = 'public, max-age=0, s-maxage=86400';

// Accepts `generateId()` output (timestamp+random, base36) and any future
// UUID-shaped identity. Anything else is treated as an absent header rather
// than rejected, so a malformed value never turns into a 4xx.
const CLIENT_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;

/** Cache-Control for every keyed response: per-key data must never be shared. */
const PUBLIC_API_CACHE_CONTROL = 'private, no-store';

let unkeyClient: UnkeyClient | null = null;
let unkeyInitialized = false;

function retryAfterSeconds(resetMs: number): string {
  const seconds = Math.ceil((resetMs - Date.now()) / 1000);
  return String(Math.max(1, seconds));
}

function setRateLimitHeaders(
  res: VercelResponse,
  rateLimit: VerifyRateLimit
): void {
  const resetMs = normalizeResetMs(rateLimit.reset);

  res.setHeader('X-RateLimit-Limit', String(rateLimit.limit));
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetMs / 1000)));

  if (rateLimit.exceeded) {
    res.setHeader('Retry-After', retryAfterSeconds(resetMs));
  }
}

function getTrustedForwardedIp(forwardedFor: string): string | null {
  if (!forwardedFor) {
    return null;
  }

  const parts = forwardedFor.split(',').flatMap((part) => {
    const trimmed = part.trim();
    return trimmed ? [trimmed] : [];
  });

  // Use the right-most valid IP to avoid trusting attacker-controlled leading
  // values in appended X-Forwarded-For chains.
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const candidate = parts[index];
    if (candidate && isIP(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getClientIp(req: VercelRequest): string {
  const realIp = getHeaderValue(req.headers['x-real-ip']).trim();
  if (realIp && isIP(realIp)) {
    return realIp;
  }

  const vercelForwardedFor = getHeaderValue(
    req.headers['x-vercel-forwarded-for']
  ).trim();
  if (vercelForwardedFor && isIP(vercelForwardedFor)) {
    return vercelForwardedFor;
  }

  const forwardedFor = getHeaderValue(req.headers['x-forwarded-for']);
  const trustedForwardedIp = getTrustedForwardedIp(forwardedFor);
  if (trustedForwardedIp) {
    return trustedForwardedIp;
  }

  return 'anonymous';
}

function getUnkeyClient(
  requestId: string,
  createUnkeyClient: CreateUnkeyClient
): UnkeyClient | null {
  if (unkeyInitialized) {
    return unkeyClient;
  }

  unkeyInitialized = true;
  const rootKey = process.env.UNKEY_ROOT_KEY;

  if (!rootKey) {
    serverlessWarn('UNKEY_ROOT_KEY not set, skipping Unkey integration', {
      requestId,
    });
    unkeyClient = null;
    return null;
  }

  unkeyClient = createUnkeyClient(rootKey);
  return unkeyClient;
}

async function applyPublicApiKeyAuth(
  req: VercelRequest,
  res: VercelResponse,
  requestId: string,
  createUnkeyClient: CreateUnkeyClient
): Promise<boolean> {
  const apiId = process.env.UNKEY_API_ID;

  if (!apiId) {
    serverlessError('UNKEY_API_ID environment variable is not set', {
      requestId,
    });
    res.status(500).json({
      error: 'API configuration error',
      message: 'Missing required environment configuration',
      requestId,
    });
    return false;
  }

  const apiKey = getHeaderValue(req.headers['x-api-key']).trim();

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API key. Pass X-API-Key header.',
      requestId,
    });
    return false;
  }

  const unkey = getUnkeyClient(requestId, createUnkeyClient);
  if (!unkey) {
    serverlessError('UNKEY_ROOT_KEY required for public API key verification', {
      requestId,
    });
    res.status(500).json({
      error: 'API configuration error',
      message: 'Public API authentication is not configured',
      requestId,
    });
    return false;
  }

  const requiredPermission = process.env.UNKEY_API_KEY_PERMISSION?.trim();
  if (!requiredPermission) {
    serverlessError(
      'UNKEY_API_KEY_PERMISSION environment variable is not set',
      {
        requestId,
      }
    );
    res.status(500).json({
      error: 'API configuration error',
      message: 'Missing required API key verification permission config',
      requestId,
    });
    return false;
  }

  let verification: Awaited<ReturnType<typeof unkey.keys.verifyKey>>;
  try {
    verification = await unkey.keys.verifyKey({
      key: apiKey,
      permissions: requiredPermission,
    });
  } catch (error) {
    serverlessError('Unkey key verification failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'API configuration error',
      message: 'Unable to verify API key',
      requestId,
    });
    return false;
  }

  const primaryRateLimit = verification.data.ratelimits?.[0];
  if (primaryRateLimit) {
    setRateLimitHeaders(res, {
      limit: primaryRateLimit.limit,
      remaining: primaryRateLimit.remaining,
      reset: primaryRateLimit.reset,
      exceeded: primaryRateLimit.exceeded,
    });
  }

  if (!verification.data.valid) {
    if (
      verification.data.code === 'RATE_LIMITED' ||
      primaryRateLimit?.exceeded === true
    ) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        code: verification.data.code,
        requestId,
      });
      return false;
    }

    res.status(401).json({
      error: 'Unauthorized',
      code: verification.data.code,
      requestId,
    });
    return false;
  }

  if (primaryRateLimit?.exceeded) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      requestId,
    });
    return false;
  }

  const rawClientId = getHeaderValue(req.headers['x-client-id']).trim();
  const clientId = CLIENT_ID_REGEX.test(rawClientId) ? rawClientId : null;

  if (clientId) {
    const passedClientChecks = await applyClientIdentityRateLimit(
      req,
      res,
      requestId,
      clientId,
      createUnkeyClient
    );
    if (!passedClientChecks) {
      return false;
    }
  }

  return true;
}

/**
 * Per-client rate limiting for the keyed (api.dorkroom.art) path. Applied
 * only when the request carries a well-formed `X-Client-Id` (see
 * `CLIENT_ID_REGEX` in `applyPublicApiKeyAuth`) — requests without one keep
 * today's key-only limiting, unaffected.
 *
 * Runs two independent namespace checks concurrently:
 *  - `client:<id>` at CLIENT_RATE_LIMIT/min — the per-install budget.
 *  - `ip:<ip>` at CLIENT_IP_RATE_LIMIT/min — bounds id-rotation abuse from a
 *    single address (a rotated fake id still hits this ceiling).
 *
 * Response headers reflect the client-id result unless the IP guard is the
 * one that tripped: the IP check is passed `setHeadersOnSuccess: false` so a
 * passing IP check never clobbers a passing client-id check's headers, but a
 * failing IP check still writes its own (rate-limited) headers + 429 body.
 */
async function applyClientIdentityRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  requestId: string,
  clientId: string,
  createUnkeyClient: CreateUnkeyClient
): Promise<boolean> {
  const namespace = getRateLimitNamespace('client');
  const clientIp = getClientIp(req);

  const [clientOk, ipOk] = await Promise.all([
    applyNamespaceRateLimit(res, requestId, createUnkeyClient, {
      namespace,
      identifier: `client:${clientId}`,
      limit: CLIENT_RATE_LIMIT,
      durationMs: CLIENT_RATE_WINDOW_MS,
    }),
    applyNamespaceRateLimit(res, requestId, createUnkeyClient, {
      namespace,
      identifier: `ip:${clientIp}`,
      limit: CLIENT_IP_RATE_LIMIT,
      durationMs: CLIENT_RATE_WINDOW_MS,
      setHeadersOnSuccess: false,
    }),
  ]);

  return clientOk && ipOk;
}

/**
 * Shared Unkey namespace rate-limit check, extracted so the anonymous
 * (per-IP) limiter and the keyed per-client limiter can reuse identical
 * error semantics instead of duplicating them:
 *  - Unkey not configured -> warn and fail OPEN (skip limiting).
 *  - `create_namespace` permission error -> fail OPEN outside production
 *    (with a warning), fail CLOSED (500) in production.
 *  - Any other insufficient-permissions error -> always fail CLOSED (500).
 *  - Otherwise rethrow.
 *
 * `setHeadersOnSuccess` (default true) lets a caller run more than one check
 * for a single request (see `applyClientIdentityRateLimit`) without a
 * passing secondary check clobbering the primary check's response headers;
 * it always sets headers (and writes the 429 body) when this check is the
 * one that failed, regardless of the flag.
 *
 * Also bails out without touching `res` if a concurrent check already ended
 * the response (relevant only to the dual client/IP check below, since a
 * single-check caller never observes `res.writableEnded` here).
 */
async function applyNamespaceRateLimit(
  res: VercelResponse,
  requestId: string,
  createUnkeyClient: CreateUnkeyClient,
  opts: {
    namespace: string;
    identifier: string;
    limit: number;
    durationMs: number;
    setHeadersOnSuccess?: boolean;
  }
): Promise<boolean> {
  const unkey = getUnkeyClient(requestId, createUnkeyClient);

  if (!unkey) {
    serverlessWarn('Rate limiting skipped (Unkey not configured)', {
      requestId,
      namespace: opts.namespace,
    });
    return true;
  }

  let result: Awaited<ReturnType<typeof unkey.ratelimit.limit>>;
  try {
    result = await unkey.ratelimit.limit({
      namespace: opts.namespace,
      identifier: opts.identifier,
      limit: opts.limit,
      duration: opts.durationMs,
    });
  } catch (error) {
    if (res.writableEnded) {
      return false;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const shouldFailOpen = process.env.NODE_ENV !== 'production';

    if (errorMessage.includes('create_namespace')) {
      if (shouldFailOpen) {
        serverlessWarn(
          'Rate limiting skipped due to missing create_namespace permission',
          {
            requestId,
            namespace: opts.namespace,
          }
        );
        return true;
      }

      serverlessError(
        'Rate limiting misconfigured: missing create_namespace permission',
        {
          requestId,
          namespace: opts.namespace,
        }
      );
      res.status(500).json({
        error: 'API configuration error',
        message: 'Rate limiting is not configured',
        requestId,
      });
      return false;
    }

    if (
      errorMessage.includes('Insufficient Permissions') ||
      errorMessage.includes('Missing permission')
    ) {
      serverlessError(
        'Rate limiting misconfigured: insufficient Unkey permissions',
        {
          requestId,
          namespace: opts.namespace,
        }
      );
      res.status(500).json({
        error: 'API configuration error',
        message: 'Rate limiting is not configured',
        requestId,
      });
      return false;
    }

    throw error;
  }

  if (res.writableEnded) {
    return false;
  }

  const rateLimitData = result.data;
  const exceeded = !rateLimitData.success;

  if (opts.setHeadersOnSuccess === false && !exceeded) {
    return true;
  }

  setRateLimitHeaders(res, {
    limit: rateLimitData.limit,
    remaining: rateLimitData.remaining,
    reset: rateLimitData.reset,
    exceeded,
  });

  if (exceeded) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      requestId,
    });
    return false;
  }

  return true;
}

async function applyAnonymousRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  requestId: string,
  createUnkeyClient: CreateUnkeyClient
): Promise<boolean> {
  return applyNamespaceRateLimit(res, requestId, createUnkeyClient, {
    namespace: getRateLimitNamespace('anonymous'),
    identifier: getClientIp(req),
    limit: ANONYMOUS_RATE_LIMIT,
    durationMs: ANONYMOUS_RATE_WINDOW_MS,
    // A passing response is CDN-cached (public s-maxage) and shared, so
    // per-IP X-RateLimit-* would show every later visitor the first caller's
    // budget. A 429 is no-store, so it keeps them.
    setHeadersOnSuccess: false,
  });
}

/**
 * Whether the CDN may have to send this request to the origin every time, so
 * the CDN does not bound it and the global budget must:
 *  - any query string (raw `req.url`, never the sanitized query: the proxy
 *    drops unknown params, so `?junk=<x>` misses the CDN yet reaches Supabase
 *    as a bare call);
 *  - an `Authorization` or `Range` header, which Vercel's CDN never serves
 *    from cache (its documented request-side criteria, beside the method,
 *    which the envelope already limits to GET). Nothing first-party sends
 *    either on `dorkroom.art`.
 * A bare canonical URL without them is one CDN cache key per resource.
 */
function bypassesCdn(req: VercelRequest): boolean {
  return (
    (req.url ?? '').includes('?') ||
    req.headers.authorization !== undefined ||
    req.headers.range !== undefined
  );
}

/**
 * The global budget on anonymous upstream calls, charged only to requests
 * the CDN cannot absorb (`bypassesCdn`) and checked after the per-IP
 * limit has passed: a request that limit turns away never reaches Supabase,
 * so it is never charged here, and one noisy IP cannot spend everyone's
 * budget. Buckets are checked in order (burst, then day), each at cost 1.
 *
 * Over budget: 503 with `Retry-After` and `no-store`. It is not the caller's
 * fault, so not a 429. The 503 carries no `X-RateLimit-*`: the per-IP check
 * passed (and sends none on success) and the global buckets are never
 * exposed.
 *
 * Fails OPEN on any Unkey failure (logged), like the OG limiter: a misconfig
 * would already have failed the per-IP check against the same namespace, and
 * turning a limiter outage into a site-wide data outage is the worse failure.
 */
async function applyAnonymousUpstreamBudget(
  res: VercelResponse,
  requestId: string,
  createUnkeyClient: CreateUnkeyClient
): Promise<boolean> {
  const unkey = getUnkeyClient(requestId, createUnkeyClient);
  if (!unkey) {
    return true;
  }

  const namespace = getRateLimitNamespace('anonymous');
  for (const bucket of ANONYMOUS_UPSTREAM_BUCKETS) {
    let result: Awaited<ReturnType<typeof unkey.ratelimit.limit>>;
    try {
      result = await unkey.ratelimit.limit({
        namespace,
        identifier: bucket.identifier,
        limit: bucket.limit,
        duration: bucket.durationMs,
        cost: 1,
      });
    } catch (error) {
      serverlessWarn('Upstream budget skipped (Unkey request failed)', {
        requestId,
        namespace,
        bucket: bucket.identifier,
        error: error instanceof Error ? error.message : String(error),
      });
      return true;
    }

    if (!result.data.success) {
      serverlessWarn('Anonymous upstream budget exhausted', {
        requestId,
        bucket: bucket.identifier,
      });
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Retry-After',
        retryAfterSeconds(normalizeResetMs(result.data.reset))
      );
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message:
          'Too many filtered requests site-wide. Request without a query string, or retry after the time in Retry-After.',
        requestId,
      });
      return false;
    }
  }

  return true;
}

function setVaryHeader(res: VercelResponse, value: string): void {
  const current = res.getHeader('Vary');
  const existing = Array.isArray(current)
    ? current.join(',')
    : String(current ?? '');

  const values = new Set(
    existing.split(',').flatMap((item) => {
      const trimmed = item.trim();
      return trimmed ? [trimmed] : [];
    })
  );
  values.add(value);

  res.setHeader('Vary', Array.from(values).join(', '));
}

/**
 * The API-key layer on its own: `Vary`, then Unkey auth (public host) or the
 * anonymous per-IP limit plus, with `upstreamBudget` and a query string, the
 * global anonymous upstream budget, then `handler`. Runs inside `withEnvelope`.
 */
export function withApiKey(
  handler: HandlerConfig['handler'],
  createUnkeyClient: CreateUnkeyClient = createRealUnkeyClient,
  options: ApiKeyOptions = {}
): EnvelopeHandler {
  return async (req, res, ctx) => {
    setVaryHeader(res, 'Host');
    if (ctx.isPublicApi) {
      setVaryHeader(res, 'X-API-Key');
      setVaryHeader(res, 'X-Client-Id');
    }

    // Before any limiter: a redirect costs no Unkey or Supabase call, and a
    // cached 308 must not carry one caller's X-RateLimit-* headers.
    if (!ctx.isPublicApi && options.canonicalPath) {
      const rawUrl = req.url ?? '';
      const queryStart = rawUrl.indexOf('?');
      const rawPath = queryStart === -1 ? rawUrl : rawUrl.slice(0, queryStart);
      if (rawPath !== options.canonicalPath) {
        const canonical =
          options.canonicalPath +
          (queryStart === -1 ? '' : rawUrl.slice(queryStart));
        res.setHeader('Cache-Control', CANONICAL_REDIRECT_CACHE_CONTROL);
        res.setHeader('Location', canonical);
        res.status(308).json({
          error: 'Permanent redirect',
          location: canonical,
          requestId: ctx.requestId,
        });
        return;
      }
    }

    const passedChecks = ctx.isPublicApi
      ? await applyPublicApiKeyAuth(req, res, ctx.requestId, createUnkeyClient)
      : await applyAnonymousRateLimit(
          req,
          res,
          ctx.requestId,
          createUnkeyClient
        );

    if (!passedChecks) {
      return;
    }

    if (
      !ctx.isPublicApi &&
      options.upstreamBudget &&
      bypassesCdn(req) &&
      !(await applyAnonymousUpstreamBudget(
        res,
        ctx.requestId,
        createUnkeyClient
      ))
    ) {
      return;
    }

    await handler(req, res, ctx);
  };
}

/** A keyed GET data endpoint: the request envelope plus the API-key layer. */
export function withHandler(config: HandlerConfig): VercelApiHandler {
  return withEnvelope(
    {
      name: config.name,
      methods: ['GET'],
      cors: 'public-api',
      cache: { publicApi: PUBLIC_API_CACHE_CONTROL },
      requiredEnv: config.requiredEnv,
    },
    withApiKey(config.handler, config.createUnkeyClient, {
      upstreamBudget: config.upstreamBudget,
      canonicalPath: config.canonicalPath,
    })
  );
}
