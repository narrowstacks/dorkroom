import {
  logApiResponse,
  logExternalApiCall,
  logExternalApiResponse,
  serverlessError,
  serverlessWarn,
} from '../utils/serverlessLogger';
import { createTimeoutSignal } from '../utils/timeoutSignal';
import { withHandler } from '../utils/withHandler';

const FILMDEV_API_BASE = 'https://filmdev.org/api';
const TIMEOUT_MS = 30_000;
const MAX_RESPONSE_SIZE = 1024 * 1024;
const MAX_RECIPE_ID = 10_000_000;

function isValidRecipeId(id: string): boolean {
  if (!/^\d+$/.test(id)) {
    return false;
  }

  const numericId = Number.parseInt(id, 10);
  return numericId > 0 && numericId < MAX_RECIPE_ID;
}

export default withHandler({
  name: 'filmdev',
  handler: async (req, res, ctx) => {
    const idParam = req.query.id;
    const recipeId = Array.isArray(idParam) ? idParam[0] : idParam;

    if (!recipeId || !isValidRecipeId(recipeId)) {
      serverlessWarn('Invalid recipe ID', {
        requestId: ctx.requestId,
        recipeId,
      });

      res.status(400).json({
        error: 'Invalid recipe ID',
        message: 'Recipe ID must be a positive integer. Use ?id=12345',
        requestId: ctx.requestId,
      });
      return;
    }

    const targetUrl = `${FILMDEV_API_BASE}/recipe/${recipeId}`;
    logExternalApiCall(ctx.requestId, targetUrl, 'GET');

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Dorkroom-API/1.0',
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

      if (response.status === 404) {
        res.status(404).json({
          error: 'Recipe not found',
          message: `Recipe ${recipeId} not found on filmdev.org`,
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
        message: 'Expected JSON response from filmdev.org',
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
        message: 'Response from filmdev.org exceeds maximum allowed size',
        requestId: ctx.requestId,
      });
      return;
    }

    let data: unknown;
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
        message: 'Could not parse JSON response from filmdev.org',
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
    logApiResponse(ctx.requestId, 200, responseTime, { recipeId });

    res.setHeader(
      'Cache-Control',
      ctx.isPublicApi
        ? 'private, no-store'
        : 'public, max-age=3600, stale-while-revalidate=7200'
    );
    res.status(200).json(data);
  },
});
