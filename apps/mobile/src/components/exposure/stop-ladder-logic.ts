import {
  calculateNewExposureTime,
  exactThirds,
  parseDecimalInput,
  roundToStandardPrecision,
  STOPS_MAX,
  STOPS_MIN,
} from '@dorkroom/logic';

export type LadderIncrementValue = 'third' | 'half' | 'whole';

export interface LadderIncrementOption {
  label: string;
  value: LadderIncrementValue;
  stops: number;
}

/** The step choices under the ladder; the first is the default. */
export const LADDER_INCREMENTS: readonly LadderIncrementOption[] = [
  { label: '⅓', value: 'third', stops: 1 / 3 },
  { label: '½', value: 'half', stops: 0.5 },
  { label: '1', value: 'whole', stops: 1 },
];

export interface StopLadderCell {
  /** The stops this cell stores, exactly as the calculator reads them back. */
  stops: number;
  /** The exposure time those stored stops give, in seconds. */
  seconds: number;
  /** Whether the entered stops are this cell. */
  selected: boolean;
  /** Whether tapping it gives a result: the stops are inside what the
   * calculator accepts and the time does not round to zero. */
  enabled: boolean;
}

export interface BuildStopLadderInput {
  baseSeconds: number;
  /** The entered stops, or `null` when there is no result: the ladder then
   * centres on zero and highlights nothing. */
  stops: number | null;
  increment: number;
}

/** How many cells either side of the centre. */
const LADDER_RADIUS = 2;

/** How near the entered stops must be to the centre cell to count as it. */
const SELECTED_TOLERANCE = 0.005;

/**
 * Stops as the text the calculator stores: at most two decimals, no trailing
 * zeros. The ladder writes it on a tap and the Stops scrub row writes it as
 * it drags.
 */
export const storedStopsText = (stops: number): string =>
  String(Number(stops.toFixed(2)));

/**
 * What the calculator reads back after `storedStopsText(stops)` is set: parsed
 * and rounded to the standard precision, as `useExposureCalculator.setStops`
 * does.
 */
export const storedStops = (stops: number): number =>
  roundToStandardPrecision(parseDecimalInput(storedStopsText(stops)));

/**
 * Five cells centred on the multiple of `increment` nearest the entered stops.
 * Each cell is the stops a tap would store and the time those stored stops
 * give through the calculator's own formula, so a cell never shows a time its
 * tap does not select (a third plus a half is 0.83 stored, not 0.8333). The
 * centre is highlighted only when the entered stops are really that value.
 */
export function buildStopLadder({
  baseSeconds,
  stops,
  increment,
}: BuildStopLadderInput): StopLadderCell[] {
  // `+ 0` turns a -0 from rounding a small negative into 0.
  const centre = Math.round((stops ?? 0) / increment) * increment + 0;
  const centreIsEntered =
    stops !== null && Math.abs(stops - centre) <= SELECTED_TOLERANCE;
  const cells: StopLadderCell[] = [];
  for (let k = -LADDER_RADIUS; k <= LADDER_RADIUS; k += 1) {
    const stored = storedStops(centre + k * increment);
    const seconds = calculateNewExposureTime(baseSeconds, stored);
    cells.push({
      stops: stored,
      seconds,
      selected: k === 0 && centreIsEntered,
      // A time that rounds to nothing is no result: the calculator would
      // store the stops and show none.
      enabled:
        stored >= STOPS_MIN &&
        stored <= STOPS_MAX &&
        roundToStandardPrecision(seconds) > 0,
    });
  }
  return cells;
}

const FRACTION_TOLERANCE = 0.0005;
const FRACTIONS = [
  { value: 0, glyph: '', spoken: '' },
  { value: 1 / 3, glyph: '⅓', spoken: 'one third' },
  { value: 0.5, glyph: '½', spoken: 'one half' },
  { value: 2 / 3, glyph: '⅔', spoken: 'two thirds' },
] as const;

/**
 * A stop count for display: "base" at zero; thirds and halves as glyphs with
 * a sign ("+⅓", "−⅔", "+1⅓", "+½"); anything else signed to two decimals.
 * Uses the real minus sign, like the Stepper.
 */
export function formatStopsLabel(stops: number): string {
  const rounded = Number(exactThirds(stops).toFixed(4));
  if (rounded === 0) return 'base';
  const sign = rounded < 0 ? '−' : '+';
  const abs = Math.abs(rounded);
  const whole = Math.floor(abs + FRACTION_TOLERANCE);
  const fraction = abs - whole;
  const match = FRACTIONS.find(
    (f) => Math.abs(fraction - f.value) <= FRACTION_TOLERANCE
  );
  if (match) {
    if (match.glyph === '') return `${sign}${whole}`;
    return `${sign}${whole > 0 ? whole : ''}${match.glyph}`;
  }
  return `${sign}${abs.toFixed(2)}`;
}

/** Spoken form of a ladder cell's stops, e.g. "plus one third stop". */
export function spokenStops(stops: number): string {
  const label = formatStopsLabel(stops);
  if (label === 'base') return 'base time';
  const sign = label.startsWith('−') ? 'minus' : 'plus';
  const body = label.slice(1);
  const fraction = FRACTIONS.find(
    (f) => f.glyph !== '' && body.includes(f.glyph)
  );
  if (!fraction) return `${sign} ${body} stop${body === '1' ? '' : 's'}`;
  const whole = body.replace(fraction.glyph, '');
  return whole
    ? `${sign} ${whole} and ${fraction.spoken} stops`
    : `${sign} ${fraction.spoken} stop`;
}

/**
 * The stops fact under the readout: "base" at zero, otherwise the signed label
 * with "stop" up to a whole one and "stops" beyond ("+⅓ stop", "+1 stop",
 * "+1⅓ stops", "−2 stops").
 */
export function formatStopsFact(stops: number): string {
  const label = formatStopsLabel(stops);
  if (label === 'base') return label;
  const magnitude = Math.abs(Number(exactThirds(stops).toFixed(4)));
  return `${label} ${magnitude <= 1 ? 'stop' : 'stops'}`;
}

/**
 * One font size for every cell, chosen from the longest time label so the five
 * cells match and none fills its width edge to edge.
 */
export function ladderFontSize(labels: readonly string[]): number {
  const longest = Math.max(0, ...labels.map((l) => l.length));
  if (longest <= 5) return 15;
  if (longest <= 6) return 14;
  if (longest <= 7) return 13;
  if (longest <= 8) return 12;
  return 11;
}
