import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASPECT_RATIOS,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  PAPER_SIZES,
  SLIDER_MIN_BORDER,
} from '../../constants/border-calculator';
import { BORDER_CALCULATOR_DEFAULTS } from '../../constants/border-calculator-defaults';
import {
  borderPresetSettingsFieldSchemas,
  sharedBorderPresetSettingsSchema,
} from '../../schemas/border-calculator.schema';
import { encodeBase64, toUrlSafe } from '../base64';
import { decodePreset, isValidEncodedPreset } from '../preset-sharing';

/**
 * Builds a v2 payload from raw parts, bypassing `encodePreset`. A share link
 * is hand-editable, so these tests must be able to put values in the payload
 * that the encoder would never produce.
 */
function encodeRawV2(name: string, ...parts: (string | number)[]): string {
  return toUrlSafe(
    encodeBase64(['2', encodeURIComponent(name), ...parts].join('|'))
  );
}

const indexOfAspectRatio = (value: string) =>
  ASPECT_RATIOS.findIndex((option) => option.value === value);
const indexOfPaperSize = (value: string) =>
  PAPER_SIZES.findIndex((option) => option.value === value);

/** Bit 4 of the boolean mask: showBlades on, everything else off. */
const SHOW_BLADES_ONLY = 4;

/** `dimensionValidator`'s ceiling, read off the schema that enforces it. */
const DIMENSION_MAX =
  borderPresetSettingsFieldSchemas.customPaperWidth.maxValue;

describe('preset-sharing bounds', () => {
  // decodePreset reports rejected payloads through debugError
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('out-of-range numbers are clamped, not trusted', () => {
    it('clamps a minBorder below the slider floor', () => {
      const encoded = encodeRawV2(
        'Negative border',
        indexOfAspectRatio('3:2'),
        indexOfPaperSize('8x10'),
        -500,
        0,
        0,
        SHOW_BLADES_ONLY
      );

      expect(decodePreset(encoded)?.settings.minBorder).toBe(SLIDER_MIN_BORDER);
    });

    it('clamps a minBorder above the dimension ceiling', () => {
      const encoded = encodeRawV2(
        'Huge border',
        indexOfAspectRatio('3:2'),
        indexOfPaperSize('8x10'),
        100_000_000,
        0,
        0,
        SHOW_BLADES_ONLY
      );

      expect(decodePreset(encoded)?.settings.minBorder).toBe(DIMENSION_MAX);
    });

    it('clamps offsets to the slider range on both axes', () => {
      const encoded = encodeRawV2(
        'Runaway offsets',
        indexOfAspectRatio('3:2'),
        indexOfPaperSize('8x10'),
        50,
        999_900,
        -999_900,
        SHOW_BLADES_ONLY | 1
      );

      const settings = decodePreset(encoded)?.settings;
      expect(settings?.horizontalOffset).toBe(OFFSET_SLIDER_MAX);
      expect(settings?.verticalOffset).toBe(OFFSET_SLIDER_MIN);
    });

    it('clamps custom paper and aspect dimensions', () => {
      const encoded = encodeRawV2(
        'Impossible paper',
        indexOfAspectRatio('custom'),
        indexOfPaperSize('custom'),
        50,
        0,
        0,
        SHOW_BLADES_ONLY,
        -100,
        -100,
        100_000_000,
        100_000_000
      );

      const settings = decodePreset(encoded)?.settings;
      expect(settings?.customAspectWidth).toBe(0);
      expect(settings?.customAspectHeight).toBe(0);
      expect(settings?.customPaperWidth).toBe(DIMENSION_MAX);
      expect(settings?.customPaperHeight).toBe(DIMENSION_MAX);
    });

    it('still reports a clampable link as valid', () => {
      const encoded = encodeRawV2(
        'Clampable',
        indexOfAspectRatio('3:2'),
        indexOfPaperSize('8x10'),
        -500,
        999_900,
        0,
        SHOW_BLADES_ONLY
      );

      expect(isValidEncodedPreset(encoded)).toBe(true);
    });
  });

  describe('malformed payloads are rejected', () => {
    it('rejects a non-finite number', () => {
      const encoded = encodeRawV2(
        'Infinite',
        indexOfAspectRatio('3:2'),
        indexOfPaperSize('8x10'),
        'Infinity',
        0,
        0,
        SHOW_BLADES_ONLY
      );

      expect(decodePreset(encoded)).toBeNull();
      expect(isValidEncodedPreset(encoded)).toBe(false);
    });

    it('rejects a non-numeric custom dimension', () => {
      const encoded = encodeRawV2(
        'Bad custom paper',
        indexOfAspectRatio('3:2'),
        indexOfPaperSize('custom'),
        50,
        0,
        0,
        SHOW_BLADES_ONLY,
        'wide',
        11
      );

      expect(decodePreset(encoded)).toBeNull();
    });

    it('rejects an aspect ratio outside the option list', () => {
      const encoded = encodeRawV2(
        'Bad ratio',
        ASPECT_RATIOS.length,
        indexOfPaperSize('8x10'),
        50,
        0,
        0,
        SHOW_BLADES_ONLY
      );

      expect(decodePreset(encoded)).toBeNull();
    });
  });

  describe('absent fields fall back to BORDER_CALCULATOR_DEFAULTS', () => {
    it('fills custom dimensions the payload never carried', () => {
      const encoded = encodeRawV2(
        'No custom parts',
        indexOfAspectRatio('3:2'),
        indexOfPaperSize('8x10'),
        50,
        0,
        0,
        SHOW_BLADES_ONLY
      );

      expect(decodePreset(encoded)?.settings).toMatchObject({
        customAspectWidth: BORDER_CALCULATOR_DEFAULTS.customAspectWidth,
        customAspectHeight: BORDER_CALCULATOR_DEFAULTS.customAspectHeight,
        customPaperWidth: BORDER_CALCULATOR_DEFAULTS.customPaperWidth,
        customPaperHeight: BORDER_CALCULATOR_DEFAULTS.customPaperHeight,
      });
    });

    it('takes every boolean default from the constants, not from decode', () => {
      // The v2 bitmask always supplies each flag explicitly, so this exercises
      // the schema directly: the fallbacks must agree with the defaults the
      // rest of the calculator starts from, `isLandscape` included.
      const settings = sharedBorderPresetSettingsSchema.parse({
        aspectRatio: '3:2',
        paperSize: '8x10',
        minBorder: 0.5,
        horizontalOffset: 0,
        verticalOffset: 0,
      });

      expect(settings).toMatchObject({
        isLandscape: BORDER_CALCULATOR_DEFAULTS.isLandscape,
        showBlades: BORDER_CALCULATOR_DEFAULTS.showBlades,
        showBladeReadings: BORDER_CALCULATOR_DEFAULTS.showBladeReadings,
        enableOffset: BORDER_CALCULATOR_DEFAULTS.enableOffset,
        ignoreMinBorder: BORDER_CALCULATOR_DEFAULTS.ignoreMinBorder,
        isRatioFlipped: BORDER_CALCULATOR_DEFAULTS.isRatioFlipped,
      });
    });
  });

  it('leaves an in-range payload untouched', () => {
    const encoded = encodeRawV2(
      'Perfectly normal',
      indexOfAspectRatio('4:3'),
      indexOfPaperSize('11x14'),
      75,
      -125,
      50,
      SHOW_BLADES_ONLY | 1 | 32
    );

    expect(decodePreset(encoded)).toEqual({
      name: 'Perfectly normal',
      settings: {
        aspectRatio: '4:3',
        paperSize: '11x14',
        customAspectWidth: BORDER_CALCULATOR_DEFAULTS.customAspectWidth,
        customAspectHeight: BORDER_CALCULATOR_DEFAULTS.customAspectHeight,
        customPaperWidth: BORDER_CALCULATOR_DEFAULTS.customPaperWidth,
        customPaperHeight: BORDER_CALCULATOR_DEFAULTS.customPaperHeight,
        minBorder: 0.75,
        enableOffset: true,
        ignoreMinBorder: false,
        horizontalOffset: -1.25,
        verticalOffset: 0.5,
        showBlades: true,
        showBladeReadings: true,
        isLandscape: false,
        isRatioFlipped: false,
        hasManuallyFlippedPaper: false,
      },
    });
  });
});
