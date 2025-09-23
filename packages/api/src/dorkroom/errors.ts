/**
 * Custom error classes for Dorkroom API operations.
 *
 * These error classes provide specific error types for different
 * failure scenarios when interacting with the Dorkroom API.
 */

/**
 * Base exception for Dorkroom API errors.
 */
export class DorkroomAPIError extends Error {
  constructor(
    message: string,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = "DorkroomAPIError";

    // Maintain proper stack trace for where our error was thrown (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DorkroomAPIError);
    }
  }
}

/**
 * Raised when HTTP fetch fails.
 */
export class DataFetchError extends DorkroomAPIError {
  constructor(
    message: string,
    cause?: Error,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false,
  ) {
    super(message, cause);
    this.name = "DataFetchError";
  }
}

/**
 * Raised when JSON parsing fails.
 */
export class DataParseError extends DorkroomAPIError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "DataParseError";
  }
}

/**
 * Raised when data operations are attempted before loading.
 */
export class DataNotLoadedError extends DorkroomAPIError {
  constructor(message: string = "Call loadAll() before using the client.") {
    super(message);
    this.name = "DataNotLoadedError";
  }
}

/**
 * Raised when a network error occurs.
 */
export class NetworkError extends DorkroomAPIError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "NetworkError";
  }
}

/**
 * Raised when request times out.
 */
export class TimeoutError extends DorkroomAPIError {
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Raised when rate limit is exceeded.
 */
export class RateLimitError extends DorkroomAPIError {
  constructor(
    message: string,
    public readonly retryAfterMs?: number,
    public readonly resetTime?: Date,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Raised when circuit breaker is open.
 */
export class CircuitBreakerError extends DorkroomAPIError {
  constructor(
    message: string = "Circuit breaker is open - too many recent failures",
    public readonly nextAttemptTime?: Date,
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

/**
 * Raised when server returns 5xx errors.
 */
export class ServerError extends DorkroomAPIError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly isRetryable: boolean = true,
  ) {
    super(message);
    this.name = "ServerError";
  }
}

/**
 * Raised when client sends invalid request (4xx errors, excluding 429).
 */
export class ClientError extends DorkroomAPIError {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ClientError";
  }
}
