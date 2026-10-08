import { z } from 'zod';
import { validateAndSanitizeQuery } from './queryValidation';
import {
  logApiResponse,
  logExternalApiCall,
  logExternalApiResponse,
  serverlessError,
  serverlessWarn,
} from './serverlessLogger';
import { createTimeoutSignal } from './timeoutSignal';
import { type HandlerConfig, withHandler } from './withHandler';

const TIMEOUT_MS = 30_000;
const MAX_RESPONSE_SIZE = 1024 * 1024;
const MAX_UPSTREAM_ERROR_LENGTH = 200;

/**
 * Only an upstream 400 is passed through. A 404 stays a 502: the data service
 * answers missing records with empty data, so a 404 means the route is broken.
 */
const PASSTHROUGH_STATUS = 400;
const PASSTHROUGH_FALLBACK = 'Invalid request parameter';

/** Capped so a misbehaving upstream cannot push arbitrary text through the proxy. */
const upstreamErrorSchema = z.object({
  error: z.string().max(MAX_UPSTREAM_ERROR_LENGTH),
});

/**
 * Pulls the short `error` string out of an upstream 400 body, or returns the
 * fallback when the body is oversized, malformed JSON, or not a usable string.
 * Read failures (abort, timeout, network) are not caught so withHandler maps them.
 */
async function readUpstreamError(
  response: Response,
  fallback: string
): Promise<string> {
  const contentLength = Number.parseInt(
    response.headers.get('content-length') ?? '',
    10
  );
  if (contentLength > MAX_RESPONSE_SIZE) {
    return fallback;
  }

  const text = await response.text();
  if (text.length > MAX_RESPONSE_SIZE) {
    return fallback;
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return fallback;
    }
    throw error;
  }

  const parsed = upstreamErrorSchema.safeParse(body);
  if (parsed.success) {
    const trimmed = parsed.data.error.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return fallback;
}

export interface SupabaseProxyConfig {
  name: string;
  allowedParams: string[];
}

/**
 * The one field this proxy reads from an upstream payload: list endpoints answer
 * with `{ data: [...] }` and the row count goes into the log. The payload itself
 * is forwarded verbatim.
 */
interface UpstreamListPayload {
  data?: readonly unknown[];
}

/**
 * The proxy request itself, without the `withHandler` wrapper's host auth,
 * CORS, and env checks. Exported so callers — including tests — can drive it
 * with an explicit `HandlerContext`.
 */
export function createSupabaseProxyHandler({
  name,
  allowedParams,
}: SupabaseProxyConfig): HandlerConfig['handler'] {
  return async (req, res, ctx) => {
    const supabaseMasterApiKey = process.env.SUPABASE_MASTER_API_KEY;
    const supabaseBaseUrl = process.env.SUPABASE_ENDPOINT;
    const proxySecret = process.env.SUPABASE_PROXY_SECRET;

    if (!supabaseMasterApiKey || !supabaseBaseUrl || !proxySecret) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseEndpoint = `${supabaseBaseUrl}/functions/v1/${name}`;

    const queryParams = validateAndSanitizeQuery(req.query, allowedParams);
    const queryString = queryParams.toString();
    const targetUrl = queryString
      ? `${supabaseEndpoint}?${queryString}`
      : supabaseEndpoint;

    logExternalApiCall(ctx.requestId, targetUrl, 'GET');

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${supabaseMasterApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': ctx.userAgent,
        Accept: 'application/json',
        'x-proxy-secret': proxySecret,
      },
      signal: createTimeoutSignal(TIMEOUT_MS),
    });

    const responseTime = Date.now() - ctx.startTime;

    if (!response.ok) {
      logExternalApiResponse(
        ctx.requestId,
        targetUrl,
        response.status,
        responseTime,
        false
      );
      serverlessWarn('Upstream API returned non-OK response', {
        requestId: ctx.requestId,
        status: response.status,
      });

      if (response.status === PASSTHROUGH_STATUS) {
        res.status(PASSTHROUGH_STATUS).json({
          error: await readUpstreamError(response, PASSTHROUGH_FALLBACK),
          requestId: ctx.requestId,
        });
        return;
      }

      res.status(502).json({
        error: 'External API error',
        message: 'Upstream service returned an error',
        requestId: ctx.requestId,
      });
      return;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      serverlessError('Invalid response content type', {
        requestId: ctx.requestId,
        contentType,
      });

      res.status(502).json({
        error: 'Invalid response format',
        message: 'Expected JSON response from upstream API',
        requestId: ctx.requestId,
      });
      return;
    }

    const contentLength = response.headers.get('content-length');
    if (
      contentLength &&
      Number.parseInt(contentLength, 10) > MAX_RESPONSE_SIZE
    ) {
      serverlessError('Response too large', {
        requestId: ctx.requestId,
        contentLength,
        maxAllowed: MAX_RESPONSE_SIZE,
      });

      res.status(502).json({
        error: 'Response too large',
        message: 'Response from upstream API exceeds maximum allowed size',
        requestId: ctx.requestId,
      });
      return;
    }

    let data: UpstreamListPayload | null = null;
    try {
      data = await response.json();
    } catch (parseError) {
      serverlessError('JSON parse error', {
        requestId: ctx.requestId,
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      });

      res.status(502).json({
        error: 'Response parse error',
        message: 'Could not parse JSON response from upstream API',
        requestId: ctx.requestId,
      });
      return;
    }

    logExternalApiResponse(
      ctx.requestId,
      targetUrl,
      response.status,
      responseTime,
      true
    );

    logApiResponse(ctx.requestId, 200, responseTime, {
      dataLength: Array.isArray(data?.data) ? data.data.length : 'N/A',
    });

    res.setHeader(
      'Cache-Control',
      ctx.isPublicApi
        ? 'private, no-store'
        : 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
    );
    res.status(200).json(data);
  };
}

export function createSupabaseProxy(config: SupabaseProxyConfig) {
  return withHandler({
    name: config.name,
    requiredEnv: [
      'SUPABASE_MASTER_API_KEY',
      'SUPABASE_ENDPOINT',
      'SUPABASE_PROXY_SECRET',
    ],
    handler: createSupabaseProxyHandler(config),
  });
}
