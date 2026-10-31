import { describe, expect, it } from 'vitest';
import { formatFieldErrors } from '../../forms/utils/format-field-errors';

describe('formatFieldErrors', () => {
  it('passes string errors through', () => {
    expect(formatFieldErrors(['Required'])).toBe('Required');
  });

  it('reads the message of a Standard Schema issue', () => {
    expect(formatFieldErrors([{ message: 'Too short', path: ['a'] }])).toBe(
      'Too short'
    );
  });

  it('flattens arrays of issues and joins with commas', () => {
    expect(formatFieldErrors([[{ message: 'A' }, { message: 'B' }], 'C'])).toBe(
      'A, B, C'
    );
  });

  it('reads Error messages and skips empty or unreadable entries', () => {
    expect(
      formatFieldErrors([new Error('Boom'), null, undefined, '', {}, {}])
    ).toBe('Boom');
  });

  it('never yields [object Object]', () => {
    expect(formatFieldErrors([{ foo: 1 }])).toBe('');
  });
});
