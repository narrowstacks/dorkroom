import type { ReciprocityFilmType } from '../types/reciprocity';

export const RECIPROCITY_FILM_TYPES: ReciprocityFilmType[] = [
  { label: 'Kodak Tri-X 400', value: 'tri-x', factor: 1.54 },
  { label: 'Kodak T-Max 100', value: 'tmax100', factor: 1.15 },
  { label: 'Kodak T-Max 400', value: 'tmax400', factor: 1.24 },
  { label: 'Ilford HP5+', value: 'hp5', factor: 1.31 },
  { label: 'Ilford Delta 100', value: 'delta100', factor: 1.26 },
  { label: 'Ilford Delta 400', value: 'delta400', factor: 1.41 },
  { label: 'Ilford Delta 3200', value: 'delta3200', factor: 1.33 },
  { label: 'Ilford FP4+', value: 'fp4', factor: 1.26 },
  { label: 'Ilford Ortho+', value: 'ortho', factor: 1.25 },
  { label: 'Ilford Pan F+', value: 'panf', factor: 1.33 },
  { label: 'Ilford SFX', value: 'sfx', factor: 1.43 },
  { label: 'Ilford XP2', value: 'xp2', factor: 1.31 },
  { label: 'Kentmere 100', value: 'kentmere100', factor: 1.26 },
  { label: 'Kentmere 400', value: 'kentmere400', factor: 1.3 },
  { label: 'Custom', value: 'custom' },
];

// Common exposure time presets in seconds
export const RECIPROCITY_EXPOSURE_PRESETS = [1, 2, 4, 8, 15, 30, 60, 120, 240];
