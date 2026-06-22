/** Which setting the user fixes; the meter solves the other. */
export type MeterPriority = 'aperture' | 'shutter';

export interface LightMeterSolution {
  /** Aperture f-number (locked in aperture-priority, solved in shutter-priority). */
  aperture: number;
  /** Shutter speed in seconds (locked in shutter-priority, solved in aperture-priority). */
  shutterSpeed: number;
  /** Formatted label for the solved (non-locked) value, e.g. "1/125" or "f/5.6". */
  solvedLabel: string;
  /** True when the solved shutter falls outside the practical range. */
  outOfRange: boolean;
  /** False when the EV input or settings are invalid. */
  isValid: boolean;
}
