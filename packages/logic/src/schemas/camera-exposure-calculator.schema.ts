import { z } from 'zod';
import { CAMERA_EXPOSURE_LINK_PARAMS } from '../constants/calculator-link-params';
import { CAMERA_EXPOSURE_DEFAULTS } from '../constants/camera-exposure-defaults';
import { CAMERA_EXPOSURE_STORAGE_KEY } from '../types/camera-exposure-calculator';
import { defineCalculatorLink } from '../utils/calculator-url-params';
import { definePersistedCalculator } from '../utils/persisted-calculator';

const positiveNumber = z.number().positive();

/**
 * Per-field bounds for the camera exposure calculator. The key order is the
 * persisted snapshot's key order.
 */
export const cameraExposureFieldSchemas = {
  aperture: positiveNumber,
  shutterSpeed: positiveNumber,
  iso: positiveNumber,
  solveFor: z.enum(['shutterSpeed', 'aperture', 'iso']),
  compareAperture: positiveNumber,
  compareShutterSpeed: positiveNumber,
  compareIso: positiveNumber,
};

/** Storage key, persist keys and hydration validators for the form. */
export const cameraExposurePersistence = definePersistedCalculator(
  CAMERA_EXPOSURE_STORAGE_KEY,
  cameraExposureFieldSchemas,
  CAMERA_EXPOSURE_DEFAULTS
);

/** Link that opens the camera exposure calculator pre-filled (params: `CAMERA_EXPOSURE_LINK_PARAMS`). */
export const cameraExposureLink = defineCalculatorLink(
  cameraExposurePersistence,
  CAMERA_EXPOSURE_LINK_PARAMS
);
