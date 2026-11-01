import { DorkroomApiError } from '@dorkroom/api';

/**
 * One line per failed query, in every build. Screens only show a generic
 * "couldn't load" message, so this is what tells a 401 (missing API key) from
 * a 429 (rate limit) or a network failure, in Metro or in the device log
 * (Console.app, process "Dorkroom"). Never logs headers, so the API key and
 * client id stay out of it.
 */
export function describeQueryFailure(
  queryKey: readonly unknown[],
  error: Error
): string {
  const key = JSON.stringify(queryKey);
  if (error instanceof DorkroomApiError) {
    const status = error.statusCode ?? 'no HTTP status';
    const cause =
      error.cause instanceof Error ? ` (cause: ${error.cause.message})` : '';
    return `[dorkroom] query ${key} failed: ${status} ${error.endpoint ?? ''} ${error.message}${cause}`;
  }
  return `[dorkroom] query ${key} failed: ${error.message}`;
}
