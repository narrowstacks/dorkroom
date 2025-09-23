import type { BorderPresetSettings } from '../types/border-calculator';
import { ASPECT_RATIOS, PAPER_SIZES } from '../constants/border-calculator';

export interface PresetToShare {
  name: string;
  settings: BorderPresetSettings;
}

export interface SharedPreset {
  name: string;
  settings: BorderPresetSettings;
}

/**
 * Find index of a value in an array of options
 */
function findIndexByValue<T extends { value: string }>(
  options: T[],
  value: string
): number {
  return options.findIndex((option) => option.value === value);
}

/**
 * Convert boolean settings to a bitmask for compact encoding
 */
function getBooleanBitmask(settings: BorderPresetSettings): number {
  let mask = 0;
  if (settings.enableOffset) mask |= 1;
  if (settings.ignoreMinBorder) mask |= 2;
  if (settings.showBlades) mask |= 4;
  if (settings.isLandscape) mask |= 8;
  if (settings.isRatioFlipped) mask |= 16;
  return mask;
}

/**
 * Convert bitmask back to boolean settings
 */
function fromBooleanBitmask(mask: number): Partial<BorderPresetSettings> {
  return {
    enableOffset: !!(mask & 1),
    ignoreMinBorder: !!(mask & 2),
    showBlades: !!(mask & 4),
    isLandscape: !!(mask & 8),
    isRatioFlipped: !!(mask & 16),
  };
}

/**
 * Encode a preset into a URL-safe string
 */
export function encodePreset(preset: PresetToShare): string {
  try {
    const { name, settings } = preset;
    const parts: (string | number)[] = [];

    // Add preset name
    parts.push(encodeURIComponent(name));

    // Find indices for aspect ratio and paper size
    const aspectRatioIndex = findIndexByValue(
      ASPECT_RATIOS,
      settings.aspectRatio
    );
    const paperSizeIndex = findIndexByValue(PAPER_SIZES, settings.paperSize);

    if (aspectRatioIndex === -1 || paperSizeIndex === -1) {
      throw new Error('Invalid aspect ratio or paper size');
    }

    // Add core settings
    parts.push(aspectRatioIndex);
    parts.push(paperSizeIndex);
    parts.push(Math.round(settings.minBorder * 100));
    parts.push(Math.round(settings.horizontalOffset * 100));
    // Encode negative numbers by adding 10000 to make them positive
    parts.push(Math.round(settings.verticalOffset * 100) + 10000);
    parts.push(getBooleanBitmask(settings));

    // Add custom values if needed
    if (settings.aspectRatio === 'custom') {
      parts.push(Math.round(settings.customAspectWidth * 100));
      parts.push(Math.round(settings.customAspectHeight * 100));
    }
    if (settings.paperSize === 'custom') {
      parts.push(Math.round(settings.customPaperWidth * 100));
      parts.push(Math.round(settings.customPaperHeight * 100));
    }

    // Create the encoded string
    const rawString = parts.join('-');
    const encoded = btoa(rawString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encoded;
  } catch (error) {
    console.error('Failed to encode preset:', error);
    return '';
  }
}

/**
 * Decode a preset from a URL-safe string
 */
export function decodePreset(encoded: string): SharedPreset | null {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const rawString = atob(base64);
    const stringParts = rawString.split('-');

    const name = decodeURIComponent(stringParts.shift() || '');
    const parts = stringParts.map(Number);

    let partIndex = 0;
    const aspectRatioIndex = parts[partIndex++];
    const paperSizeIndex = parts[partIndex++];
    const minBorder = parts[partIndex++] / 100;
    const horizontalOffset = parts[partIndex++] / 100;
    // Decode negative numbers by subtracting 10000
    const verticalOffset = (parts[partIndex++] - 10000) / 100;
    const boolMask = parts[partIndex++];

    const aspectRatio = ASPECT_RATIOS[aspectRatioIndex]?.value;
    const paperSize = PAPER_SIZES[paperSizeIndex]?.value;

    if (!aspectRatio || !paperSize) {
      throw new Error('Invalid aspect ratio or paper size index');
    }

    const booleanSettings = fromBooleanBitmask(boolMask);
    const settings: BorderPresetSettings = {
      aspectRatio,
      paperSize,
      minBorder,
      horizontalOffset,
      verticalOffset,
      enableOffset: booleanSettings.enableOffset ?? false,
      ignoreMinBorder: booleanSettings.ignoreMinBorder ?? false,
      showBlades: booleanSettings.showBlades ?? true,
      isLandscape: booleanSettings.isLandscape ?? false,
      isRatioFlipped: booleanSettings.isRatioFlipped ?? false,
      customAspectWidth: 0,
      customAspectHeight: 0,
      customPaperWidth: 0,
      customPaperHeight: 0,
    };

    // Parse custom values if needed
    if (settings.aspectRatio === 'custom') {
      settings.customAspectWidth = parts[partIndex++] / 100;
      settings.customAspectHeight = parts[partIndex++] / 100;
    }
    if (settings.paperSize === 'custom') {
      settings.customPaperWidth = parts[partIndex++] / 100;
      settings.customPaperHeight = parts[partIndex++] / 100;
    }

    return { name, settings };
  } catch (error) {
    console.error('Failed to decode preset:', error);
    return null;
  }
}

/**
 * Validate if a string appears to be a valid encoded preset
 */
export function isValidEncodedPreset(encoded: string): boolean {
  if (!encoded || typeof encoded !== 'string') {
    return false;
  }

  // Basic validation: should be base64-like characters
  const base64Regex = /^[A-Za-z0-9_-]+$/;
  if (!base64Regex.test(encoded)) {
    return false;
  }

  // Try to decode to see if it's valid
  const decoded = decodePreset(encoded);
  return decoded !== null;
}
