import { DorkroomApiError } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import { describeQueryFailure } from './query-failure';

describe('describeQueryFailure', () => {
  it('reports the HTTP status and endpoint of an API error', () => {
    const error = new DorkroomApiError(
      'Unauthorized',
      401,
      'https://api.dorkroom.art/combinations'
    );
    expect(describeQueryFailure(['combinations'], error)).toBe(
      '[dorkroom] query ["combinations"] failed: 401 https://api.dorkroom.art/combinations Unauthorized'
    );
  });

  it('names a network failure that has no HTTP status, with its cause', () => {
    const error = new DorkroomApiError('Request failed', undefined, undefined, {
      cause: new Error('Network request failed'),
    });
    expect(describeQueryFailure(['films'], error)).toContain('no HTTP status');
    expect(describeQueryFailure(['films'], error)).toContain(
      '(cause: Network request failed)'
    );
  });

  it('falls back to the message of any other error', () => {
    expect(describeQueryFailure(['x', 1], new Error('boom'))).toBe(
      '[dorkroom] query ["x",1] failed: boom'
    );
  });
});
