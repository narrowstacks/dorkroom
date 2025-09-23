import type { VercelRequest, VercelResponse } from '@vercel/node';

// The master API key that has high rate limits
const SUPABASE_MASTER_API_KEY = process.env.SUPABASE_MASTER_API_KEY;
const SUPABASE_ENDPOINT =
  'https://ukpdbjhbudgsjqsxlays.supabase.co/functions/v1/combinations';

// Request timeout in milliseconds (30 seconds)
const TIMEOUT_MS = 30000;

// Helper function to create AbortSignal with timeout
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

// Helper function to validate query parameters
function validateAndSanitizeQuery(
  query: VercelRequest['query']
): URLSearchParams {
  const params = new URLSearchParams();

  // Allow only specific known parameters to prevent injection
  const allowedParams = [
    'film',
    'developer',
    'count',
    'page',
    'id',
    'query',
    'fuzzy',
    'limit',
  ];

  for (const [key, value] of Object.entries(query)) {
    if (
      allowedParams.includes(key) &&
      typeof value === 'string' &&
      value.trim()
    ) {
      params.set(key, value.trim());
    } else if (
      allowedParams.includes(key) &&
      Array.isArray(value) &&
      value.length > 0
    ) {
      // Handle array parameters (take first value)
      const firstValue = value[0];
      if (typeof firstValue === 'string' && firstValue.trim()) {
        params.set(key, firstValue.trim());
      }
    }
  }

  return params;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  console.log(`[${requestId}] Combinations API request started`, {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });

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
    console.log(`[${requestId}] CORS preflight request handled`);
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    console.warn(`[${requestId}] Method not allowed: ${req.method}`);
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'OPTIONS'],
      requestId,
    });
  }

  try {
    // Validate that we have the API key
    if (!SUPABASE_MASTER_API_KEY) {
      console.error(
        `[${requestId}] SUPABASE_MASTER_API_KEY environment variable is not set`
      );
      return res.status(500).json({
        error: 'API configuration error',
        message: 'Missing required environment configuration',
        requestId,
      });
    }

    // Validate and sanitize query parameters
    const queryParams = validateAndSanitizeQuery(req.query);
    const queryString = queryParams.toString();
    const targetUrl = queryString
      ? `${SUPABASE_ENDPOINT}?${queryString}`
      : SUPABASE_ENDPOINT;

    console.log(`[${requestId}] Making request to Supabase`, {
      targetUrl,
      queryParams: Object.fromEntries(queryParams.entries()),
    });

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
      console.error(`[${requestId}] Supabase API error`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseTime,
      });

      // Try to get error response body for more details
      let errorDetails = null;
      try {
        const errorText = await response.text();
        errorDetails = errorText ? JSON.parse(errorText) : null;
      } catch {
        console.warn(`[${requestId}] Could not parse error response`);
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
      console.error(
        `[${requestId}] Invalid response content type: ${contentType}`
      );
      return res.status(502).json({
        error: 'Invalid response format',
        message: 'Expected JSON response from upstream API',
        contentType,
        requestId,
      });
    }

    // Parse JSON response with error handling
    let data;
    try {
      data = await response.json();
    } catch (_parseError) {
      console.error(`[${requestId}] JSON parse error`, _parseError);
      return res.status(502).json({
        error: 'Response parse error',
        message: 'Could not parse JSON response from upstream API',
        requestId,
      });
    }

    console.log(`[${requestId}] Request completed successfully`, {
      responseTime,
      dataLength: Array.isArray(data?.data) ? data.data.length : 'N/A',
    });

    // Return the data with cache headers
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=600'
    ); // 5 min cache, 10 min stale
    return res.status(200).json(data);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[${requestId}] API function error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      responseTime,
    });

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
