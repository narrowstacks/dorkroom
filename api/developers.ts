import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateAndSanitizeQuery } from '../utils/queryValidation';
import {
  logApiError,
  logApiRequest,
  logApiResponse,
  logExternalApiCall,
  logExternalApiResponse,
  serverlessError,
  serverlessLog,
  serverlessWarn,
} from '../utils/serverlessLogger';

// The master API key that has high rate limits
const SUPABASE_MASTER_API_KEY = process.env.SUPABASE_MASTER_API_KEY;
const SUPABASE_BASE_URL = process.env.SUPABASE_ENDPOINT;
const SUPABASE_ENDPOINT = `${SUPABASE_BASE_URL}/functions/v1/developers`;

// Request timeout in milliseconds (30 seconds)
const TIMEOUT_MS = 30000;

// Helper function to create AbortSignal with timeout
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

// Allowed query parameters for this endpoint
const ALLOWED_PARAMS = ['query', 'fuzzy', 'limit', 'type', 'manufacturer'];

/**
 * Handle GET requests by proxying sanitized queries to the Supabase developers endpoint and returning JSON results with caching and error mapping.
 *
 * Performs CORS preflight handling, validates required environment configuration, sanitizes incoming query parameters, forwards the request to the upstream Supabase functions endpoint using the master API key, validates and parses the JSON response, and returns the upstream data with Cache-Control headers. Upstream errors, timeouts, and network failures are translated into appropriate HTTP error responses that include a generated `requestId`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  logApiRequest(
    requestId,
    req.method || 'GET',
    req.url || '/api/developers',
    req.headers['user-agent']
  );

  // Set enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    serverlessLog('CORS preflight request handled', { requestId });
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    serverlessWarn('Method not allowed', { requestId, method: req.method });
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'OPTIONS'],
      requestId,
    });
  }

  try {
    // Validate that we have the API key and endpoint
    if (!SUPABASE_MASTER_API_KEY) {
      serverlessError(
        'SUPABASE_MASTER_API_KEY environment variable is not set',
        {
          requestId,
        }
      );
      return res.status(500).json({
        error: 'API configuration error',
        message: 'Missing required environment configuration',
        requestId,
      });
    }

    if (!SUPABASE_BASE_URL) {
      serverlessError('SUPABASE_ENDPOINT environment variable is not set', {
        requestId,
      });
      return res.status(500).json({
        error: 'API configuration error',
        message: 'Missing required environment configuration',
        requestId,
      });
    }

    // Validate and sanitize query parameters with security limits
    const queryParams = validateAndSanitizeQuery(req.query, ALLOWED_PARAMS);
    const queryString = queryParams.toString();
    const targetUrl = queryString
      ? `${SUPABASE_ENDPOINT}?${queryString}`
      : SUPABASE_ENDPOINT;

    logExternalApiCall(requestId, targetUrl, 'GET');

    // Make the request to Supabase with the master API key and timeout
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SUPABASE_MASTER_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent'] || 'DorkroomReact-API',
        Accept: 'application/json',
      },
      signal: createTimeoutSignal(TIMEOUT_MS),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      logExternalApiResponse(
        requestId,
        targetUrl,
        response.status,
        responseTime,
        false
      );

      // Try to get error response body for more details
      let errorDetails = null;
      try {
        const errorText = await response.text();
        errorDetails = errorText ? JSON.parse(errorText) : null;
      } catch {
        serverlessWarn('Could not parse error response', { requestId });
      }

      return res.status(response.status).json({
        error: 'External API error',
        status: response.status,
        statusText: response.statusText,
        details: errorDetails,
        requestId,
      });
    }

    // Validate response content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      serverlessError('Invalid response content type', {
        requestId,
        contentType,
      });
      return res.status(502).json({
        error: 'Invalid response format',
        message: 'Expected JSON response from upstream API',
        contentType,
        requestId,
      });
    }

    // Parse JSON response with error handling
    let data: unknown;
    try {
      data = await response.json();
    } catch (_parseError) {
      serverlessError('JSON parse error', {
        requestId,
        error:
          _parseError instanceof Error
            ? _parseError.message
            : String(_parseError),
      });
      return res.status(502).json({
        error: 'Response parse error',
        message: 'Could not parse JSON response from upstream API',
        requestId,
      });
    }

    logExternalApiResponse(
      requestId,
      targetUrl,
      response.status,
      responseTime,
      true
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- API response structure matches expected shape
    const responseData = data as Record<string, unknown> | null;
    logApiResponse(requestId, 200, responseTime, {
      dataLength: Array.isArray(responseData?.data)
        ? responseData.data.length
        : 'N/A',
    });

    // Return the data with cache headers
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=600'
    ); // 5 min cache, 10 min stale
    return res.status(200).json(data);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logApiError(
      requestId,
      error instanceof Error ? error : String(error),
      500,
      { responseTime }
    );

    // Handle specific error types
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout',
        message: `Request timed out after ${TIMEOUT_MS}ms`,
        requestId,
      });
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return res.status(502).json({
        error: 'Network error',
        message: 'Could not connect to upstream API',
        requestId,
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    });
  }
}
