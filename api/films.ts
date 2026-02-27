import { validateAndSanitizeQuery } from '../utils/queryValidation';
import { createTimeoutSignal } from '../utils/timeoutSignal';
import { withHandler } from '../utils/withHandler';
import {
  logApiResponse,
  logExternalApiCall,
  logExternalApiResponse,
  serverlessError,
  serverlessWarn,
} from '../utils/serverlessLogger';

const TIMEOUT_MS = 30_000;
const ALLOWED_PARAMS = ['query', 'fuzzy', 'limit', 'colorType', 'brand'];

export default withHandler({
  name: 'films',
  requiredEnv: ['SUPABASE_MASTER_API_KEY', 'SUPABASE_ENDPOINT'],
  handler: async (req, res, ctx) => {
    const supabaseMasterApiKey = process.env.SUPABASE_MASTER_API_KEY;
    const supabaseBaseUrl = process.env.SUPABASE_ENDPOINT;

    if (!supabaseMasterApiKey || !supabaseBaseUrl) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseEndpoint = `${supabaseBaseUrl}/functions/v1/films`;

    const queryParams = validateAndSanitizeQuery(req.query, ALLOWED_PARAMS);
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

      let errorDetails: unknown = null;
      try {
        const errorText = await response.text();
        errorDetails = errorText ? JSON.parse(errorText) : null;
      } catch {
        serverlessWarn('Could not parse error response', {
          requestId: ctx.requestId,
        });
      }

      res.status(response.status).json({
        error: 'External API error',
        status: response.status,
        statusText: response.statusText,
        details: errorDetails,
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
        contentType,
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

    const responseData = data as Record<string, unknown> | null;
    logApiResponse(ctx.requestId, 200, responseTime, {
      dataLength: Array.isArray(responseData?.data)
        ? responseData.data.length
        : 'N/A',
    });

    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=600'
    );
    res.status(200).json(data);
  },
});
