import type {
  BorderPresetSettings,
  AspectRatioValue,
  PaperSizeValue,
} from '../types/border-calculator';
import { ASPECT_RATIOS, PAPER_SIZES } from '../constants/border-calculator';
import { debugError } from './debug-logger';

/**
 * Set of valid aspect ratio values for fast O(1) lookups.
 * Pre-computed from ASPECT_RATIOS constant for runtime validation.
 */
const validAspectRatios = new Set<string>(
  ASPECT_RATIOS.map((ratio) => ratio.value)
);

/**
 * Set of valid paper size values for fast O(1) lookups.
 * Pre-computed from PAPER_SIZES constant for runtime validation.
 */
const validPaperSizes = new Set<string>(
  PAPER_SIZES.map((size) => size.value)
);

/**
 * Type guard to validate that a string is a valid AspectRatioValue.
 * @param value - String to validate
 * @returns True if value is a valid aspect ratio
 */
function isValidAspectRatio(value: unknown): value is AspectRatioValue {
  return typeof value === 'string' && validAspectRatios.has(value);
}

/**
 * Type guard to validate that a string is a valid PaperSizeValue.
 * @param value - String to validate
 * @returns True if value is a valid paper size
 */
function isValidPaperSize(value: unknown): value is PaperSizeValue {
  return typeof value === 'string' && validPaperSizes.has(value);
}

export interface PresetToShare {
  name: string;
  settings: BorderPresetSettings;
}

export interface SharedPreset {
  name: string;
  settings: BorderPresetSettings;
}

/**
 * Finds the index of a value in an array of options by matching the value property.
 *
 * @param options - Array of objects with value properties
 * @param value - Value to search for
 * @returns Index of the matching option, or -1 if not found
 */
function findIndexByValue<T extends readonly { value: string }[]>(
  options: T,
  value: string
): number {
  return options.findIndex((option) => option.value === value);
}

/**
 * Converts boolean settings to a bitmask for compact URL encoding.
 * Each boolean setting is represented by a specific bit position.
 *
 * @param settings - Border preset settings containing boolean flags
 * @returns Numeric bitmask representing all boolean settings
 * @example
 * ```typescript
 * const mask = getBooleanBitmask({
 *   enableOffset: true,    // bit 0 = 1
 *   ignoreMinBorder: false, // bit 1 = 0
 *   showBlades: true       // bit 2 = 4
 * });
 * console.log(mask); // 5 (binary: 101)
 * ```
 */
function getBooleanBitmask(settings: BorderPresetSettings): number {
  let mask = 0;
  if (settings.enableOffset) mask |= 1;
  if (settings.ignoreMinBorder) mask |= 2;
  if (settings.showBlades) mask |= 4;
  if (settings.isLandscape) mask |= 8;
  if (settings.isRatioFlipped) mask |= 16;
  if (settings.showBladeReadings) mask |= 32;
  return mask;
}

/**
 * Converts a numeric bitmask back to boolean settings object.
 * Reverses the operation performed by getBooleanBitmask.
 *
 * @param mask - Numeric bitmask containing boolean flags
 * @returns Partial settings object with boolean properties
 * @example
 * ```typescript
 * const settings = fromBooleanBitmask(5); // binary: 101
 * console.log(settings);
 * // { enableOffset: true, ignoreMinBorder: false, showBlades: true, ... }
 * ```
 */
function fromBooleanBitmask(mask: number): Partial<BorderPresetSettings> {
  return {
    enableOffset: !!(mask & 1),
    ignoreMinBorder: !!(mask & 2),
    showBlades: !!(mask & 4),
    isLandscape: !!(mask & 8),
    isRatioFlipped: !!(mask & 16),
    showBladeReadings: !!(mask & 32),
  };
}

/**
 * Encodes a border calculator preset into a URL-safe string for sharing.
 * Uses base64 encoding with URL-safe character substitutions and compact data representation.
 *
 * @param preset - Preset object containing name and settings
 * @returns URL-safe encoded string, or empty string if encoding fails
 * @example
 * ```typescript
 * const preset = {
 *   name: 'My Preset',
 *   settings: { aspectRatio: '2:3', paperSize: '8x10', minBorder: 0.5, ... }
 * };
 * const encoded = encodePreset(preset);
 * console.log(encoded); // 'TXklMjBQcmVzZXQtMC0xLTUwLTAtMTAwMDAtNA'
 * ```
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
    debugError('Failed to encode preset:', error);
    return '';
  }
}

/**
 * Decodes a border calculator preset from a URL-safe encoded string.
 * Reverses the encoding process and reconstructs the complete preset object.
 *
 * @param encoded - URL-safe encoded preset string
 * @returns Decoded preset object with name and settings, or null if decoding fails
 * @example
 * ```typescript
 * const encoded = 'TXklMjBQcmVzZXQtMC0xLTUwLTAtMTAwMDAtNA';
 * const preset = decodePreset(encoded);
 * console.log(preset);
 * // { name: 'My Preset', settings: { aspectRatio: '2:3', ... } }
 * ```
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

    const aspectRatioValue = ASPECT_RATIOS[aspectRatioIndex]?.value;
    const paperSizeValue = PAPER_SIZES[paperSizeIndex]?.value;

    // Validate that the retrieved values are actually valid members of their respective unions
    if (!isValidAspectRatio(aspectRatioValue)) {
      throw new Error(
        `Invalid aspect ratio at index ${aspectRatioIndex}: value "${aspectRatioValue}" is not a permitted AspectRatioValue`
      );
    }

    if (!isValidPaperSize(paperSizeValue)) {
      throw new Error(
        `Invalid paper size at index ${paperSizeIndex}: value "${paperSizeValue}" is not a permitted PaperSizeValue`
      );
    }

    const booleanSettings = fromBooleanBitmask(boolMask);
    const settings: BorderPresetSettings = {
      aspectRatio: aspectRatioValue,
      paperSize: paperSizeValue,
      minBorder,
      horizontalOffset,
      verticalOffset,
      enableOffset: booleanSettings.enableOffset ?? false,
      ignoreMinBorder: booleanSettings.ignoreMinBorder ?? false,
      showBlades: booleanSettings.showBlades ?? true,
      showBladeReadings: booleanSettings.showBladeReadings ?? false,
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
    debugError('Failed to decode preset:', error);
    return null;
  }
}

/**
 * Validates if a string appears to be a valid encoded preset by checking format and attempting decode.
 * Performs both format validation and actual decoding test.
 *
 * @param encoded - String to validate as encoded preset
 * @returns True if the string is a valid encoded preset, false otherwise
 * @example
 * ```typescript
 * const valid = isValidEncodedPreset('TXklMjBQcmVzZXQtMC0xLTUwLTAtMTAwMDAtNA');
 * console.log(valid); // true
 *
 * const invalid = isValidEncodedPreset('invalid-string');
 * console.log(invalid); // false
 * ```
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
