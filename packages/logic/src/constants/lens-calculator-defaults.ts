/**
 * Default settings and sensor format definitions for the Lens Calculator
 */

import type {
  FocalLengthPreset,
  LensCalculatorState,
  SensorFormat,
} from '../types/lens-calculator';

// Full frame 35mm diagonal for reference (used to calculate crop factors)
const FULL_FRAME_DIAGONAL = Math.sqrt(36 * 36 + 24 * 24); // ~43.27mm

/**
 * Calculates the diagonal of a sensor from width and height
 */
const calculateDiagonal = (width: number, height: number): number =>
  Math.sqrt(width * width + height * height);

/**
 * Calculates crop factor relative to full frame 35mm
 */
const calculateCropFactor = (width: number, height: number): number =>
  FULL_FRAME_DIAGONAL / calculateDiagonal(width, height);

/**
 * Creates a sensor format object with calculated diagonal and crop factor
 */
const createFormat = (
  id: string,
  name: string,
  shortName: string,
  category: SensorFormat['category'],
  width: number,
  height: number
): SensorFormat => ({
  id,
  name,
  shortName,
  category,
  width,
  height,
  diagonal: calculateDiagonal(width, height),
  cropFactor: calculateCropFactor(width, height),
});

/**
 * All supported sensor and film formats
 * Organized by category for display
 */
export const SENSOR_FORMATS: SensorFormat[] = [
  // Digital formats
  createFormat(
    'full-frame',
    'Full Frame (35mm)',
    'Full Frame',
    'digital',
    36,
    24
  ),
  createFormat('aps-c-canon', 'APS-C (Canon)', 'APS-C', 'digital', 22.3, 14.9),
  createFormat(
    'aps-c-nikon',
    'APS-C (Nikon/Sony)',
    'APS-C',
    'digital',
    23.5,
    15.6
  ),
  createFormat(
    'micro-four-thirds',
    'Micro Four Thirds',
    'MFT',
    'digital',
    17.3,
    13
  ),
  createFormat(
    'medium-format-digital',
    'Medium Format Digital (Fuji/Hasselblad) (43.8×32.9mm)',
    'MF Digital (Fuji/Hasselblad)',
    'digital',
    43.8,
    32.9
  ),
  createFormat(
    'medium-format-phaseone',
    'Medium Format Digital (Phase One) (53.4×40mm)',
    'MF Digital (Phase One)',
    'digital',
    53.4,
    40
  ),

  // Medium format film (landscape orientation)
  createFormat('film-645', '6×4.5 (645)', '645', 'film-medium', 56, 41.5),
  createFormat('film-6x6', '6×6 (Square)', '6×6', 'film-medium', 56, 56),
  createFormat('film-6x7', '6×7', '6×7', 'film-medium', 70, 56),
  createFormat('film-6x9', '6×9', '6×9', 'film-medium', 84, 56),
];

/**
 * Map of format IDs to format objects for quick lookup
 */
export const SENSOR_FORMAT_MAP: Record<string, SensorFormat> =
  Object.fromEntries(SENSOR_FORMATS.map((format) => [format.id, format]));

/**
 * Common focal length presets
 */
export const FOCAL_LENGTH_PRESETS: FocalLengthPreset[] = [
  { label: '24mm', value: 24, description: 'Wide angle' },
  { label: '35mm', value: 35, description: 'Wide/standard' },
  { label: '50mm', value: 50, description: 'Standard' },
  { label: '85mm', value: 85, description: 'Portrait' },
  { label: '100mm', value: 100, description: 'Macro/Portrait' },
  { label: '135mm', value: 135, description: 'Portrait' },
  { label: '200mm', value: 200, description: 'Telephoto' },
];

/**
 * Default focal length in mm
 */
export const DEFAULT_FOCAL_LENGTH = '50';

/**
 * Default source format (full frame)
 */
export const DEFAULT_SOURCE_FORMAT = 'full-frame';

/**
 * Default target format (APS-C)
 */
export const DEFAULT_TARGET_FORMAT = 'aps-c-nikon';

/**
 * Complete default state for the lens calculator
 */
export const LENS_CALCULATOR_DEFAULTS = {
  focalLength: DEFAULT_FOCAL_LENGTH,
  sourceFormat: DEFAULT_SOURCE_FORMAT,
  targetFormat: DEFAULT_TARGET_FORMAT,
} as const satisfies LensCalculatorState;

export default LENS_CALCULATOR_DEFAULTS;
