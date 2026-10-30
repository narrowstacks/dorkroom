import {
  convertDisplayToInches,
  convertInchesToInputValue,
  type MeasurementUnit,
  parseDecimalInput,
} from '@dorkroom/logic';

/** The Resize fields that hold a length, as the text the user sees. */
export interface ResizeLengths {
  originalWidth: string;
  originalLength: string;
  newWidth: string;
  newLength: string;
  originalHeight: string;
  newHeight: string;
}

/**
 * Re-express one length field's text in another unit, so the number always
 * matches its label. Goes through stored inches with logic's round-trip-safe
 * helpers, so toggling back and forth returns the typed value (25 cm ->
 * 9.843 in -> 25 cm). Blank or unparseable text is left as typed.
 */
export function convertLengthInput(
  value: string,
  from: MeasurementUnit,
  to: MeasurementUnit
): string {
  if (from === to) return value;
  const parsed = parseDecimalInput(value);
  if (!Number.isFinite(parsed)) return value;
  const inches = convertDisplayToInches(parsed, from);
  return String(convertInchesToInputValue(inches, to));
}

/** Every Resize length field re-expressed from one unit in another. */
export function convertResizeLengths(
  lengths: ResizeLengths,
  from: MeasurementUnit,
  to: MeasurementUnit
): ResizeLengths {
  const convert = (value: string) => convertLengthInput(value, from, to);
  return {
    originalWidth: convert(lengths.originalWidth),
    originalLength: convert(lengths.originalLength),
    newWidth: convert(lengths.newWidth),
    newLength: convert(lengths.newLength),
    originalHeight: convert(lengths.originalHeight),
    newHeight: convert(lengths.newHeight),
  };
}
