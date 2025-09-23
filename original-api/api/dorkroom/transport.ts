/**
 * HTTP transport layer for Dorkroom API client.
 *
 * Provides a configurable HTTP transport with retry logic and timeout handling,
 * similar to the Python requests.Session with retries.
 *
 * Updated to support platform-aware API endpoints with secure API key handling.
 */

import {
  DataFetchError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  ServerError,
  ClientError,
  CircuitBreakerError,
} from "./errors";
import type { Logger } from "./types";
import { getApiUrl, getEnvironmentConfig } from "../../utils/platformDetection";

/**
 * Protocol for HTTP transport layer dependency injection.
 * This allows for easy testing by injecting mock transports.
 */
export interface HTTPTransport {
  /**
   * Perform HTTP GET request.
   */
  get(url: string, timeout: number): Promise<Response>;
}

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  /** Multiplier for exponential backoff */
  backoffFactor: number;
  /** HTTP status codes that should trigger a retry */
  retryStatusCodes: number[];
}

/**
 * Configuration for circuit breaker behavior.
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in milliseconds to wait before attempting recovery */
  recoveryTimeoutMs: number;
  /** Number of successful requests needed to close circuit */
  successThreshold: number;
}

/**
 * Circuit breaker states.
 */
enum CircuitBreakerState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

/**
 * Circuit breaker implementation for handling API failures.
 */
class CircuitBreaker {
  private state = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private nextAttemptTime = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError(
          "Circuit breaker is open - too many recent failures",
          new Date(this.nextAttemptTime),
        );
      } else {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successes = 0;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failures++;

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeoutMs;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttemptTime = 0;
  }
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 300,
  backoffFactor: 2,
  retryStatusCodes: [502, 503, 504, 429], // Server errors and rate limiting
};

/**
 * Default circuit breaker configuration.
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30000, // 30 seconds
  successThreshold: 2,
};

/**
 * Simple console logger implementation.
 */
export class ConsoleLogger implements Logger {
  debug(message: string): void {
    console.debug(`[DEBUG] ${message}`);
  }

  info(message: string): void {
    console.info(`[INFO] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }
}

/**
 * HTTP transport implementation with retry logic and timeout handling.
 */
export class FetchHTTPTransport implements HTTPTransport {
  private readonly retryConfig: RetryConfig;
  private readonly logger: Logger;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    logger: Logger = new ConsoleLogger(),
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {},
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.logger = logger;
    this.circuitBreaker = new CircuitBreaker({
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...circuitBreakerConfig,
    });
  }

  async get(url: string, timeout: number): Promise<Response> {
    return this.circuitBreaker.execute(async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
        try {
          this.logger.debug(`GET ${url} (attempt ${attempt + 1})`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          try {
            const response = await fetch(url, {
              method: "GET",
              signal: controller.signal,
              headers: {
                Accept: "application/json",
                "User-Agent": "Dorkroom-Client-TS/1.0",
              },
            });

            clearTimeout(timeoutId);

            // Classify and handle different response types
            if (response.status === 429) {
              const retryAfter = response.headers.get("retry-after");
              const retryAfterMs = retryAfter
                ? parseInt(retryAfter) * 1000
                : 60000;
              throw new RateLimitError(
                `Rate limit exceeded: ${response.statusText}`,
                retryAfterMs,
                new Date(Date.now() + retryAfterMs),
              );
            }

            if (response.status >= 500) {
              throw new ServerError(
                `Server error: ${response.status} ${response.statusText}`,
                response.status,
                true,
              );
            }

            if (response.status >= 400) {
              throw new ClientError(
                `Client error: ${response.status} ${response.statusText}`,
                response.status,
              );
            }

            if (!response.ok) {
              throw new DataFetchError(
                `HTTP ${response.status}: ${response.statusText}`,
                undefined,
                response.status,
                this.retryConfig.retryStatusCodes.includes(response.status),
              );
            }

            return response;
          } catch (error) {
            clearTimeout(timeoutId);

            // Handle different error types
            if (error instanceof DOMException && error.name === "AbortError") {
              throw new TimeoutError(
                `Request timed out after ${timeout}ms`,
                timeout,
              );
            }

            if (error instanceof TypeError) {
              throw new NetworkError(`Network error: ${error.message}`, error);
            }

            throw error;
          }
        } catch (error) {
          lastError = error as Error;

          // Don't retry on the last attempt
          if (attempt === this.retryConfig.maxRetries) {
            break;
          }

          // Don't retry certain types of errors
          if (!this.shouldRetryError(error as Error)) {
            break;
          }

          // Calculate delay with exponential backoff
          const delay =
            this.retryConfig.baseDelay *
            Math.pow(this.retryConfig.backoffFactor, attempt);

          this.logger.warn(
            `Request failed (attempt ${attempt + 1}), retrying in ${delay}ms: ${error}`,
          );

          await this.sleep(delay);
        }
      }

      // All retries exhausted
      throw new DataFetchError(
        `Failed to fetch ${url} after ${this.retryConfig.maxRetries + 1} attempts`,
        lastError || undefined,
        undefined,
        false,
      );
    });
  }

  /**
   * Determine if an error should trigger a retry.
   */
  private shouldRetryError(error: Error): boolean {
    // Don't retry client errors (except rate limiting which is handled separately)
    if (error instanceof ClientError) {
      return false;
    }

    // Don't retry circuit breaker errors
    if (error instanceof CircuitBreakerError) {
      return false;
    }

    // Retry server errors, network errors, timeouts, and retryable data fetch errors
    return (
      error instanceof ServerError ||
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      error instanceof RateLimitError ||
      (error instanceof DataFetchError && error.isRetryable)
    );
  }

  /**
   * Sleep for the specified number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state for monitoring.
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (useful for testing).
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

/**
 * Create a URL by joining base URL and path.
 * Similar to Python's urljoin but simplified for our use case.
 * Updated to support platform-aware API endpoints.
 */
export function joinURL(baseUrl: string, ...segments: string[]): string {
  // Check if this is a request for any of the Supabase API endpoints
  const allSegments = [baseUrl, ...segments].join("/");
  const apiEndpoints = ["developers", "films", "combinations"];

  for (const endpoint of apiEndpoints) {
    if (
      allSegments.includes(endpoint) ||
      allSegments.includes(`/api/${endpoint}`)
    ) {
      // Use platform-aware endpoint for Supabase APIs
      return getApiUrl(endpoint);
    }
  }

  // Handle empty baseUrl case
  if (!baseUrl && segments.length === 1 && !segments[0]) {
    return "/";
  }

  // Remove trailing slash from base
  let result = baseUrl.replace(/\/$/, "");

  // Join all segments
  let hasSegments = false;
  for (const segment of segments) {
    if (segment !== undefined && segment !== null) {
      // Remove leading and trailing slashes from segment
      const cleanSegment = segment.replace(/^\/+|\/+$/g, "");
      if (cleanSegment) {
        result += `/${cleanSegment}`;
        hasSegments = true;
      } else if (segment === "" && !hasSegments) {
        // Special case: if we have an empty string as the first segment, add trailing slash
        result += "/";
        hasSegments = true;
      }
    }
  }

  return result;
}
