import { z } from 'zod';
import {
  fetchUpstreamJson,
  MAX_UPSTREAM_RESPONSE_SIZE,
} from './fetchUpstreamJson';
import { validateAndSanitizeQuery } from './queryValidation';
import { type HandlerConfig, withHandler } from './withHandler';

/** Website responses: short browser cache, longer CDN cache. */
const ANONYMOUS_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
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
 * Returns null when the body cannot be read (for example the upstream closed the
 * connection mid-body); the caller answers with the standard 502. Abort and
 * timeout errors are rethrown so the request envelope maps them to 504.
 */
async function readUpstreamError(
  response: Response,
  fallback: string
): Promise<string | null> {
  const contentLength = Number.parseInt(
    response.headers.get('content-length') ?? '',
    10
  );
  if (contentLength > MAX_UPSTREAM_RESPONSE_SIZE) {
    return fallback;
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')
    ) {
      throw error;
    }
    return null;
  }
  if (text.length > MAX_UPSTREAM_RESPONSE_SIZE) {
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
 * The proxy request itself, without the `withHandler` wrapper's host auth,
 * CORS, cache pinning, and env checks. Exported so callers, including tests,
 * can drive it with an explicit `HandlerContext`.
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

    await fetchUpstreamJson(res, ctx, {
      url: targetUrl,
      headers: {
        Authorization: `Bearer ${supabaseMasterApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': ctx.userAgent,
        Accept: 'application/json',
        'x-proxy-secret': proxySecret,
      },
      label: 'upstream API',
      cache: ANONYMOUS_CACHE_CONTROL,
      onUpstreamStatus: async (response) => {
        if (response.status !== PASSTHROUGH_STATUS) {
          return false;
        }
        const upstreamError = await readUpstreamError(
          response,
          PASSTHROUGH_FALLBACK
        );
        if (upstreamError === null) {
          return false;
        }
        res.status(PASSTHROUGH_STATUS).json({
          error: upstreamError,
          requestId: ctx.requestId,
        });
        return true;
      },
    });
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
