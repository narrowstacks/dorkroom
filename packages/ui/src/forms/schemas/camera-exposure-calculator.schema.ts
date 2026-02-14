import {
  apertureValidator,
  isoValidator,
  shutterSpeedValidator,
  solveForValidator,
} from '@dorkroom/logic';
import { z } from 'zod';

/**
 * Validation schema for Camera Exposure Calculator Form
 */
export const cameraExposureCalculatorSchema = z.object({
  aperture: apertureValidator(),
  shutterSpeed: shutterSpeedValidator(),
  iso: isoValidator(),
  solveFor: solveForValidator(),
  compareAperture: apertureValidator(),
  compareShutterSpeed: shutterSpeedValidator(),
  compareIso: isoValidator(),
});

export type CameraExposureCalculatorFormData = z.infer<
  typeof cameraExposureCalculatorSchema
>;
