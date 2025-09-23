/**
 * Dorkroom API Client
 *
 * A lightweight, typed wrapper around the public beta.dorkroom.art endpoints.
 */

export { DorkroomClient } from './client';

export type {
  Film,
  Developer,
  Combination,
  Dilution,
  DorkroomClientConfig,
  Logger,
  ApiResponse,
  PaginatedApiResponse,
  CombinationFetchOptions,
} from './types';

export {
  DorkroomAPIError,
  DataFetchError,
  DataParseError,
  DataNotLoadedError,
  TimeoutError,
} from './errors';
