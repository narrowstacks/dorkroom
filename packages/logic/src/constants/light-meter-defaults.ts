/** Typical fixed aperture (f-number) of a modern iPhone main lens. */
export const DEFAULT_METER_APERTURE = 1.8;

/** User calibration offset in stops; 0 uses the raw camera reading. */
export const DEFAULT_METER_CALIBRATION_OFFSET = 0;

/** Number of recent EV samples to median-smooth over. */
export const METER_EV_SAMPLE_WINDOW = 8;

/** Practical shutter-speed range for flagging out-of-range solved results (seconds). */
export const METER_MIN_SHUTTER_SPEED = 1 / 8000;
export const METER_MAX_SHUTTER_SPEED = 30;
