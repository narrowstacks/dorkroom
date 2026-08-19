export type SolveFor = 'shutterSpeed' | 'aperture' | 'iso';

/** Branded string key types for Select component values. */
export type ShutterSpeedKey = string & { readonly __brand: 'ShutterSpeedKey' };
export type ApertureKey = string & { readonly __brand: 'ApertureKey' };
export type ISOKey = string & { readonly __brand: 'ISOKey' };

/* Minting a key is centralized here so the brands stay searchable. */

export const asShutterSpeedKey = (label: string): ShutterSpeedKey =>
  // SAFETY: the brand adds no runtime requirement over `string`.
  label as ShutterSpeedKey;

export const asApertureKey = (label: string): ApertureKey =>
  // SAFETY: the brand adds no runtime requirement over `string`.
  label as ApertureKey;

export const asISOKey = (label: string): ISOKey =>
  // SAFETY: the brand adds no runtime requirement over `string`.
  label as ISOKey;

export interface CameraExposureFormState {
  aperture: number;
  shutterSpeed: number;
  iso: number;
  solveFor: SolveFor;
  compareAperture: number;
  compareShutterSpeed: number;
  compareIso: number;
}

export interface ExposureValueResult {
  ev: number;
  description: string;
  isValid: boolean;
}

export interface EquivalentExposure {
  aperture: number;
  shutterSpeed: number;
  apertureLabel: string;
  shutterSpeedLabel: string;
  isCurrentSetting: boolean;
}

export interface ExposureComparison {
  evA: number;
  evB: number;
  stopsDifference: number;
  descriptionA: string;
  descriptionB: string;
  isValid: boolean;
}

export interface StandardValue {
  value: number;
  label: string;
}

export interface EVPreset {
  ev: number;
  label: string;
  description: string;
}

export const CAMERA_EXPOSURE_STORAGE_KEY = 'cameraExposureCalculatorState_v1';
