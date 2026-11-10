import { formatExposureTime } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import { formatSignedTime } from './signed-time';

describe('formatSignedTime', () => {
  it('signs a gain with a plus', () => {
    expect(formatSignedTime(3.12, formatExposureTime)).toBe('+3.12s');
    expect(formatSignedTime(0, formatExposureTime)).toBe('+0s');
  });

  it('signs a loss with a real minus sign', () => {
    expect(formatSignedTime(-1.5, formatExposureTime)).toBe('−1.5s');
  });
});
