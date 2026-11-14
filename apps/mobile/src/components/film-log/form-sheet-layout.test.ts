import { describe, expect, it } from 'vitest';
import {
  formBodyMaxHeight,
  MIN_BODY_HEIGHT,
  stacksLensKind,
} from './form-sheet-layout';

const base = {
  windowHeight: 874,
  keyboardHeight: 0,
  topInset: 62,
  bottomInset: 34,
  footerHeight: 58,
  fontScale: 1,
};

describe('formBodyMaxHeight', () => {
  it('caps the body at 60% of the window with no keyboard', () => {
    expect(formBodyMaxHeight(base)).toBeCloseTo(874 * 0.6);
  });

  it('shrinks with the keyboard so the sheet top keeps its 24pt gap', () => {
    const keyboard = 336;
    const height = formBodyMaxHeight({ ...base, keyboardHeight: keyboard });
    // The sheet's header, from first principles: 16pt top padding, a row as
    // tall as the 44pt Cancel button (the 18pt title is shorter), 16pt gap.
    const header = 16 + 44 + 16;
    // The panel stacked bottom up: keyboard, bottom padding (inset + 16),
    // the pinned footer, the body, the header.
    const sheetTop = 874 - keyboard - (34 + 16) - 58 - height - header;
    expect(sheetTop - 62).toBeCloseTo(24);
    expect(height).toBeGreaterThan(MIN_BODY_HEIGHT);
  });

  it('keeps the header height at the largest text, the title being capped', () => {
    const plain = formBodyMaxHeight({ ...base, keyboardHeight: 336 });
    const large = formBodyMaxHeight({
      ...base,
      keyboardHeight: 336,
      fontScale: 3.1,
    });
    // An 18pt title at the 1.3x cap is about 28pt, still under the 44pt row.
    expect(large).toBeCloseTo(plain);
  });

  it('stacks the lens choice from 1.3x text', () => {
    expect(stacksLensKind(1)).toBe(false);
    expect(stacksLensKind(1.3)).toBe(true);
  });

  it('never goes below the minimum', () => {
    expect(
      formBodyMaxHeight({ ...base, keyboardHeight: 700, footerHeight: 200 })
    ).toBe(MIN_BODY_HEIGHT);
  });
});
