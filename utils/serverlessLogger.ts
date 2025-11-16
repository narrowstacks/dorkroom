/**
 * Serverless Function Logger for Vercel
 *
 * This logger is designed for Vercel serverless functions and uses standard console methods
 * to ensure logs are properly captured by Vercel's log aggregation system.
 *
 * Features:
 * - Always enabled (no conditional compilation)
 * - Structured logging with metadata
 * - ISO timestamps
 * - Request correlation
 * - Performance timing
 */

export interface LogContext {
  requestId?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface TimingContext extends LogContext {
  startTime?: number;
  responseTime?: number;
  operation?: string;
}

/**
 * Writes a structured INFO-level log entry to stdout as a JSON string.
 *
 * The log entry includes an ISO 8601 timestamp, the provided message, and any
 * additional metadata from `context`, merged into the top-level object.
 *
 * @param message - Human-readable log message
 * @param context - Optional additional metadata to include in the log entry (e.g., `requestId`, `method`, `url`, etc.)
 */
export function serverlessLog(message: string, context: LogContext = {}) {
  const logData = {
    level: 'INFO',
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console.log(JSON.stringify(logData));
}

/**
 * Emit a structured warn-level log entry to the console.
 *
 * The log entry contains the provided message, a level of `WARN`, an ISO 8601 timestamp, and any additional metadata merged from `context`.
 *
 * @param message - The log message describing the warning
 * @param context - Optional metadata fields to include in the log (for example: `requestId`, `method`, `url`, `userAgent`, timing fields, or other key/value pairs)
 */
export function serverlessWarn(message: string, context: LogContext = {}) {
  const logData = {
    level: 'WARN',
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console.warn(JSON.stringify(logData));
}

/**
 * Emit a structured error-level log entry to the console for Vercel log aggregation.
 *
 * The log entry includes an ISO 8601 `timestamp`, `level: 'ERROR'`, the provided `message`,
 * and any additional metadata merged from `context`.
 *
 * @param message - The error message to record
 * @param context - Optional metadata to attach to the log (e.g., `requestId`, `method`, `url`, `userAgent`, or other key-value pairs)
 */
export function serverlessError(message: string, context: LogContext = {}) {
  const logData = {
    level: 'ERROR',
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console.error(JSON.stringify(logData));
}

/**
 * Record a timing entry for an operation and log its completion.
 *
 * @param message - Operation name used as the logged operation and in the completion message
 * @param startTime - Start timestamp in milliseconds (e.g., Date.now() when the operation began)
 * @param context - Optional additional metadata to include with the timing entry
 * @returns The elapsed time in milliseconds between now and `startTime`
 */
export function logTiming(
  message: string,
  startTime: number,
  context: LogContext = {}
) {
  const responseTime = Date.now() - startTime;
  const timingContext: TimingContext = {
    ...context,
    responseTime,
    operation: message,
  };

  serverlessLog(`${message} completed`, timingContext);
  return responseTime;
}

/**
 * Log the start of an API request with identifying metadata.
 *
 * @param requestId - Unique identifier for the request used to correlate logs
 * @param method - HTTP method of the request (e.g., "GET", "POST")
 * @param url - Request URL or path
 * @param userAgent - Optional client User-Agent string
 */
export function logApiRequest(
  requestId: string,
  method: string,
  url: string,
  userAgent?: string
) {
  serverlessLog('API request started', {
    requestId,
    method,
    url,
    userAgent,
  });
}

/**
 * Record that an API request completed and emit a structured completion log entry.
 *
 * @param requestId - Correlation identifier for the API request
 * @param statusCode - HTTP status code returned for the request
 * @param responseTime - Time taken to handle the request in milliseconds
 * @param additionalContext - Optional additional metadata to include in the log entry
 */
export function logApiResponse(
  requestId: string,
  statusCode: number,
  responseTime: number,
  additionalContext: LogContext = {}
) {
  serverlessLog('API request completed', {
    requestId,
    statusCode,
    responseTime,
    ...additionalContext,
  });
}

/**
 * Logs an API request failure including the error message, optional stack trace, status code, and additional context.
 *
 * @param requestId - Correlation identifier for the request
 * @param error - Error instance or string message describing the failure
 * @param statusCode - Optional HTTP status code associated with the error
 * @param additionalContext - Additional metadata to include in the log entry
 */
export function logApiError(
  requestId: string,
  error: Error | string,
  statusCode?: number,
  additionalContext: LogContext = {}
) {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  serverlessError('API request failed', {
    requestId,
    error: errorMessage,
    stack: errorStack,
    statusCode,
    ...additionalContext,
  });
}

/**
 * Log initiation of an outgoing external API request.
 *
 * @param requestId - Correlation identifier for the originating request
 * @param targetUrl - Destination URL of the external API call
 * @param method - HTTP method for the call (defaults to 'GET')
 */
export function logExternalApiCall(
  requestId: string,
  targetUrl: string,
  method: string = 'GET'
) {
  serverlessLog('External API call initiated', {
    requestId,
    targetUrl,
    method,
    operation: 'external_api_call',
  });
}

/**
 * Logs the result of an external API call with response metadata.
 *
 * Chooses an informational or error log depending on `success` and includes
 * the `operation` field set to `'external_api_call'`.
 *
 * @param requestId - Correlation identifier for the originating request
 * @param targetUrl - The URL of the external API that was called
 * @param status - HTTP status code returned by the external API
 * @param responseTime - Time in milliseconds taken for the external call
 * @param success - Whether the external call succeeded (true) or failed (false)
 */
export function logExternalApiResponse(
  requestId: string,
  targetUrl: string,
  status: number,
  responseTime: number,
  success: boolean
) {
  const logFunction = success ? serverlessLog : serverlessError;
  const level = success
    ? 'External API call successful'
    : 'External API call failed';

  logFunction(level, {
    requestId,
    targetUrl,
    status,
    responseTime,
    success,
    operation: 'external_api_call',
  });
}
