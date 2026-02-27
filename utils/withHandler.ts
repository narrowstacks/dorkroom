import { Unkey } from '@unkey/api';
import type {
  VercelHandler,
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

let unkeyClient: Unkey | null = null;
let unkeyInitialized = false;

function getHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return typeof value === 'string' ? value : '';
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

function getClientIp(req: VercelRequest): string {
  const forwardedFor = getHeaderValue(req.headers['x-forwarded-for']);

  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = getHeaderValue(req.headers['x-real-ip']).trim();
  if (realIp) {
    return realIp;
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

  const verification = await unkey.keys.verifyKey({
    key: apiKey,
    tags: [`api=${apiId}`],
  });

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

  const namespace = process.env.UNKEY_API_ID
    ? `${process.env.UNKEY_API_ID}-anonymous`
    : 'dorkroom-anonymous';

  const identifier = getClientIp(req);

  const result = await unkey.ratelimit.limit({
    namespace,
    identifier,
    limit: ANONYMOUS_RATE_LIMIT,
    duration: ANONYMOUS_RATE_WINDOW_MS,
  });

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

export function withHandler(config: HandlerConfig): VercelHandler {
  return async function wrappedHandler(req, res) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    const userAgent =
      getHeaderValue(req.headers['user-agent']) || 'DorkroomReact-API';

    logApiRequest(
      requestId,
      req.method || 'GET',
      req.url || `/api/${config.name}`,
      userAgent
    );

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

      const host =
        getHeaderValue(req.headers['x-forwarded-host']) ||
        getHeaderValue(req.headers.host);
      const normalizedHost = host.toLowerCase();
      const isPublicApi = normalizedHost.includes('api.dorkroom.art');

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
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
    }
  };
}
