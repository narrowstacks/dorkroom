import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ASPECT_RATIOS, PAPER_SIZES } from '../../constants/border-calculator';
import type { BorderPresetSettings } from '../../types/border-calculator';
import { encodeBase64, toUrlSafe } from '../base64';
import {
  decodePreset,
  encodePreset,
  isValidEncodedPreset,
} from '../preset-sharing';

/**
 * Reproduces the legacy (v1) encoding scheme exactly as it shipped:
 * parts joined with '-', verticalOffset biased by +10000, horizontalOffset
 * pushed raw. Used to prove backward compatibility with links in the wild.
 */
function encodeLegacyPreset(
  name: string,
  settings: BorderPresetSettings
): string {
  const parts: (string | number)[] = [encodeURIComponent(name)];
  parts.push(ASPECT_RATIOS.findIndex((o) => o.value === settings.aspectRatio));
  parts.push(PAPER_SIZES.findIndex((o) => o.value === settings.paperSize));
  parts.push(Math.round(settings.minBorder * 100));
  parts.push(Math.round(settings.horizontalOffset * 100));
  parts.push(Math.round(settings.verticalOffset * 100) + 10000);
  let mask = 0;
  if (settings.enableOffset) mask |= 1;
  if (settings.ignoreMinBorder) mask |= 2;
  if (settings.showBlades) mask |= 4;
  if (settings.isLandscape) mask |= 8;
  if (settings.isRatioFlipped) mask |= 16;
  if (settings.showBladeReadings) mask |= 32;
  parts.push(mask);
  if (settings.aspectRatio === 'custom') {
    parts.push(Math.round(settings.customAspectWidth * 100));
    parts.push(Math.round(settings.customAspectHeight * 100));
  }
  if (settings.paperSize === 'custom') {
    parts.push(Math.round(settings.customPaperWidth * 100));
    parts.push(Math.round(settings.customPaperHeight * 100));
  }
  return toUrlSafe(encodeBase64(parts.join('-')));
}

const baseSettings: BorderPresetSettings = {
  aspectRatio: '3:2',
  paperSize: '8x10',
  customAspectWidth: 0,
  customAspectHeight: 0,
  customPaperWidth: 0,
  customPaperHeight: 0,
  minBorder: 0.5,
  enableOffset: true,
  ignoreMinBorder: false,
  horizontalOffset: 0,
  verticalOffset: 0,
  showBlades: true,
  showBladeReadings: false,
  isLandscape: false,
  isRatioFlipped: false,
  hasManuallyFlippedPaper: false,
};

/** Fields decode always resets, so round-trip comparisons exclude them. */
function expectSettingsMatch(
  actual: BorderPresetSettings,
  expected: BorderPresetSettings
): void {
  const { hasManuallyFlippedPaper: _a, ...actualRest } = actual;
  const { hasManuallyFlippedPaper: _e, ...expectedRest } = expected;
  expect(actualRest).toEqual(expectedRest);
}

describe('preset-sharing', () => {
  // Suppress expected console.error output from debugError in error-path tests
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('round-trip encode/decode', () => {
    it('preserves a negative horizontal offset (issue #238)', () => {
      const settings = {
        ...baseSettings,
        horizontalOffset: -0.5,
        verticalOffset: 0.25,
      };
      const encoded = encodePreset({ name: 'My Preset', settings });
      const decoded = decodePreset(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('My Preset');
      expectSettingsMatch(decoded!.settings, settings);
    });

    it('preserves negative offsets on both axes', () => {
      const settings = {
        ...baseSettings,
        horizontalOffset: -2,
        verticalOffset: -2,
      };
      const decoded = decodePreset(encodePreset({ name: 'Both', settings }));

      expect(decoded).not.toBeNull();
      expectSettingsMatch(decoded!.settings, settings);
    });

    it('preserves positive offsets', () => {
      const settings = {
        ...baseSettings,
        horizontalOffset: 2,
        verticalOffset: 1.75,
      };
      const decoded = decodePreset(encodePreset({ name: 'Pos', settings }));

      expect(decoded).not.toBeNull();
      expectSettingsMatch(decoded!.settings, settings);
    });

    it('preserves zero offsets', () => {
      const decoded = decodePreset(
        encodePreset({ name: 'Zero', settings: baseSettings })
      );

      expect(decoded).not.toBeNull();
      expectSettingsMatch(decoded!.settings, baseSettings);
    });

    it('preserves all boolean flags', () => {
      const settings = {
        ...baseSettings,
        enableOffset: true,
        ignoreMinBorder: true,
        showBlades: false,
        showBladeReadings: true,
        isLandscape: true,
        isRatioFlipped: true,
      };
      const decoded = decodePreset(encodePreset({ name: 'Flags', settings }));

      expect(decoded).not.toBeNull();
      expectSettingsMatch(decoded!.settings, settings);
    });

    it('preserves custom aspect ratio and paper size dimensions', () => {
      const settings: BorderPresetSettings = {
        ...baseSettings,
        aspectRatio: 'custom',
        paperSize: 'custom',
        customAspectWidth: 3.5,
        customAspectHeight: 2.25,
        customPaperWidth: 9.5,
        customPaperHeight: 12,
        horizontalOffset: -1.25,
      };
      const decoded = decodePreset(encodePreset({ name: 'Custom', settings }));

      expect(decoded).not.toBeNull();
      expectSettingsMatch(decoded!.settings, settings);
    });

    it('preserves a preset name containing hyphens', () => {
      const decoded = decodePreset(
        encodePreset({ name: 'my-fav-preset', settings: baseSettings })
      );

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('my-fav-preset');
      expectSettingsMatch(decoded!.settings, baseSettings);
    });

    it('round-trips every non-custom setting across the full offset range', () => {
      for (let offset = -2; offset <= 2; offset += 0.25) {
        // `|| 0` normalizes -0 to 0 so Object.is comparisons hold
        const mirrored = -offset || 0;
        const settings = {
          ...baseSettings,
          horizontalOffset: offset,
          verticalOffset: mirrored,
        };
        const decoded = decodePreset(encodePreset({ name: 'Sweep', settings }));

        expect(decoded).not.toBeNull();
        expect(decoded?.settings.horizontalOffset).toBe(offset);
        expect(decoded?.settings.verticalOffset).toBe(mirrored);
      }
    });
  });

  describe('legacy (v1) link compatibility', () => {
    it('decodes a legacy link with non-negative horizontal offset', () => {
      const settings = {
        ...baseSettings,
        horizontalOffset: 0.75,
        verticalOffset: -0.5,
      };
      const legacy = encodeLegacyPreset('Old Link', settings);
      const decoded = decodePreset(legacy);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('Old Link');
      expectSettingsMatch(decoded!.settings, settings);
    });

    it('repairs a legacy link corrupted by a negative horizontal offset', () => {
      const settings = {
        ...baseSettings,
        horizontalOffset: -0.5,
        verticalOffset: -0.5,
      };
      const legacy = encodeLegacyPreset('Corrupted', settings);
      const decoded = decodePreset(legacy);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('Corrupted');
      expectSettingsMatch(decoded!.settings, settings);
    });

    it('decodes a legacy link with custom dimensions', () => {
      const settings: BorderPresetSettings = {
        ...baseSettings,
        aspectRatio: 'custom',
        paperSize: 'custom',
        customAspectWidth: 3,
        customAspectHeight: 2,
        customPaperWidth: 8.5,
        customPaperHeight: 11,
      };
      const legacy = encodeLegacyPreset('Old Custom', settings);
      const decoded = decodePreset(legacy);

      expect(decoded).not.toBeNull();
      expectSettingsMatch(decoded!.settings, settings);
    });

    it('decodes the documented legacy example string', () => {
      // From the encodePreset JSDoc: 'My Preset' with default-ish settings
      const decoded = decodePreset('TXklMjBQcmVzZXQtMC0xLTUwLTAtMTAwMDAtNA');

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('My Preset');
      expect(decoded?.settings.verticalOffset).toBe(0);
    });
  });

  describe('invalid input', () => {
    it('returns null for garbage input', () => {
      expect(decodePreset('!!!not-base64!!!')).toBeNull();
    });

    it('returns null for an out-of-range aspect ratio index', () => {
      const raw = ['2', encodeURIComponent('Bad'), 999, 0, 50, 0, 0, 5].join(
        '|'
      );
      expect(decodePreset(toUrlSafe(encodeBase64(raw)))).toBeNull();
    });

    it('returns null for an out-of-range paper size index', () => {
      const raw = ['2', encodeURIComponent('Bad'), 0, 999, 50, 0, 0, 5].join(
        '|'
      );
      expect(decodePreset(toUrlSafe(encodeBase64(raw)))).toBeNull();
    });

    it('returns null for a truncated v2 payload', () => {
      const raw = ['2', encodeURIComponent('Short'), 0, 2].join('|');
      expect(decodePreset(toUrlSafe(encodeBase64(raw)))).toBeNull();
    });

    it('returns null for a truncated legacy payload', () => {
      const raw = [encodeURIComponent('Short'), 0, 1, 50].join('-');
      expect(decodePreset(toUrlSafe(encodeBase64(raw)))).toBeNull();
    });

    it('returns null when a numeric part is not a number', () => {
      const raw = ['2', encodeURIComponent('Bad'), 0, 2, 'abc', 0, 0, 4].join(
        '|'
      );
      expect(decodePreset(toUrlSafe(encodeBase64(raw)))).toBeNull();
    });

    it('encodePreset returns empty string for an unknown aspect ratio', () => {
      const settings = {
        ...baseSettings,
        // SAFETY: deliberately invalid value to exercise the encode error path
        aspectRatio: 'nope' as BorderPresetSettings['aspectRatio'],
      };
      expect(encodePreset({ name: 'Bad', settings })).toBe('');
    });
  });

  describe('isValidEncodedPreset', () => {
    it('accepts a freshly encoded preset', () => {
      const encoded = encodePreset({
        name: 'Check',
        settings: { ...baseSettings, horizontalOffset: -1 },
      });
      expect(isValidEncodedPreset(encoded)).toBe(true);
    });

    it('accepts a legacy encoded preset', () => {
      const legacy = encodeLegacyPreset('Check', baseSettings);
      expect(isValidEncodedPreset(legacy)).toBe(true);
    });

    it('rejects strings with characters outside the URL-safe alphabet', () => {
      expect(isValidEncodedPreset('abc+def/ghi=')).toBe(false);
    });

    it('rejects undecodable strings', () => {
      expect(isValidEncodedPreset('AAAA')).toBe(false);
    });
  });
});
