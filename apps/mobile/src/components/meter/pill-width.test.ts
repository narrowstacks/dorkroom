import { describe, expect, it } from 'vitest';
import { meterPillMaxWidth } from './pill-width';

describe('meterPillMaxWidth', () => {
  it('draws no pill before the right stack has been measured', () => {
    expect(
      meterPillMaxWidth({ windowWidth: 393, rightStackWidth: undefined })
    ).toBe(null);
  });

  it('stays within half the screen when the right stack is measured and empty', () => {
    expect(meterPillMaxWidth({ windowWidth: 393, rightStackWidth: 0 })).toBe(
      168
    );
    expect(meterPillMaxWidth({ windowWidth: 375, rightStackWidth: 0 })).toBe(
      159
    );
  });

  it('keeps an 8pt gap from a measured right stack', () => {
    const windowWidth = 393;
    const rightStackWidth = 240;
    const max = meterPillMaxWidth({ windowWidth, rightStackWidth });
    // Left pill ends at 16 + max; the stack starts at windowWidth - 16 - width.
    expect(16 + (max ?? 0) + 8).toBeLessThanOrEqual(
      windowWidth - 16 - rightStackWidth
    );
    expect(max).toBe(113);
  });

  it('uses the room a narrow right stack leaves', () => {
    expect(meterPillMaxWidth({ windowWidth: 393, rightStackWidth: 110 })).toBe(
      243
    );
  });

  it('is null when under 88pt is left, and 88 is enough', () => {
    expect(meterPillMaxWidth({ windowWidth: 375, rightStackWidth: 240 })).toBe(
      95
    );
    expect(meterPillMaxWidth({ windowWidth: 375, rightStackWidth: 250 })).toBe(
      null
    );
    expect(meterPillMaxWidth({ windowWidth: 393, rightStackWidth: 266 })).toBe(
      null
    );
    expect(meterPillMaxWidth({ windowWidth: 393, rightStackWidth: 265 })).toBe(
      88
    );
  });

  it('never returns a negative width', () => {
    expect(meterPillMaxWidth({ windowWidth: 300, rightStackWidth: 400 })).toBe(
      null
    );
  });
});
