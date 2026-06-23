import { describe, expect, it } from 'vitest';
import {
  buildExposureShare,
  buildReciprocityShare,
  buildResizeShare,
} from './share-text';

describe('share-text', () => {
  it('formats a rich exposure result', () => {
    const out = buildExposureShare({
      originalTime: '10',
      newTime: '20s',
      stops: 1,
      multiplier: 2,
      addedTime: '10s',
      addedLabel: 'Added',
      percentageIncrease: 100,
    });
    expect(out).toContain('Exposure');
    expect(out).toContain('Original time: 10s');
    expect(out).toContain('Adjustment: +1.00 stops (×2.000)');
    expect(out).toContain('New time: 20s');
    expect(out).toContain('Added: 10s (100%)');
    expect(out).not.toContain('dorkroom.art');
  });

  it('labels a reduced exposure as removed', () => {
    const out = buildExposureShare({
      originalTime: '10',
      newTime: '5s',
      stops: -1,
      multiplier: 0.5,
      addedTime: '5s',
      addedLabel: 'Removed',
      percentageIncrease: -50,
    });
    expect(out).toContain('Adjustment: -1.00 stops (×0.500)');
    expect(out).toContain('Removed: 5s (-50%)');
  });

  it('formats a rich resize result', () => {
    const out = buildResizeShare({
      title: 'Print Resize',
      original: '4×6 in',
      target: '6×9 in',
      originalTime: '10',
      newTime: '22.5',
      stopsDifference: '+1.17',
    });
    expect(out).toContain('Print Resize');
    expect(out).toContain('Original: 4×6 in');
    expect(out).toContain('Target: 6×9 in');
    expect(out).toContain('Original time: 10s');
    expect(out).toContain('New time: 22.5s');
    expect(out).toContain('Stops difference: +1.17');
    expect(out).not.toContain('dorkroom.art');
  });

  it('formats a rich reciprocity result', () => {
    const out = buildReciprocityShare({
      filmName: 'Kodak Tri-X 400',
      meteredTime: '30s',
      adjustedTime: '4m 12s',
      addedTime: '3m 42s',
      percentageIncrease: 740,
      factor: 1.54,
    });
    expect(out).toContain('Reciprocity');
    expect(out).toContain('Film: Kodak Tri-X 400');
    expect(out).toContain('Metered: 30s');
    expect(out).toContain('Adjusted: 4m 12s');
    expect(out).toContain('Added: 3m 42s (740%)');
    expect(out).toContain('Factor: 1.54');
    expect(out).not.toContain('dorkroom.art');
  });
});
