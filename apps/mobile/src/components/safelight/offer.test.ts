import { describe, expect, it } from 'vitest';
import { offersSafelightButton } from './offer';

describe('offersSafelightButton', () => {
  it('is always offered in Print', () => {
    expect(offersSafelightButton('print', false)).toBe(true);
    expect(offersSafelightButton('print', true)).toBe(true);
  });

  it('is offered in Shoot and Develop only while the mode is on', () => {
    for (const phase of ['shoot', 'develop'] as const) {
      expect(offersSafelightButton(phase, false)).toBe(false);
      expect(offersSafelightButton(phase, true)).toBe(true);
    }
  });

  it('is never offered outside a phase (Home has no header)', () => {
    expect(offersSafelightButton(null, false)).toBe(false);
    expect(offersSafelightButton(null, true)).toBe(false);
  });
});
