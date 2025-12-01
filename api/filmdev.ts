import type { VercelRequest, VercelResponse } from '@vercel/node';
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

const FILMDEV_API_BASE = 'https://filmdev.org/api';

// Request timeout in milliseconds (30 seconds)
const TIMEOUT_MS = 30000;

// Maximum response size in bytes (1MB) to prevent memory exhaustion
const MAX_RESPONSE_SIZE = 1024 * 1024;

// Maximum recipe ID to prevent DoS with extremely large numbers
const MAX_RECIPE_ID = 10_000_000;

// Helper function to create AbortSignal with timeout
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Validates that a recipe ID is a positive integer within acceptable bounds.
 *
 * @param id - The recipe ID to validate
 * @returns true if valid, false otherwise
 */
function isValidRecipeId(id: string): boolean {
  if (!/^\d+$/.test(id)) return false;
  const numericId = parseInt(id, 10);
  return numericId > 0 && numericId < MAX_RECIPE_ID;
}

/**
 * HTTP handler that proxies GET requests to filmdev.org recipe API.
 *
 * Expects: GET /api/filmdev?id=12345
 *
 * Handles CORS preflight (OPTIONS), allows only GET, validates the recipe ID parameter,
 * forwards the request to filmdev.org, and returns the upstream JSON payload.
 * Responses include a generated `requestId` for tracing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const userAgent =
    (() => {
      const ua = req.headers['user-agent'];
      if (Array.isArray(ua)) {
        return ua[0] || '';
      }
      return typeof ua === 'string' ? ua : '';
    })() || 'Dorkroom-FilmdevProxy';

  logApiRequest(
    requestId,
    req.method || 'GET',
    req.url || '/api/filmdev',
    userAgent
  );

  // Set CORS headers
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

  // Extract and validate recipe ID from query parameter
  const { id } = req.query;
  const recipeId = Array.isArray(id) ? id[0] : id;

  if (!recipeId || !isValidRecipeId(recipeId)) {
    serverlessWarn('Invalid recipe ID', { requestId, recipeId });
    return res.status(400).json({
      error: 'Invalid recipe ID',
      message: 'Recipe ID must be a positive integer. Use ?id=12345',
      requestId,
    });
  }

  const targetUrl = `${FILMDEV_API_BASE}/recipe/${recipeId}`;

  try {
    logExternalApiCall(requestId, targetUrl, 'GET');

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent,
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

      // Handle specific error codes from filmdev.org
      if (response.status === 404) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: `Recipe ${recipeId} not found on filmdev.org`,
          requestId,
        });
      }

      return res.status(response.status).json({
        error: 'External API error',
        status: response.status,
        statusText: response.statusText,
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
        message: 'Expected JSON response from filmdev.org',
        contentType,
        requestId,
      });
    }

    // Check response size to prevent memory exhaustion
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      serverlessError('Response too large', {
        requestId,
        contentLength,
        maxAllowed: MAX_RESPONSE_SIZE,
      });
      return res.status(502).json({
        error: 'Response too large',
        message: 'Response from filmdev.org exceeds maximum allowed size',
        requestId,
      });
    }

    // Parse JSON response with error handling
    let data;
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
        message: 'Could not parse JSON response from filmdev.org',
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
    logApiResponse(requestId, 200, responseTime, {
      recipeId,
    });

    // Return the data with cache headers
    res.setHeader(
      'Cache-Control',
      'public, max-age=3600, stale-while-revalidate=7200'
    ); // 1 hour cache, 2 hour stale
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
        message: 'Could not connect to filmdev.org',
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
