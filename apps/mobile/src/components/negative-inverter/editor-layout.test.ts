import { DEFAULT_INVERSION_ADJUSTMENTS } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  activeAdjustment,
  adjustmentsFor,
  allDefault,
  baseChip,
  clippingChip,
  editorLayout,
  formatAdjustment,
  isCompactEditor,
  isDefaultAdjustment,
  toolbarWidth,
  toolHint,
} from './editor-layout';
import type { BaseSample } from './inverter-state';
import type { FilmExposure } from './live-exposure';

const base = (auto: boolean, confidence: number): BaseSample => ({
  point: { x: 1, y: 1 },
  rgb: [0.5, 0.3, 0.2],
  auto,
  confidence,
});

describe('adjustmentsFor', () => {
  it('offers all five for colour film', () => {
    expect(adjustmentsFor('c41').map((s) => s.key)).toEqual([
      'exposure',
      'contrast',
      'warmth',
      'tint',
      'saturation',
    ]);
  });

  it('offers only exposure and contrast for black and white', () => {
    expect(adjustmentsFor('bw').map((s) => s.key)).toEqual([
      'exposure',
      'contrast',
    ]);
  });
});

describe('activeAdjustment', () => {
  it('keeps the chosen adjustment while the film type offers it', () => {
    expect(activeAdjustment('tint', 'c41').key).toBe('tint');
    expect(activeAdjustment('contrast', 'bw').key).toBe('contrast');
  });

  it('falls back to exposure when B&W drops the chosen one', () => {
    expect(activeAdjustment('warmth', 'bw').key).toBe('exposure');
  });
});

describe('formatAdjustment', () => {
  it('signs exposure in stops', () => {
    expect(formatAdjustment('exposure', 0.5)).toBe('+0.5 EV');
    expect(formatAdjustment('exposure', -1.2)).toBe('-1.2 EV');
    expect(formatAdjustment('exposure', 0)).toBe('0.0 EV');
  });

  it('shows contrast and saturation as a factor', () => {
    expect(formatAdjustment('contrast', 1.25)).toBe('1.25x');
    expect(formatAdjustment('saturation', 1)).toBe('1.00x');
  });

  it('signs warmth and tint, and never shows a negative zero', () => {
    expect(formatAdjustment('warmth', 0.3)).toBe('+0.30');
    expect(formatAdjustment('tint', -0.05)).toBe('-0.05');
    expect(formatAdjustment('tint', -0)).toBe('0.00');
  });
});

describe('isDefaultAdjustment and allDefault', () => {
  it('treats a value within half a step of the default as default', () => {
    expect(isDefaultAdjustment('exposure', 0.04)).toBe(true);
    expect(isDefaultAdjustment('exposure', 0.1)).toBe(false);
    expect(isDefaultAdjustment('contrast', 1)).toBe(true);
  });

  it('checks only the adjustments the film type offers', () => {
    const warm = { ...DEFAULT_INVERSION_ADJUSTMENTS, warmth: 0.5 };
    expect(allDefault(DEFAULT_INVERSION_ADJUSTMENTS, 'c41')).toBe(true);
    expect(allDefault(warm, 'c41')).toBe(false);
    expect(allDefault(warm, 'bw')).toBe(true);
  });
});

describe('baseChip', () => {
  it('asks for a base when there is none', () => {
    expect(baseChip(null)).toMatchObject({ tone: 'alert', picksBase: true });
  });

  it('is still looking in live mode', () => {
    expect(baseChip(null, true)).toMatchObject({
      text: 'Finding base',
      tone: 'neutral',
    });
  });

  it('flags a doubtful automatic base', () => {
    expect(baseChip(base(true, 0))).toMatchObject({
      text: 'Check film base',
      tone: 'alert',
    });
  });

  it('labels a confident automatic base', () => {
    expect(baseChip(base(true, 1))).toMatchObject({
      text: 'Auto base',
      tone: 'info',
    });
  });

  it('says nothing for a picked base', () => {
    expect(baseChip(base(false, 1))).toBeNull();
  });
});

describe('clippingChip', () => {
  const exposure = (blueClipped: number): FilmExposure => ({
    pixels: 1000,
    denseBlue: 40,
    blueClipped,
    brightFilm: 200,
    clippedFilm: 0,
  });

  it('reads as metering before a measurement', () => {
    expect(clippingChip(null).text).toBe('Metering');
  });

  it('warns with the clipped share', () => {
    expect(clippingChip(exposure(0.5))).toMatchObject({
      text: 'Blue clipping 50%',
      tone: 'alert',
    });
  });

  it('is calm when little blue is lost', () => {
    expect(clippingChip(exposure(0))).toMatchObject({
      text: 'Blue OK',
      tone: 'ok',
    });
  });
});

describe('toolHint', () => {
  it('says the crop trims the export', () => {
    expect(toolHint('crop')).toContain('export');
  });

  it('describes base and neutral picking', () => {
    expect(toolHint('base')).toContain('rebate');
    expect(toolHint('neutral')).toContain('grey');
  });
});

describe('isCompactEditor', () => {
  it('is compact on a short body only once measured', () => {
    expect(isCompactEditor(0)).toBe(false);
    expect(isCompactEditor(600)).toBe(true);
    expect(isCompactEditor(760)).toBe(false);
  });
});

describe('editorLayout', () => {
  it('keeps both photo buttons where the full toolbar fits', () => {
    expect(editorLayout({ width: 440, height: 760 })).toEqual({
      compact: false,
      mergePhotoActions: false,
    });
    // iPhone 17e: 390 pt wide.
    expect(editorLayout({ width: 390, height: 640 }).mergePhotoActions).toBe(
      false
    );
  });

  it('merges the photo buttons on a 375 pt phone', () => {
    const se = editorLayout({ width: 375, height: 560 });
    expect(se.mergePhotoActions).toBe(true);
    expect(se.compact).toBe(true);
    // The merged toolbar, four buttons, fits what is left.
    expect(toolbarWidth(4)).toBeLessThanOrEqual(375 - 32);
  });

  it('does not merge before the body is measured', () => {
    expect(editorLayout({ width: 0, height: 0 })).toEqual({
      compact: false,
      mergePhotoActions: false,
    });
  });
});
