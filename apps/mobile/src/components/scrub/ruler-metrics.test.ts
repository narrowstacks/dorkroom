import { describe, expect, it } from 'vitest';
import {
  INDICATOR_OVERHANG,
  INDICATOR_TOP,
  RULER_METRICS,
} from './ruler-metrics';

describe('ruler metrics', () => {
  it('keeps a 3 to 4px gap between the labels and the indicator', () => {
    const labelBottom = RULER_METRICS.labelTop + RULER_METRICS.labelHeight;
    expect(INDICATOR_TOP - labelBottom).toBeGreaterThanOrEqual(3);
    expect(INDICATOR_TOP - labelBottom).toBeLessThanOrEqual(4);
  });

  it('makes the indicator a few px taller than a major tick', () => {
    expect(INDICATOR_OVERHANG).toBeGreaterThanOrEqual(2);
    expect(INDICATOR_OVERHANG).toBeLessThanOrEqual(6);
  });

  it('fits the labels inside the strip', () => {
    expect(RULER_METRICS.labelTop + RULER_METRICS.labelHeight).toBeLessThan(
      RULER_METRICS.height
    );
  });
});
