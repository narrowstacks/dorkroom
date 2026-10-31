import type { VercelResponse } from '@vercel/node';
import type { HandlerContext } from './requestEnvelope';
import {
  logApiResponse,
  type LogContext,
  logExternalApiCall,
  logExternalApiResponse,
  serverlessError,
  serverlessWarn,
} from './serverlessLogger';

export const UPSTREAM_TIMEOUT_MS = 30_000;
export const MAX_UPSTREAM_RESPONSE_SIZE = 1024 * 1024;

export interface FetchUpstreamJsonOptions {
  url: string;
  headers: Record<string, string>;
  /**
   * Who the upstream is, in client-facing messages: "Expected JSON response
   * from <label>".
   */
  label: string;
  /**
   * `Cache-Control` for a successful response, applied through
   * `ctx.setCacheControl` (so a host whose cache policy the envelope pinned,
   * the public API host, keeps `private, no-store`).
   */
  cache: string;
  /**
   * Called for a non-OK upstream status before the generic 502. Return true
   * after writing a response to claim it (an upstream 400 or 404 the caller
   * maps to its own answer); false falls through to the 502.
   */
  onUpstreamStatus?: (response: Response) => Promise<boolean>;
  /** Extra fields for the success log line. */
  logFields?: LogContext;
}

/**
 * The one field read from an upstream payload: list endpoints answer with
 * `{ data: [...] }` and the row count goes into the log. The payload itself is
 * forwarded verbatim.
 */
interface UpstreamPayload {
  data?: unknown;
}

/**
 * GET a JSON document from an upstream service and forward it verbatim.
 *
 * The one upstream fetch the data endpoints share (`createSupabaseProxy`,
 * `api/filmdev.ts`):
 *  - 30s `AbortSignal.timeout`; an abort or network failure propagates, and
 *    the envelope maps it to 504 or 502.
 *  - Non-OK status: `onUpstreamStatus` may claim it, otherwise a 502 that
 *    leaks nothing from upstream.
 *  - Non-JSON `content-type`: 502.
 *  - Declared `content-length` over 1 MB: 502 without reading the body.
 *  - Unparseable body: 502.
 *  - Success: 200 with the parsed body and `options.cache`.
 */
export async function fetchUpstreamJson(
  res: VercelResponse,
  ctx: HandlerContext,
  options: FetchUpstreamJsonOptions
): Promise<void> {
  const { url, label } = options;

  logExternalApiCall(ctx.requestId, url, 'GET');

  const response = await fetch(url, {
    method: 'GET',
    headers: options.headers,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  const responseTime = Date.now() - ctx.startTime;

  if (!response.ok) {
    logExternalApiResponse(
      ctx.requestId,
      url,
      response.status,
      responseTime,
      false
    );
    serverlessWarn('Upstream API returned non-OK response', {
      requestId: ctx.requestId,
      status: response.status,
    });

    if (
      options.onUpstreamStatus &&
      (await options.onUpstreamStatus(response))
    ) {
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
      message: `Expected JSON response from ${label}`,
      requestId: ctx.requestId,
    });
    return;
  }

  const contentLength = response.headers.get('content-length');
  if (
    contentLength &&
    Number.parseInt(contentLength, 10) > MAX_UPSTREAM_RESPONSE_SIZE
  ) {
    serverlessError('Response too large', {
      requestId: ctx.requestId,
      contentLength,
      maxAllowed: MAX_UPSTREAM_RESPONSE_SIZE,
    });

    res.status(502).json({
      error: 'Response too large',
      message: `Response from ${label} exceeds maximum allowed size`,
      requestId: ctx.requestId,
    });
    return;
  }

  let data: UpstreamPayload | null;
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
      message: `Could not parse JSON response from ${label}`,
      requestId: ctx.requestId,
    });
    return;
  }

  logExternalApiResponse(
    ctx.requestId,
    url,
    response.status,
    responseTime,
    true
  );
  logApiResponse(ctx.requestId, 200, responseTime, {
    dataLength: Array.isArray(data?.data) ? data.data.length : 'N/A',
    ...options.logFields,
  });

  ctx.setCacheControl(options.cache);
  res.status(200).json(data);
}
