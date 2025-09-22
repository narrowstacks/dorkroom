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
  [key: string]: any;
}

export interface TimingContext extends LogContext {
  startTime?: number;
  responseTime?: number;
  operation?: string;
}

// Base logging functions with structured output
export function serverlessLog(message: string, context: LogContext = {}) {
  const logData = {
    level: "INFO",
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console.log(JSON.stringify(logData));
}

export function serverlessWarn(message: string, context: LogContext = {}) {
  const logData = {
    level: "WARN",
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console.warn(JSON.stringify(logData));
}

export function serverlessError(message: string, context: LogContext = {}) {
  const logData = {
    level: "ERROR",
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console.error(JSON.stringify(logData));
}

// Performance timing helper
export function logTiming(
  message: string,
  startTime: number,
  context: LogContext = {},
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

// API-specific logging helpers
export function logApiRequest(
  requestId: string,
  method: string,
  url: string,
  userAgent?: string,
) {
  serverlessLog("API request started", {
    requestId,
    method,
    url,
    userAgent,
  });
}

export function logApiResponse(
  requestId: string,
  statusCode: number,
  responseTime: number,
  additionalContext: LogContext = {},
) {
  serverlessLog("API request completed", {
    requestId,
    statusCode,
    responseTime,
    ...additionalContext,
  });
}

export function logApiError(
  requestId: string,
  error: Error | string,
  statusCode?: number,
  additionalContext: LogContext = {},
) {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  serverlessError("API request failed", {
    requestId,
    error: errorMessage,
    stack: errorStack,
    statusCode,
    ...additionalContext,
  });
}

// External API call logging
export function logExternalApiCall(
  requestId: string,
  targetUrl: string,
  method: string = "GET",
) {
  serverlessLog("External API call initiated", {
    requestId,
    targetUrl,
    method,
    operation: "external_api_call",
  });
}

export function logExternalApiResponse(
  requestId: string,
  targetUrl: string,
  status: number,
  responseTime: number,
  success: boolean,
) {
  const logFunction = success ? serverlessLog : serverlessError;
  const level = success
    ? "External API call successful"
    : "External API call failed";

  logFunction(level, {
    requestId,
    targetUrl,
    status,
    responseTime,
    success,
    operation: "external_api_call",
  });
}
