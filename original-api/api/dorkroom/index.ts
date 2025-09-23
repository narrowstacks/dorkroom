/**
 * Dorkroom API Client
 *
 * A robust, typed, and configurable TypeScript client for the
 * Dorkroom Static API. Features:
 * - Promise-based HTTP transport with retries & timeouts
 * - TypeScript interfaces for Film, Developer, Combination
 * - O(1) lookups via indexed Maps
 * - Fuzzy search via Fuse.js
 * - Comprehensive error handling
 * - Dependency injection for easy testing
 */

// Main client class
export { DorkroomClient } from "./client";

// Data types and interfaces
export type {
  Film,
  Developer,
  Combination,
  Dilution,
  DorkroomClientConfig,
  Logger,
  FuzzySearchOptions,
  ApiResponse,
  PaginatedApiResponse,
  CombinationFetchOptions,
} from "./types";

// Error classes
export {
  DorkroomAPIError,
  DataFetchError,
  DataParseError,
  DataNotLoadedError,
} from "./errors";

// Transport layer (for testing and custom implementations)
export type { HTTPTransport, RetryConfig } from "./transport";
export {
  FetchHTTPTransport,
  ConsoleLogger,
  DEFAULT_RETRY_CONFIG,
  joinURL,
} from "./transport";
