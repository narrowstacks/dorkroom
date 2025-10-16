import { DorkroomApiError } from './types';

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
};

export class HttpTransport {
  private baseUrl: string;
  private defaultOptions: Required<FetchOptions>;

  /**
   * Create a new HTTP transport with a normalized base URL and default options.
   *
   * @param baseUrl - Base URL for API requests
   * @param options - Optional fetch configuration overrides
   */
  constructor(baseUrl: string, options?: FetchOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultOptions = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Perform a GET request with retry, timeout, and error handling support.
   *
   * @param endpoint - API endpoint path to request
   * @param options - Optional per-request fetch configuration overrides
   * @returns Parsed JSON response typed to the provided generic parameter
   * @throws DorkroomApiError when the response is not successful after retries.
   *
   * Retry behavior:
   * - 4xx responses are not retried.
   * - Other failures (5xx responses, network errors, abort/timeout) are retried
   *   with linear backoff based on `retryDelay`.
   */
  async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    const url = `${this.baseUrl}${endpoint}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new DorkroomApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            endpoint
          );
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof DorkroomApiError) {
          // Don't retry on client errors (4xx)
          if (
            error.statusCode &&
            error.statusCode >= 400 &&
            error.statusCode < 500
          ) {
            // Wrap to ensure consistent thrown type
            throw new DorkroomApiError(
              error.message,
              error.statusCode,
              endpoint
            );
          }
        }

        // If this was the last attempt, wrap any non-success error
        if (attempt === opts.retries) {
          if (lastError instanceof DorkroomApiError) {
            throw lastError;
          }
          // Network/Abort or unknown: wrap into DorkroomApiError to keep the thrown type consistent
          throw new DorkroomApiError(
            lastError.message || 'Request failed',
            undefined,
            endpoint
          );
        }

        // Wait before retrying
        await this.delay(opts.retryDelay * (attempt + 1));
      }
    }

    // Defensive fallback (loop should have returned or thrown earlier)
    if (lastError instanceof DorkroomApiError) {
      throw lastError;
    }
    throw new DorkroomApiError(
      lastError?.message || 'Unknown error occurred',
      undefined,
      endpoint
    );
  }

  /**
   * Delay execution for a specified number of milliseconds.
   *
   * @param ms - Milliseconds to wait before resolving
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
