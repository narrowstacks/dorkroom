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

  const parts = forwardedFor
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

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

  return true;
}

async function applyAnonymousRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  requestId: string
): Promise<boolean> {
  const unkey = getUnkeyClient(requestId);

  if (!unkey) {
    serverlessWarn('Anonymous rate limiting skipped (Unkey not configured)', {
      requestId,
    });
    return true;
  }

  const configuredNamespace = process.env.UNKEY_ANON_NAMESPACE?.trim();
  const namespace =
    configuredNamespace ||
    (process.env.UNKEY_API_ID
      ? `${process.env.UNKEY_API_ID}-anonymous`
      : 'dorkroom-anonymous');

  const identifier = getClientIp(req);

  let result: Awaited<ReturnType<typeof unkey.ratelimit.limit>>;
  try {
    result = await unkey.ratelimit.limit({
      namespace,
      identifier,
      limit: ANONYMOUS_RATE_LIMIT,
      duration: ANONYMOUS_RATE_WINDOW_MS,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const shouldFailOpen = process.env.NODE_ENV !== 'production';

    if (errorMessage.includes('create_namespace')) {
      if (shouldFailOpen) {
        serverlessWarn(
          'Anonymous rate limiting skipped due to missing create_namespace permission',
          {
            requestId,
            namespace,
          }
        );
        return true;
      }

      serverlessError(
        'Anonymous rate limiting misconfigured: missing create_namespace permission',
        {
          requestId,
          namespace,
        }
      );
      res.status(500).json({
        error: 'API configuration error',
        message: 'Anonymous rate limiting is not configured',
        requestId,
      });
      return false;
    }

    if (
      errorMessage.includes('Insufficient Permissions') ||
      errorMessage.includes('Missing permission')
    ) {
      serverlessError(
        'Anonymous rate limiting misconfigured: insufficient Unkey permissions',
        {
          requestId,
          namespace,
        }
      );
      res.status(500).json({
        error: 'API configuration error',
        message: 'Anonymous rate limiting is not configured',
        requestId,
      });
      return false;
    }

    throw error;
  }

  const rateLimitData = result.data;
  setRateLimitHeaders(res, {
    limit: rateLimitData.limit,
    remaining: rateLimitData.remaining,
    reset: rateLimitData.reset,
    exceeded: !rateLimitData.success,
  });

  if (!rateLimitData.success) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      requestId,
    });
    return false;
  }

  return true;
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
    existing
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
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

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-API-Key'
    );
    res.setHeader('Access-Control-Max-Age', '86400');

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

      const isPublicApi = isPublicApiRequest(req, requestId);
      setVaryHeader(res, 'Host');
      if (isPublicApi) {
        setVaryHeader(res, 'X-API-Key');
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
