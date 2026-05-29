/**
 * Mat Cut Calculator
 *
 * Domain logic and constants for the single-window mat calculator. Inputs are
 * fraction-friendly strings (e.g. "3 1/2") because that is how matting work is
 * measured in the shop; helpers here parse and format those values.
 */

export const MAT_CALCULATOR_STORAGE_KEY = 'matCalculatorState_v1';

export interface MatBorders {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MatPreset {
  label: string;
  w: number;
  h: number;
}

/** Common pre-cut mat board / frame sizes (inches). */
export const MAT_PRESETS: readonly MatPreset[] = [
  { label: '8×10', w: 8, h: 10 },
  { label: '11×14', w: 11, h: 14 },
  { label: '16×20', w: 16, h: 20 },
  { label: '18×24', w: 18, h: 24 },
  { label: '20×24', w: 20, h: 24 },
  { label: '24×30', w: 24, h: 30 },
];

/** Default form values (strings so fraction entry round-trips through state). */
export const MAT_CALCULATOR_DEFAULTS = {
  outerW: '16',
  outerH: '20',
  borderTop: '3',
  borderBottom: '3 1/2',
  borderLeft: '2 3/4',
  borderRight: '2 3/4',
  artW: '11',
  artH: '14',
  reveal: '1/4',
  bottomWeight: false,
};

export type MatCalculatorState = typeof MAT_CALCULATOR_DEFAULTS;

/**
 * Parse a measurement string into inches. Accepts decimals ("1.5"),
 * simple fractions ("1/4") and mixed numbers ("1 1/2"). Returns NaN
 * for empty or unparseable input.
 */
export function parseMatInput(str: string | number): number {
  if (typeof str === 'number') return str;
  if (str === '' || str == null) return NaN;
  const s = String(str).trim();
  const mixed = s.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (mixed)
    return parseFloat(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const fraction = s.match(/^(\d+)\/(\d+)$/);
  if (fraction) return parseInt(fraction[1]) / parseInt(fraction[2]);
  return parseFloat(s);
}

/**
 * Render a decimal as a fraction string rounded to the nearest 1/`denom`,
 * with a trailing inch mark (e.g. 3.5 → `3 1/2"`).
 */
export function toFraction(decimal: number, denom = 16): string {
  if (isNaN(decimal) || decimal < 0) return '';
  const whole = Math.floor(decimal + 1e-9);
  const frac = decimal - whole;
  let numer = Math.round(frac * denom);
  let d = denom;
  if (numer >= d) return `${whole + 1}"`;
  if (numer === 0) return `${whole}"`;
  while (numer % 2 === 0 && d % 2 === 0) {
    numer /= 2;
    d /= 2;
  }
  return whole === 0 ? `${numer}/${d}"` : `${whole} ${numer}/${d}"`;
}

/** Same as toFraction but without the trailing inch mark, for input fields. */
export function toFractionInput(decimal: number, denom = 16): string {
  return toFraction(decimal, denom).replace(/"$/, '');
}

/** Build a formatter that renders inches as a nearest-1/16 fraction. */
export function makeMatFormatter(valid: boolean) {
  return (v: number): string => {
    if (!valid || isNaN(v)) return '· · ·';
    return toFraction(v);
  };
}

/** Extra bottom border (optical centering) scaled to the total vertical border. */
export function bottomWeightFor(vTotal: number): number {
  if (vTotal > 12) return 1;
  if (vTotal > 8) return 0.75;
  if (vTotal > 4) return 0.5;
  return 0.25;
}

/**
 * Compute borders that center the artwork in the outer mat, optionally
 * bottom-weighting the vertical split for optical center. `rev` is the reveal
 * (how far the mat overlaps the art per side). Returns null when the artwork
 * plus reveal cannot fit inside the outer mat.
 */
export function bestFitBorders(
  ow: number,
  oh: number,
  aw: number,
  ah: number,
  rev: number,
  bottomWeight: boolean
): MatBorders | null {
  const winW = aw - 2 * rev;
  const winH = ah - 2 * rev;
  const hTotal = ow - winW;
  const vTotal = oh - winH;
  if (winW <= 0 || winH <= 0 || hTotal <= 0 || vTotal <= 0) return null;
  const weight = bottomWeight ? Math.min(bottomWeightFor(vTotal), vTotal) : 0;
  const left = hTotal / 2;
  const right = hTotal / 2;
  const top = (vTotal - weight) / 2;
  const bottom = (vTotal + weight) / 2;
  return { top, bottom, left, right };
}
