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

  constructor(baseUrl: string, options?: FetchOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultOptions = { ...DEFAULT_OPTIONS, ...options };
  }

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
            throw error;
          }
        }

        // If this was the last attempt, throw the error
        if (attempt === opts.retries) {
          throw lastError;
        }

        // Wait before retrying
        await this.delay(opts.retryDelay * (attempt + 1));
      }
    }

    throw lastError || new DorkroomApiError('Unknown error occurred');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
