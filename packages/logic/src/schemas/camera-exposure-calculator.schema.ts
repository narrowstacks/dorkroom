import { z } from 'zod';
import { CAMERA_EXPOSURE_STORAGE_KEY } from '../types/camera-exposure-calculator';
import { definePersistedFormFields } from '../utils/persisted-form-fields';

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
export const cameraExposurePersistence = definePersistedFormFields(
  CAMERA_EXPOSURE_STORAGE_KEY,
  cameraExposureFieldSchemas
);
