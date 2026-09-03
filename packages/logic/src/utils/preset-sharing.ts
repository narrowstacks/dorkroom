import { z } from 'zod';
import { ASPECT_RATIOS, PAPER_SIZES } from '../constants/border-calculator';
import {
  aspectRatioValueSchema,
  paperSizeValueSchema,
} from '../schemas/border-calculator.schema';
import type {
  AspectRatioValue,
  BorderPresetSettings,
  PaperSizeValue,
} from '../types/border-calculator';
import { decodeBase64, encodeBase64, fromUrlSafe, toUrlSafe } from './base64';
import { debugError } from './debug-logger';

const encodedPresetStringSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

/**
 * Delimiter for the current (v2) encoding. Chosen because it can never appear
 * in a legacy (v1) raw string: v1 joined parts with '-', numbers contain no
 * '|', and encodeURIComponent escapes '|' in preset names. Its presence in a
 * decoded raw string therefore unambiguously identifies the v2 format, and it
 * lets negative numbers and hyphenated names encode without corruption.
 */
const V2_DELIMITER = '|';
const V2_VERSION_MARKER = '2';

/**
 * Type guard to validate that a string is a valid AspectRatioValue.
 * @param value - String to validate
 * @returns True if value is a valid aspect ratio
 */
function isValidAspectRatio(
  value: string | undefined
): value is AspectRatioValue {
  return aspectRatioValueSchema.safeParse(value).success;
}

/**
 * Type guard to validate that a string is a valid PaperSizeValue.
 * @param value - String to validate
 * @returns True if value is a valid paper size
 */
function isValidPaperSize(value: string | undefined): value is PaperSizeValue {
  return paperSizeValueSchema.safeParse(value).success;
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
 *   settings: { aspectRatio: '3:2', paperSize: '8x10', minBorder: 0.5, ... }
 * };
 * const encoded = encodePreset(preset);
 * console.log(encoded); // 'MnxNeSUyMFByZXNldHwwfDJ8NTB8MHwwfDQ'
 * ```
 */
export function encodePreset(preset: PresetToShare): string {
  try {
    const { name, settings } = preset;
    const parts: (string | number)[] = [];

    // Version marker distinguishes this format from legacy v1 links
    parts.push(V2_VERSION_MARKER);

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
    // The '|' delimiter tolerates minus signs, so offsets encode raw
    parts.push(Math.round(settings.horizontalOffset * 100));
    parts.push(Math.round(settings.verticalOffset * 100));
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
    const rawString = parts.join(V2_DELIMITER);
    return toUrlSafe(encodeBase64(rawString));
  } catch (error) {
    debugError('Failed to encode preset:', error);
    return '';
  }
}

interface RawPresetParts {
  name: string;
  parts: number[];
  /** Amount to subtract from the encoded verticalOffset (v1 added +10000) */
  verticalOffsetBias: number;
}

/**
 * Splits a decoded raw preset string into its name and numeric parts,
 * handling both the current (v2, '|'-delimited) and legacy (v1,
 * '-'-delimited) formats.
 *
 * @param rawString - Base64-decoded preset payload
 * @returns Preset name, numeric parts, and the vertical offset bias to apply
 */
function splitRawPreset(rawString: string): RawPresetParts {
  if (rawString.includes(V2_DELIMITER)) {
    const stringParts = rawString.split(V2_DELIMITER);
    if (stringParts.shift() !== V2_VERSION_MARKER) {
      throw new Error('Unknown preset encoding version');
    }
    const name = decodeURIComponent(stringParts.shift() ?? '');
    const parts = stringParts.map(Number);
    if (parts.some(Number.isNaN)) {
      throw new Error('Preset payload contains a non-numeric part');
    }
    return { name, parts, verticalOffsetBias: 0 };
  }

  // Legacy v1 format: parts joined with '-'. A negative horizontalOffset was
  // encoded raw, so its minus sign produced a double hyphen and split()
  // yields an empty part before the digits. Merge each empty part back with
  // the following part as a negative number to repair those links.
  const stringParts = rawString.split('-');
  const name = decodeURIComponent(stringParts.shift() ?? '');
  const parts: number[] = [];
  for (let i = 0; i < stringParts.length; i++) {
    if (stringParts[i] === '' && i + 1 < stringParts.length) {
      parts.push(-Number(stringParts[i + 1]));
      i++;
    } else {
      parts.push(Number(stringParts[i]));
    }
  }
  if (parts.some(Number.isNaN)) {
    throw new Error('Preset payload contains a non-numeric part');
  }
  return { name, parts, verticalOffsetBias: 10000 };
}

/**
 * Decodes a border calculator preset from a URL-safe encoded string.
 * Reverses the encoding process and reconstructs the complete preset object.
 * Accepts both the current (v2) format and legacy (v1) links.
 *
 * @param encoded - URL-safe encoded preset string
 * @returns Decoded preset object with name and settings, or null if decoding fails
 * @example
 * ```typescript
 * const encoded = 'MnxNeSUyMFByZXNldHwwfDJ8NTB8MHwwfDQ';
 * const preset = decodePreset(encoded);
 * console.log(preset);
 * // { name: 'My Preset', settings: { aspectRatio: '3:2', ... } }
 * ```
 */
export function decodePreset(encoded: string): SharedPreset | null {
  try {
    const rawString = decodeBase64(fromUrlSafe(encoded));
    const { name, parts, verticalOffsetBias } = splitRawPreset(rawString);

    let partIndex = 0;
    const aspectRatioIndex = parts[partIndex++];
    const paperSizeIndex = parts[partIndex++];
    const minBorder = parts[partIndex++] / 100;
    const horizontalOffset = parts[partIndex++] / 100;
    const verticalOffset = (parts[partIndex++] - verticalOffsetBias) / 100;
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
      hasManuallyFlippedPaper: false,
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

    // partIndex counts every part read above; fewer parts means a truncated
    // payload whose missing reads produced NaN settings
    if (parts.length < partIndex) {
      throw new Error('Truncated preset payload');
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
  if (!encodedPresetStringSchema.safeParse(encoded).success) {
    return false;
  }

  return decodePreset(encoded) !== null;
}
