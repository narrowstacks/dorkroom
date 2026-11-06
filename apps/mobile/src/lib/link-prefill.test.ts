import { describe, expect, it } from 'vitest';
import { linkSearchFromParams, prefillKey } from './link-prefill';

describe('linkSearchFromParams', () => {
  it('flattens a repeated param to its first value and drops unset ones', () => {
    expect(
      linkSearchFromParams({
        focal: '80',
        to: ['full-frame', 'x'],
        from: undefined,
      })
    ).toEqual({ focal: '80', to: 'full-frame' });
  });
});

describe('prefillKey', () => {
  it('is none when the link set nothing', () => {
    expect(prefillKey('{}', {})).toBe('none');
    expect(prefillKey('{}', { at: '1' })).toBe('none');
  });

  it('changes with the values, so a new link re-mounts the screen', () => {
    expect(prefillKey('{"focalLength":80}', {})).not.toBe(
      prefillKey('{"focalLength":50}', {})
    );
  });

  it('changes with the opening, so the same answer opened twice applies twice', () => {
    expect(prefillKey('{"focalLength":80}', { at: '1' })).not.toBe(
      prefillKey('{"focalLength":80}', { at: '2' })
    );
  });
});
