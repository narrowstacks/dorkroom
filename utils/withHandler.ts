import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { Unkey } from '@unkey/api';
import type {
  VercelApiHandler,
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import {
  logApiError,
  logApiRequest,
  serverlessError,
  serverlessLog,
  serverlessWarn,
} from './serverlessLogger';

interface VerifyRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  exceeded: boolean;
}

export interface HandlerContext {
  requestId: string;
  startTime: number;
  userAgent: string;
  isPublicApi: boolean;
}

export interface HandlerConfig {
  name: string;
  requiredEnv?: string[];
  handler: (
    req: VercelRequest,
    res: VercelResponse,
    ctx: HandlerContext
  ) => Promise<void>;
}

const ANONYMOUS_RATE_LIMIT = 30;
const ANONYMOUS_RATE_WINDOW_MS = 60_000;
// Per-client rate limiting on the keyed (api.dorkroom.art) path — see
// applyClientIdentityRateLimit. The shared key's own Unkey ratelimit remains
// a global DDoS brake; these bound a single install / IP address instead.
const CLIENT_RATE_LIMIT = 60;
const CLIENT_IP_RATE_LIMIT = 240;
const CLIENT_RATE_WINDOW_MS = 60_000;
// Accepts `generateId()` output (timestamp+random, base36) and any future
// UUID-shaped identity. Anything else is treated as an absent header rather
// than rejected, so a malformed value never turns into a 4xx.
const CLIENT_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;
const PUBLIC_API_HOST = 'api.dorkroom.art';
const ALLOWED_ANONYMOUS_HOSTS = new Set([
  'dorkroom.art',
  'www.dorkroom.art',
  'localhost',
  '127.0.0.1',
  '::1',
]);

let unkeyClient: Unkey | null = null;
let unkeyInitialized = false;

function getHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return typeof value === 'string' ? value : '';
}

function normalizeHost(value: string): string {
  const first = value.split(',')[0]?.trim().toLowerCase() ?? '';
  if (!first) {
    return '';
  }

  if (first.startsWith('[')) {
    return first;
  }

  const separatorIndex = first.indexOf(':');
  if (separatorIndex === -1) {
    return first;
  }

  return first.slice(0, separatorIndex);
}

function isPublicApiRequest(req: VercelRequest, requestId: string): boolean {
  const host = normalizeHost(getHeaderValue(req.headers.host));
  const forwardedHost = normalizeHost(
    getHeaderValue(req.headers['x-forwarded-host'])
  );
  const observedHosts = [host, forwardedHost].filter(Boolean);

  if (host && forwardedHost && host !== forwardedHost) {
    serverlessWarn('Host header mismatch detected', {
      requestId,
      host,
      forwardedHost,
    });
  }

  if (observedHosts.includes(PUBLIC_API_HOST)) {
    return true;
  }

  if (observedHosts.length === 0) {
    serverlessWarn('Missing host headers, enforcing API-key auth', {
      requestId,
    });
    return true;
  }

  if (
    observedHosts.every(
      (observedHost) =>
        ALLOWED_ANONYMOUS_HOSTS.has(observedHost) ||
        observedHost.endsWith('.vercel.app')
    )
  ) {
    return false;
  }

  serverlessWarn('Unknown host, enforcing API-key auth', {
    requestId,
    host,
    forwardedHost,
  });
  return true;
}

function normalizeResetMs(reset: number): number {
  // Some responses use a reset duration, others a unix timestamp in ms.
  if (reset > 1_000_000_000_000) {
    return reset;
  }

  return Date.now() + reset;
}

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

function getUnkeyClient(requestId: string): Unkey | null {
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

  unkeyClient = new Unkey({ rootKey });
  return unkeyClient;
}

async function applyPublicApiKeyAuth(
  req: VercelRequest,
  res: VercelResponse,
  requestId: string
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

  const unkey = getUnkeyClient(requestId);
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
      clientId
    );
    if (!passedClientChecks) {
      return false;
    }
  }

  return true;
}

function getClientNamespace(): string {
  const configuredNamespace = process.env.UNKEY_CLIENT_NAMESPACE?.trim();
  return (
    configuredNamespace ||
    (process.env.UNKEY_API_ID
      ? `${process.env.UNKEY_API_ID}-client`
      : 'dorkroom-client')
  );
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
  clientId: string
): Promise<boolean> {
  const namespace = getClientNamespace();
  const clientIp = getClientIp(req);

  const [clientOk, ipOk] = await Promise.all([
    applyNamespaceRateLimit(res, requestId, {
      namespace,
      identifier: `client:${clientId}`,
      limit: CLIENT_RATE_LIMIT,
      durationMs: CLIENT_RATE_WINDOW_MS,
    }),
    applyNamespaceRateLimit(res, requestId, {
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
  opts: {
    namespace: string;
    identifier: string;
    limit: number;
    durationMs: number;
    setHeadersOnSuccess?: boolean;
  }
): Promise<boolean> {
  const unkey = getUnkeyClient(requestId);

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
  requestId: string
): Promise<boolean> {
  const configuredNamespace = process.env.UNKEY_ANON_NAMESPACE?.trim();
  const namespace =
    configuredNamespace ||
    (process.env.UNKEY_API_ID
      ? `${process.env.UNKEY_API_ID}-anonymous`
      : 'dorkroom-anonymous');

  return applyNamespaceRateLimit(res, requestId, {
    namespace,
    identifier: getClientIp(req),
    limit: ANONYMOUS_RATE_LIMIT,
    durationMs: ANONYMOUS_RATE_WINDOW_MS,
  });
}

function hasRequiredEnv(requiredEnv: string[]): string[] {
  return requiredEnv.filter((envVar) => !process.env[envVar]);
}

function setVaryHeader(res: VercelResponse, value: string): void {
  const current = res.getHeader('Vary');
  const existing = Array.isArray(current)
    ? current.join(',')
    : typeof current === 'string'
      ? current
      : '';

  const values = new Set(
    existing.split(',').flatMap((item) => {
      const trimmed = item.trim();
      return trimmed ? [trimmed] : [];
    })
  );
  values.add(value);

  res.setHeader('Vary', Array.from(values).join(', '));
}

export function withHandler(config: HandlerConfig): VercelApiHandler {
  return async function wrappedHandler(
    req: VercelRequest,
    res: VercelResponse
  ) {
    const startTime = Date.now();
    const requestId = randomUUID();
    const userAgent =
      getHeaderValue(req.headers['user-agent']) || 'DorkroomReact-API';

    logApiRequest(
      requestId,
      req.method || 'GET',
      req.url || `/api/${config.name}`,
      userAgent
    );

    const isPublicApi = isPublicApiRequest(req, requestId);

    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Only set permissive CORS on the public API (api.dorkroom.art).
    // Internal same-origin requests (dorkroom.art) don't need CORS headers;
    // omitting them blocks cross-origin reads from other sites.
    if (isPublicApi) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Id'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      serverlessLog('CORS preflight request handled', {
        requestId,
        endpoint: config.name,
      });
      res.status(200).end();
      return;
    }

    if (req.method !== 'GET') {
      serverlessWarn('Method not allowed', {
        requestId,
        endpoint: config.name,
        method: req.method,
      });
      res.status(405).json({
        error: 'Method not allowed',
        allowed: ['GET', 'OPTIONS'],
        requestId,
      });
      return;
    }

    try {
      const requiredEnv = config.requiredEnv ?? [];
      const missingEnv = hasRequiredEnv(requiredEnv);

      if (missingEnv.length > 0) {
        serverlessError('Required environment variables are not set', {
          requestId,
          endpoint: config.name,
          missingEnv: missingEnv.join(','),
        });

        res.status(500).json({
          error: 'API configuration error',
          message: 'Missing required environment configuration',
          requestId,
        });
        return;
      }
      setVaryHeader(res, 'Host');
      if (isPublicApi) {
        setVaryHeader(res, 'X-API-Key');
        setVaryHeader(res, 'X-Client-Id');
        res.setHeader('Cache-Control', 'private, no-store');
      }

      const passedChecks = isPublicApi
        ? await applyPublicApiKeyAuth(req, res, requestId)
        : await applyAnonymousRateLimit(req, res, requestId);

      if (!passedChecks) {
        return;
      }

      await config.handler(req, res, {
        requestId,
        startTime,
        userAgent,
        isPublicApi,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiError(
        requestId,
        error instanceof Error ? error : String(error),
        500,
        { responseTime, endpoint: config.name }
      );

      if (res.writableEnded) {
        return;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        res.status(504).json({
          error: 'Request timeout',
          message: 'Request to upstream service timed out',
          requestId,
        });
        return;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        res.status(502).json({
          error: 'Network error',
          message: 'Could not connect to upstream API',
          requestId,
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        requestId,
      });
    }
  };
}
