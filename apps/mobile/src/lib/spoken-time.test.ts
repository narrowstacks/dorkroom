import { describe, expect, it } from 'vitest';
import { spokenDuration, spokenSeconds } from './spoken-time';

describe('spokenDuration', () => {
  it('spells out seconds', () => {
    expect(spokenDuration('15.12s')).toBe('15.12 seconds');
    expect(spokenDuration('1s')).toBe('1 second');
  });

  it('spells out minutes and seconds', () => {
    expect(spokenDuration('2m 5s')).toBe('2 minutes 5 seconds');
    expect(spokenDuration('1m')).toBe('1 minute');
  });

  it('reads compact and hour forms', () => {
    expect(spokenDuration('1m30s')).toBe('1 minute 30 seconds');
    expect(spokenDuration('2h')).toBe('2 hours');
    expect(spokenDuration('12,5s')).toBe('12.5 seconds');
  });
});

describe('spokenSeconds', () => {
  it('treats a bare number as seconds', () => {
    expect(spokenSeconds('12.5')).toBe('12.5 seconds');
    expect(spokenSeconds('30s')).toBe('30 seconds');
    expect(spokenSeconds('1m30s')).toBe('1 minute 30 seconds');
  });
});
