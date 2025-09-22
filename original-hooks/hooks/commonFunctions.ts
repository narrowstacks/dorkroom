/**
 * Utility helpers – optimised & type-safe
 * Author: narrowstacks
 */

///////////////////////
// Constants & helpers
///////////////////////

const TOLERANCE = 0.01; // 1 % tolerance for stop rounding
const BASE_PAPER_AREA = 20 * 24; // in²
const BASE_BLADE_THICKNESS = 2; // px (or whatever your UI unit is)

const SHUTTER_RE = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/; // e.g. “1/250”
const TIME_RE = /(\d+(?:\.\d+)?)(h|m|s)/gi; // matches “1h”, “30m”, “45s”

/////////////////////////
// Exposure calculations
/////////////////////////

export const calculateNewTime = (time: number, stopChange: number): number =>
  time * 2 ** stopChange; // newTime = oldTime * 2^Δstops

export const roundStops = (value: number): number => {
  const rounded = Math.round(value * 2) / 2; // nearest ½
  return Math.abs(rounded - value) <= TOLERANCE ? rounded : value;
};

//////////////////////////////
// Shutter-speed parse/format
//////////////////////////////

export const parseShutterSpeed = (speed: string): number => {
  const trimmed = speed.trim();
  const frac = SHUTTER_RE.exec(trimmed);
  if (frac) {
    const [, num, denom] = frac;
    const n = Number(num),
      d = Number(denom);
    if (d === 0) throw new RangeError("Denominator cannot be 0");
    return n / d;
  }
  const val = Number.parseFloat(trimmed);
  if (Number.isFinite(val)) return val;
  throw new TypeError(`Unrecognised shutter speed: “${speed}”`);
};

export const formatShutterSpeed = (seconds: number): string => {
  if (seconds >= 1) return seconds.toFixed(seconds % 1 ? 2 : 0);
  const reciprocal = Math.round(1 / seconds);
  return `1/${reciprocal}`;
};

////////////////////////
// EV (Exposure Value)
////////////////////////

export const calculateEV = (
  aperture: number,
  iso: number,
  speed: number,
): number => {
  const log2 = Math.log2;
  return log2(aperture ** 2) + log2(1 / speed) - log2(iso / 100);
};

////////////////////////
// Time formatting/parsing
////////////////////////

export const formatTime = (secondsTotal: number): string => {
  if (secondsTotal < 60) {
    return `${(Math.round(secondsTotal * 100) / 100).toLocaleString()}s`;
  }
  const minutesTotal = Math.floor(secondsTotal / 60);
  if (secondsTotal < 3600) {
    const secs = Math.round(secondsTotal % 60);
    return secs ? `${minutesTotal}m ${secs}s` : `${minutesTotal}m`;
  }
  const hours = Math.floor(secondsTotal / 3600);
  const mins = Math.round((secondsTotal % 3600) / 60);
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

export const parseTimeInput = (input: string): number | null => {
  let seconds = 0;
  let match: RegExpExecArray | null;

  TIME_RE.lastIndex = 0; // reset global regex state
  while ((match = TIME_RE.exec(input.toLowerCase().replace(/\s+/g, "")))) {
    const value = Number(match[1]);
    switch (match[2]) {
      case "h":
        seconds += value * 3600;
        break;
      case "m":
        seconds += value * 60;
        break;
      case "s":
        seconds += value;
        break;
    }
  }
  return seconds || null;
};

////////////////////////
// Generic helpers
////////////////////////

export const findClosestValue = <T extends string | number>(
  target: number,
  options: T[],
  toNumber: (t: T) => number = (t) =>
    typeof t === "number" ? t : Number.parseFloat(String(t)),
): T =>
  options.reduce((best, cur) =>
    Math.abs(toNumber(cur) - target) < Math.abs(toNumber(best) - target)
      ? cur
      : best,
  );

////////////////////////
// Border calculator
////////////////////////

export const calculateBladeThickness = (
  paperWidth: number,
  paperHeight: number,
  baseArea: number = BASE_PAPER_AREA,
  baseThickness: number = BASE_BLADE_THICKNESS,
): number => {
  const scale = baseArea / (paperWidth * paperHeight);
  const capped = scale > 2 ? 2 : scale;
  return Math.round(baseThickness * capped);
};
