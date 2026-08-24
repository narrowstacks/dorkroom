import { describe, expect, it } from 'vitest';
import { computeMatPreviewGeometry } from './geometry';

const portrait = {
  outerWidth: 16,
  outerHeight: 20,
  borderTop: 3,
  borderBottom: 3.5,
  borderLeft: 2.75,
  borderRight: 2.75,
  artworkWidth: 11,
  artworkHeight: 14,
  revealMode: true,
  valid: true,
  availableWidth: 320,
  maxHeight: 320,
};

describe('computeMatPreviewGeometry', () => {
  it('fits a portrait board to the height cap and preserves one scale', () => {
    const result = computeMatPreviewGeometry(portrait);
    expect(result).not.toBeNull();
    expect(result?.board).toEqual({
      left: 32,
      top: 0,
      width: 256,
      height: 320,
    });
    expect(result?.scale).toBe(16);
    expect(result?.window).toEqual({
      left: 76,
      top: 48,
      width: 168,
      height: 216,
    });
    expect(result?.artwork).toEqual({
      left: 72,
      top: 48,
      width: 176,
      height: 224,
    });
  });

  it('fits a landscape board to the available width', () => {
    const result = computeMatPreviewGeometry({
      ...portrait,
      outerWidth: 20,
      outerHeight: 16,
      availableWidth: 300,
      borderTop: 2,
      borderBottom: 2,
      borderLeft: 3,
      borderRight: 3,
    });
    expect(result?.board).toEqual({ left: 0, top: 0, width: 300, height: 240 });
    expect(result?.window).toEqual({
      left: 45,
      top: 30,
      width: 210,
      height: 180,
    });
  });

  it('omits artwork when reveal mode is off', () => {
    expect(
      computeMatPreviewGeometry({ ...portrait, revealMode: false })?.artwork
    ).toBeNull();
  });

  it.each([
    { ...portrait, valid: false },
    { ...portrait, outerWidth: 0 },
    { ...portrait, availableWidth: Number.NaN },
    { ...portrait, borderLeft: Number.POSITIVE_INFINITY },
  ])('returns null for invalid geometry %#', (input) => {
    expect(computeMatPreviewGeometry(input)).toBeNull();
  });
});
