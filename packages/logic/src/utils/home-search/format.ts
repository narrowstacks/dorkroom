/**
 * Display formatting for home-search answers. Every number an answer shows
 * goes through here, so the units and rounding read the same in every card.
 */

import { officialTagMaker } from '../../constants/development-recipes';
import { toFractionInput } from '../../constants/mat-calculator';
import type { LengthUnit } from '../unit-conversion';
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

/**
 * Inches to the nearest 1/16, every fraction written the same way (a fraction
 * slash, never a glyph, since sixteenths have none): 4.625 -> "4 5⁄8".
 */
export function formatInches(inches: number): string {
  return toFractionInput(inches).replace('/', '⁄');
}

/**
 * A length someone typed, in inches: a fraction when it is on the 1/16 grid
 * (0.75 -> "3⁄4"), else the decimal as typed (1.45 -> "1.45"), never rounded.
 */
export function formatTypedInches(inches: number): string {
  return Math.abs(inches * 16 - Math.round(inches * 16)) < 1e-6
    ? formatInches(inches)
    : trimNumber(inches, 3);
}

/** One step of the grid a length is shown on, in inches: 1/16 in, 0.1 cm, 1 mm. */
const STEP_INCHES = {
  in: 1 / 16,
  cm: 0.1 / 2.54,
  mm: 1 / 25.4,
} as const satisfies Record<AnswerUnit, number>;

/** A length in inches rounded up to the next step `unit` shows. */
export function ceilLength(inches: number, unit: AnswerUnit): number {
  const step = STEP_INCHES[unit];
  // The tolerance keeps a value already on the grid where it is.
  return Math.ceil(inches / step - 1e-6) * step;
}

/** A length in inches written in `unit`, without the unit: cm to 0.1, mm whole. */
export function formatLength(inches: number, unit: AnswerUnit): string {
  const step = STEP_INCHES[unit];
  const steps = Math.round(inches / step);
  if (unit === 'mm') return String(steps);
  if (unit === 'cm') return trimNumber(steps / 10, 1);
  return formatInches(steps * step);
}

/** A length with its unit mark: `1 1⁄2″`, `3.8 cm`, `15 mm`. */
export function formatLengthWithUnit(inches: number, unit: AnswerUnit): string {
  const text = formatLength(inches, unit);
  return unit === 'in' ? `${text}″` : `${text} ${unit}`;
}

/**
 * Two lengths as a size, in the order given: "6×9", or "4 5⁄8 × 7" with
 * spaces once a side has a fraction, so the sign never reads as part of one.
 */
export function formatPair(a: number, b: number, unit: AnswerUnit): string {
  const sides = [formatLength(a, unit), formatLength(b, unit)];
  return sides.join(sides.some((side) => side.includes(' ')) ? ' × ' : '×');
}

/** A size pair, short side first: "4 5⁄8 × 7". */
export function formatSize(a: number, b: number, unit: AnswerUnit): string {
  return formatPair(Math.min(a, b), Math.max(a, b), unit);
}

/** Development minutes as a clock: 6.33 -> "6:20". */
export function formatClock(minutes: number): string {
  const total = Math.round(minutes * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * A time at darkroom precision: a tenth of a second under a minute ("15.1s",
 * "17.0s"), whole seconds from there ("3m 8s", "1h 2m").
 */
export function formatSeconds(seconds: number): string {
  if (Math.round(seconds * 10) < 600) return `${seconds.toFixed(1)}s`;
  const total = Math.round(seconds);
  const parts: [number, string][] = [
    [Math.floor(total / 3600), 'h'],
    [Math.floor((total % 3600) / 60), 'm'],
    [total % 60, 's'],
  ];
  return parts
    .filter(([n]) => n > 0)
    .map(([n, mark]) => `${n}${mark}`)
    .join(' ');
}

/**
 * A time someone typed, as typed under a minute ("12s", not "12.0s"), else
 * as `formatSeconds` writes it ("2m").
 */
export function formatTypedSeconds(seconds: number): string {
  return seconds < 60 ? `${trimNumber(seconds, 1)}s` : formatSeconds(seconds);
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

/**
 * A recipe's source as a fact: a fixed "View source" link, so a long URL or
 * host never widens the card. Only http(s) URLs link; anything else reads
 * "Not in source".
 */
export function sourceFact(source: string | null): HomeAnswerFact {
  const url = source?.trim();
  return url && /^https?:\/\/[^/?#\s]+/i.test(url)
    ? { ...fact('Source', 'View source'), href: url }
    : fact('Source', null);
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
