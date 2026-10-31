import { randomUUID } from 'node:crypto';
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

/**
 * The request envelope every Node handler in `api/` runs inside: request ID,
 * host classification, `nosniff`, CORS, the method guard and `OPTIONS`
 * answer, cache policy, required-env check, logging, and outer error mapping.
 *
 * It carries no authentication. Data endpoints add the Unkey key check and
 * rate limiting on top through `withHandler` (see `withHandler.ts`); pages
 * that must stay keyless (docs, reference, the spec, the JSON 404, the crawler
 * meta endpoint) use the envelope alone.
 *
 * One behaviour for every handler:
 *  - `OPTIONS` answers `204` with `Allow`, before any handler code runs.
 *  - A method outside `policy.methods` answers `405` with `Allow` and a JSON
 *    body `{ error, allowed, requestId }`.
 *  - `Allow` and `Access-Control-Allow-Methods` both list `policy.methods`
 *    plus `OPTIONS`.
 */

export type HttpMethod = 'GET' | 'HEAD';

/** Where permissive (`*`) CORS headers are sent. */
export type CorsPolicy =
  /** Only on `api.dorkroom.art` (and unknown hosts, which are treated as it). */
  | 'public-api'
  /** On every host: resources external tooling fetches cross-origin. */
  | 'any-host'
  /** Never: same-origin pages. */
  | 'none';

export interface CachePolicy {
  /**
   * `Cache-Control` for every response on the public API host, set before the
   * handler runs. `ctx.setCacheControl` cannot override it there.
   */
  publicApi?: string;
  /** `Cache-Control` for every response on every host, pinned the same way. */
  always?: string;
}

export interface EnvelopePolicy {
  /** Log label, also the fallback URL in the request log. */
  name: string;
  /**
   * Methods the handler serves. `'any'` disables the method guard (the JSON
   * 404 answers every method with a 404, not a 405).
   */
  methods: readonly HttpMethod[] | 'any';
  cors: CorsPolicy;
  cache?: CachePolicy;
  /** Env vars without which the handler answers 500 before running. */
  requiredEnv?: readonly string[];
}

export interface HandlerContext {
  requestId: string;
  startTime: number;
  userAgent: string;
  isPublicApi: boolean;
  /**
   * Sets `Cache-Control` for a response the handler wants cached, unless the
   * envelope pinned one for this request (`CachePolicy`), in which case the
   * pinned value stands. Handlers call this instead of branching on host.
   */
  setCacheControl: (value: string) => void;
}

export type EnvelopeHandler = (
  req: VercelRequest,
  res: VercelResponse,
  ctx: HandlerContext
) => void | Promise<void>;

const PUBLIC_API_HOST = 'api.dorkroom.art';
const ALLOWED_ANONYMOUS_HOSTS = new Set([
  'dorkroom.art',
  'www.dorkroom.art',
  'localhost',
  '127.0.0.1',
  '::1',
]);

export const CORS_ALLOW_HEADERS =
  'Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Id';
const CORS_MAX_AGE_SECONDS = '86400';

export function getHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
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

/**
 * True for the public API host and for anything the envelope cannot place
 * (missing or unknown host): those get the stricter treatment, which on a
 * data endpoint means an API key is required.
 */
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

function hasMissingEnv(requiredEnv: readonly string[]): string[] {
  return requiredEnv.filter((envVar) => !process.env[envVar]);
}

export function withEnvelope(
  policy: EnvelopePolicy,
  handler: EnvelopeHandler
): VercelApiHandler {
  const allowedMethods: readonly string[] | null =
    policy.methods === 'any' ? null : [...policy.methods, 'OPTIONS'];
  const allowed = allowedMethods ? allowedMethods.join(', ') : null;

  return async function envelopedHandler(
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
      req.url || `/api/${policy.name}`,
      userAgent
    );

    const isPublicApi = isPublicApiRequest(req, requestId);

    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (
      policy.cors === 'any-host' ||
      (policy.cors === 'public-api' && isPublicApi)
    ) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', allowed ?? 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
      res.setHeader('Access-Control-Max-Age', CORS_MAX_AGE_SECONDS);
    }

    const pinnedCache =
      policy.cache?.always ??
      (isPublicApi ? policy.cache?.publicApi : undefined);
    if (pinnedCache) {
      res.setHeader('Cache-Control', pinnedCache);
    }

    if (req.method === 'OPTIONS') {
      serverlessLog('CORS preflight request handled', {
        requestId,
        endpoint: policy.name,
      });
      if (allowed) {
        res.setHeader('Allow', allowed);
      }
      res.status(204).end();
      return;
    }

    if (allowedMethods && !allowedMethods.includes(req.method ?? '')) {
      serverlessWarn('Method not allowed', {
        requestId,
        endpoint: policy.name,
        method: req.method,
      });
      res.setHeader('Allow', allowedMethods.join(', '));
      res.status(405).json({
        error: 'Method not allowed',
        allowed: allowedMethods,
        requestId,
      });
      return;
    }

    try {
      const missingEnv = hasMissingEnv(policy.requiredEnv ?? []);
      if (missingEnv.length > 0) {
        serverlessError('Required environment variables are not set', {
          requestId,
          endpoint: policy.name,
          missingEnv: missingEnv.join(','),
        });

        res.status(500).json({
          error: 'API configuration error',
          message: 'Missing required environment configuration',
          requestId,
        });
        return;
      }

      await handler(req, res, {
        requestId,
        startTime,
        userAgent,
        isPublicApi,
        setCacheControl: (value) => {
          if (!pinnedCache) {
            res.setHeader('Cache-Control', value);
          }
        },
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiError(
        requestId,
        error instanceof Error ? error : String(error),
        500,
        { responseTime, endpoint: policy.name }
      );

      if (res.writableEnded) {
        return;
      }

      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')
      ) {
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
