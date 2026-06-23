import { describe, expect, it } from 'vitest';
import {
  buildExposureShare,
  buildReciprocityShare,
  buildResizeShare,
} from './share-text';

describe('share-text', () => {
  it('formats an exposure result with signed stops', () => {
    const out = buildExposureShare({
      originalTime: '10',
      newTime: '20s',
      stops: 1,
      percentageIncrease: 100,
    });
    expect(out).toContain('Dorkroom Exposure');
    expect(out).toContain('Stops: +1');
    expect(out).toContain('New time: 20s');
    expect(out).toContain('100%');
  });

  it('formats a resize result', () => {
    const out = buildResizeShare({ newTime: '22.5', stopsDifference: '+1.17' });
    expect(out).toContain('Dorkroom Resize');
    expect(out).toContain('New time: 22.5s');
    expect(out).toContain('+1.17');
  });

  it('formats a reciprocity result', () => {
    const out = buildReciprocityShare({
      filmName: 'Kodak Tri-X 400',
      meteredTime: '30s',
      adjustedTime: '4m 12s',
      factor: 1.54,
    });
    expect(out).toContain('Dorkroom Reciprocity');
    expect(out).toContain('Kodak Tri-X 400');
    expect(out).toContain('Metered: 30s');
    expect(out).toContain('Adjusted: 4m 12s');
    expect(out).toContain('1.54');
  });
});
