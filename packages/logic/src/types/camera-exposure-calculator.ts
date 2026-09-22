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

/**
 * Surfaced when an EV preset's solved value falls outside the standard
 * dial range (e.g. a preset needs 256s but the shutter dial tops out at
 * 30s) and got silently clamped to the nearest endpoint instead of the
 * value the preset actually needs.
 */
export interface PresetWarning {
  /** The EV of the preset that produced this warning. */
  presetEv: number;
  /** Which value the calculator was solving for. */
  variable: SolveFor;
  /** The exact value the preset needs, formatted for display (e.g. "256\""). */
  required: string;
  /** The standard value it was clamped to, formatted for display (e.g. "30\""). */
  limit: string;
  /**
   * Whether the exact solved value is above the standard range's top
   * ('over', e.g. needs a slower shutter speed than 30s allows) or below
   * its bottom ('under', e.g. needs a faster shutter speed than 1/8000
   * allows). Callers use this to pick a direction-correct hint — the fix
   * for "over" is never the same as the fix for "under".
   */
  direction: 'over' | 'under';
}

export const CAMERA_EXPOSURE_STORAGE_KEY = 'cameraExposureCalculatorState_v1';
