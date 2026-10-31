/**
 * Lexing for home-search queries: the pieces every reader shares (times,
 * sizes, lengths, ISO, dilution, temperature). Each finder returns where it
 * matched, so a reader can blank what it has consumed and read the rest.
 */

import { parseMatInput } from '../../constants/mat-calculator';
import { parseReciprocityTime } from '../reciprocity-calculations';
import { roundTemperature, toCelsius } from '../temperature';
import { cmToInches, mmToInches } from '../unit-conversion';
import { type AnswerUnit, FRACTION_GLYPHS } from './format';

/** Each fraction glyph's value: '½' -> 0.5. */
const GLYPH_VALUES = new Map(
  [...FRACTION_GLYPHS].map(([fraction, glyph]): [string, number] => [
    glyph,
    parseMatInput(fraction),
  ])
);

/**
 * ISO paper sizes, in centimetres. The border calculator has no ISO presets,
 * so "a4" reads as the custom metric size it is.
 */
const ISO_PAPERS = new Map([
  ['a6', '10.5x14.8cm'],
  ['a5', '14.8x21cm'],
  ['a4', '21x29.7cm'],
  ['a3', '29.7x42cm'],
  ['a2', '42x59.4cm'],
]);
const ISO_PAPER_RE = new RegExp(
  String.raw`\b(?:${[...ISO_PAPERS.keys()].join('|')})\b`,
  'g'
);

/**
 * Lowercase and canonicalise a query: `×` to `x`, inch marks to ` in `,
 * fraction glyphs to decimals ("1½" -> "1.5"), the true minus to `-`, ISO
 * paper names to their size ("a4" -> "21x29.7cm").
 */
export function prepare(query: string): string {
  return query
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(ISO_PAPER_RE, (name) => ISO_PAPERS.get(name) ?? name)
    .replace(/[″"]/g, ' in ')
    .replace(/−/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(
      /(\d)\s*([½¼¾⅛⅜⅝⅞])/g,
      (_, digit: string, glyph: string) =>
        `${Number(digit) + (GLYPH_VALUES.get(glyph) ?? 0)}`
    )
    .replace(/[½¼¾⅛⅜⅝⅞]/g, (glyph) => `${GLYPH_VALUES.get(glyph) ?? ''}`)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Replace a matched span with spaces, keeping every other index in place. */
export function blank(text: string, index: number, length: number): string {
  return text.slice(0, index) + ' '.repeat(length) + text.slice(index + length);
}

/**
 * Collapse words to search tokens: "DD-X" -> "ddx", "Rodinal/Adonal" ->
 * "rodinal adonal", "HP5+" -> "hp5 plus".
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[-'’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * Pattern source for a mixed number, fraction or decimal ("1 1/4", "3/4",
 * ".5", "1.45"). `parseMatInput` reads what it matches.
 */
export const NUMBER_SOURCE = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+`;

export interface Span {
  index: number;
  length: number;
}

const TIME_RE = new RegExp(
  String.raw`(^|[^\w.,\/])((?:\d+(?:[.,]\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\s*)+)(?![a-z0-9])`
);

/** A duration ("12s", "2m", "1m30s", "1.5 min"), in seconds. */
export function findTime(text: string): (Span & { seconds: number }) | null {
  const match = TIME_RE.exec(text);
  if (!match) return null;
  const seconds = parseReciprocityTime(match[2]);
  if (seconds === null || !(seconds > 0)) return null;
  const index = match.index + match[1].length;
  return { index, length: match[2].trimEnd().length, seconds };
}

/** A size like "8x10", "24x30cm" or "6x4.5", read in the unit it was typed in. */
export interface Dims extends Span {
  /** First and second numbers as typed. */
  a: number;
  b: number;
  lo: number;
  hi: number;
  /** `lo`x`hi` as typed numbers, for table lookups ("4.5x6"). */
  key: string;
  unit: AnswerUnit;
  /** True when the unit came from the query rather than a default. */
  explicitUnit: boolean;
  /** Multiply by this to get inches. */
  toInches: number;
}

/** Metric paper sizes that need no unit to be read as centimetres. */
const CM_PAPERS = new Set([
  '13x18',
  '18x24',
  '24x30',
  '30x40',
  '40x50',
  '50x60',
]);

const UNIT_INCHES = {
  in: 1,
  cm: cmToInches(1),
  mm: mmToInches(1),
} as const satisfies Record<AnswerUnit, number>;

/**
 * Pattern source for a length unit word after a number ("mm", "cm", "in",
 * "inch", "inches"). `readUnit` reads what it matches.
 */
export const UNIT_SOURCE = String.raw`mm|cm|inch(?:es)?|in(?![a-z])`;

/** Read a unit word ("cm", "inches") as a length unit. */
export function readUnit(word: string | undefined): AnswerUnit | null {
  if (!word) return null;
  if (word === 'cm' || word === 'mm') return word;
  return word.startsWith('in') ? 'in' : null;
}

/** Inches in one `unit`. */
export function inchesPer(unit: AnswerUnit): number {
  return UNIT_INCHES[unit];
}

/** Every size in the query, in order. */
export function findDims(text: string): Dims[] {
  const re = new RegExp(
    String.raw`(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(${UNIT_SOURCE})?`,
    'g'
  );
  return [...text.matchAll(re)].map((match) => {
    const a = Number(match[1]);
    const b = Number(match[2]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}x${hi}`;
    const typed = readUnit(match[3]);
    const unit = typed ?? (CM_PAPERS.has(key) ? 'cm' : 'in');
    return {
      index: match.index,
      length: match[0].length,
      a,
      b,
      lo,
      hi,
      key,
      unit,
      explicitUnit: typed !== null,
      toInches: UNIT_INCHES[unit],
    };
  });
}

/** The shooting speed asked for: "at 800", "@1600", "ei 200", "iso 400". */
export function findIso(text: string): (Span & { iso: number }) | null {
  const match =
    /(?:@|\bat|\bei|\biso|\bpushed to|\brated)\s*(\d{2,5})(?![\d.]|\s*(?:mm|cm|x|s\b|m\b))/.exec(
      text
    );
  return match
    ? { index: match.index, length: match[0].length, iso: Number(match[1]) }
    : null;
}

/** The area of a size in square inches, for telling the bigger of two apart. */
export const areaSqIn = (d: Dims): number => d.lo * d.hi * d.toInches ** 2;

/**
 * Kodak's letter dilutions for HC-110 (and Ilford's for Ilfotec HC), as the
 * ratios the recipe data stores them in.
 */
const LETTER_DILUTIONS = new Map([
  ['a', '1:15'],
  ['b', '1:31'],
  ['c', '1:19'],
  ['d', '1:39'],
  ['e', '1:47'],
  ['f', '1:79'],
  ['g', '1:119'],
  ['h', '1:63'],
]);

/** The dilution asked for, as a ratio or "stock", with how it was written. */
export function findDilution(
  text: string
): (Span & { dilution: string; label: string }) | null {
  const ratio = /(^|[^\d.])(\d{1,2})\s*[+:]\s*(\d{1,3})(?![\d.])/.exec(text);
  if (ratio) {
    const value = `${ratio[2]}+${ratio[3]}`;
    return {
      index: ratio.index + ratio[1].length,
      length: ratio[0].length - ratio[1].length,
      dilution: value,
      label: value,
    };
  }
  const letter = /\bdil(?:ution)?\.?\s*([a-h])\b/.exec(text);
  const ratioForLetter = letter ? LETTER_DILUTIONS.get(letter[1]) : undefined;
  if (letter && ratioForLetter) {
    return {
      index: letter.index,
      length: letter[0].length,
      dilution: ratioForLetter,
      label: `dilution ${letter[1].toUpperCase()}`,
    };
  }
  const stock = /\bstock\b/.exec(text);
  return stock
    ? {
        index: stock.index,
        length: stock[0].length,
        dilution: 'stock',
        label: 'stock',
      }
    : null;
}

/** A development temperature, read into Celsius: "24c", "20 °c", "75f". */
export function findTemperature(
  text: string
): (Span & { celsius: number }) | null {
  const match = /(^|[^\d.])(\d{2,3}(?:\.\d)?)\s*°?\s*([cf])(?![\w/])/.exec(
    text
  );
  if (!match) return null;
  const value = Number(match[2]);
  return {
    index: match.index + match[1].length,
    length: match[0].length - match[1].length,
    celsius: match[3] === 'f' ? roundTemperature(toCelsius(value)) : value,
  };
}
