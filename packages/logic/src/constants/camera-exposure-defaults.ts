import type {
  EVPreset,
  StandardValue,
} from '../types/camera-exposure-calculator';

export const STANDARD_APERTURES: StandardValue[] = [
  { value: 1, label: 'f/1' },
  { value: 1.4, label: 'f/1.4' },
  { value: 2, label: 'f/2' },
  { value: 2.8, label: 'f/2.8' },
  { value: 4, label: 'f/4' },
  { value: 5.6, label: 'f/5.6' },
  { value: 8, label: 'f/8' },
  { value: 11, label: 'f/11' },
  { value: 16, label: 'f/16' },
  { value: 22, label: 'f/22' },
  { value: 32, label: 'f/32' },
  { value: 45, label: 'f/45' },
  { value: 64, label: 'f/64' },
];

export const STANDARD_SHUTTER_SPEEDS: StandardValue[] = [
  { value: 30, label: '30"' },
  { value: 15, label: '15"' },
  { value: 8, label: '8"' },
  { value: 4, label: '4"' },
  { value: 2, label: '2"' },
  { value: 1, label: '1"' },
  { value: 1 / 2, label: '1/2' },
  { value: 1 / 4, label: '1/4' },
  { value: 1 / 8, label: '1/8' },
  { value: 1 / 15, label: '1/15' },
  { value: 1 / 30, label: '1/30' },
  { value: 1 / 60, label: '1/60' },
  { value: 1 / 125, label: '1/125' },
  { value: 1 / 250, label: '1/250' },
  { value: 1 / 500, label: '1/500' },
  { value: 1 / 1000, label: '1/1000' },
  { value: 1 / 2000, label: '1/2000' },
  { value: 1 / 4000, label: '1/4000' },
  { value: 1 / 8000, label: '1/8000' },
];

export const STANDARD_ISOS: StandardValue[] = [
  { value: 25, label: 'ISO 25' },
  { value: 50, label: 'ISO 50' },
  { value: 100, label: 'ISO 100' },
  { value: 200, label: 'ISO 200' },
  { value: 400, label: 'ISO 400' },
  { value: 800, label: 'ISO 800' },
  { value: 1600, label: 'ISO 1600' },
  { value: 3200, label: 'ISO 3200' },
  { value: 6400, label: 'ISO 6400' },
  { value: 12800, label: 'ISO 12800' },
];

export const EV_PRESETS: EVPreset[] = [
  { ev: 16, label: 'Snow / Sand', description: 'Bright sun on snow or sand' },
  { ev: 15, label: 'Sunny 16', description: 'Bright sun, distinct shadows' },
  { ev: 14, label: 'Hazy Sun', description: 'Hazy sunlight, soft shadows' },
  { ev: 13, label: 'Slight Overcast', description: 'Barely visible shadows' },
  { ev: 12, label: 'Overcast', description: 'No shadows visible' },
  { ev: 11, label: 'Heavy Overcast', description: 'Dense cloud cover' },
  { ev: 10, label: 'Open Shade', description: 'Shade on a sunny day' },
  { ev: 9, label: 'Bright Indoor', description: 'Well-lit interior space' },
  { ev: 8, label: 'Indoor', description: 'Normal room lighting' },
  { ev: 7, label: 'Dim Indoor', description: 'Dim interior, lamps' },
  { ev: 5, label: 'Night Street', description: 'Well-lit night street' },
  { ev: 3, label: 'Dim Night', description: 'Dimly lit street or building' },
  { ev: 0, label: 'Deep Twilight', description: 'Just after sunset' },
  { ev: -2, label: 'Night Sky', description: 'Stars, moonlit landscape' },
];

export const DEFAULT_CAMERA_EXPOSURE_APERTURE = 8;
export const DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED = 1 / 125;
export const DEFAULT_CAMERA_EXPOSURE_ISO = 100;
