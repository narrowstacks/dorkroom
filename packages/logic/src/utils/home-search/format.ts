/**
 * Display formatting for home-search answers. Every number an answer shows
 * goes through here, so the units and rounding read the same in every card.
 */

import { officialTagMaker } from '../../constants/development-recipes';
import { toFractionInput } from '../../constants/mat-calculator';
import { inchesToCm, inchesToMm, type LengthUnit } from '../unit-conversion';
import type { HomeAnswerFact } from './types';

/** A labelled value on an answer card; a null value reads "Not in source". */
export const fact = (
  label: string,
  value: string | null,
  detail: string | null = null
): HomeAnswerFact =>
  value
    ? { label, value, detail, missing: false }
    : { label, value: 'Not in source', detail: null, missing: true };

/** A length unit an answer is written in. */
export type AnswerUnit = Extract<LengthUnit, 'in' | 'cm' | 'mm'>;

/** Inch fractions people type as single glyphs, by the fraction they stand for. */
export const FRACTION_GLYPHS: ReadonlyMap<string, string> = new Map([
  ['1/8', '⅛'],
  ['1/4', '¼'],
  ['3/8', '⅜'],
  ['1/2', '½'],
  ['5/8', '⅝'],
  ['3/4', '¾'],
  ['7/8', '⅞'],
]);

/** Trim a number to `decimals` places, dropping trailing zeros: 1.50 -> "1.5". */
export function trimNumber(value: number, decimals = 2): string {
  return String(Number(value.toFixed(decimals)) + 0);
}

/** "+1.5" / "−0.5" / "0": a signed number with a true minus sign. */
export function signed(value: number, decimals = 2): string {
  const text = trimNumber(Math.abs(value), decimals);
  if (text === '0') return '0';
  return `${value < 0 ? '−' : '+'}${text}`;
}

/** Inches to the nearest 1/16, with fraction glyphs: 4.625 -> "4⅝", 2.0625 -> "2 1⁄16". */
export function formatInches(inches: number): string {
  return toFractionInput(inches).replace(
    /(^| )(\d+)\/(\d+)$/,
    (_, space: string, n: string, d: string) =>
      FRACTION_GLYPHS.get(`${n}/${d}`) ?? `${space}${n}⁄${d}`
  );
}

/**
 * A length someone typed, in inches: a fraction when it is on the 1/16 grid
 * (0.75 -> "¾"), else the decimal as typed (1.45 -> "1.45"), never rounded.
 */
export function formatTypedInches(inches: number): string {
  return Math.abs(inches * 16 - Math.round(inches * 16)) < 1e-6
    ? formatInches(inches)
    : trimNumber(inches, 3);
}

/** A length in inches written in `unit`, without the unit: cm to 0.1, mm whole. */
export function formatLength(inches: number, unit: AnswerUnit): string {
  if (unit === 'mm') return String(Math.round(inchesToMm(inches)));
  if (unit === 'cm') return trimNumber(inchesToCm(inches), 1);
  return formatInches(inches);
}

/** A length with its unit mark: `1½″`, `3.8 cm`, `15 mm`. */
export function formatLengthWithUnit(inches: number, unit: AnswerUnit): string {
  const text = formatLength(inches, unit);
  return unit === 'in' ? `${text}″` : `${text} ${unit}`;
}

/** A size pair, short side first: "4⅝×7". */
export function formatSize(a: number, b: number, unit: AnswerUnit): string {
  return `${formatLength(Math.min(a, b), unit)}×${formatLength(Math.max(a, b), unit)}`;
}

/** Development minutes as a clock: 6.33 -> "6:20". */
export function formatClock(minutes: number): string {
  const total = Math.round(minutes * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * A size written so it can be typed back into the box: "8x10", "24x30cm".
 * Inches get no unit unless the query gave one (a bare "13x18" reads as cm).
 */
export function formatTypedDims(d: {
  a: number;
  b: number;
  unit: AnswerUnit;
  explicitUnit: boolean;
}): string {
  const unit = d.explicitUnit || d.unit !== 'in' ? d.unit : '';
  return `${trimNumber(d.a, 3)}x${trimNumber(d.b, 3)}${unit}`;
}

/** A dimension pair as typed, with a multiplication sign: "11×14", "24×30 cm". */
export function formatDims(a: number, b: number, unit: AnswerUnit): string {
  return `${trimNumber(a, 3)}×${trimNumber(b, 3)}${unit === 'in' ? '' : ` ${unit}`}`;
}

/** A recipe's shooting speed relative to box speed. */
export function formatPushPull(stops: number): string {
  if (Math.abs(stops) < 0.05) return 'box speed';
  return `${stops > 0 ? 'push' : 'pull'} ${signed(stops, 1)}`;
}

/** The host of a source URL ("ilfordphoto.com"), or null when it is not a URL. */
export function sourceDomain(source: string | null): string | null {
  if (!source) return null;
  const match = /^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(source.trim());
  return match ? match[1].toLowerCase() : null;
}

/** "Official Ilford" for a recipe tagged `official-ilford`, else "Community". */
export function recipeSourceLabel(tags: readonly string[] | null): string {
  const maker = tags?.map(officialTagMaker).find((m) => m !== null);
  return maker ? `Official ${maker}` : 'Community';
}

/** "1 recipe" / "3 recipes". */
export function plural(count: number, noun: string): string {
  return `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : 's'}`;
}
