/**
 * Turn the calculators' compact display strings into text a screen reader
 * speaks naturally, for `ResultAnnouncer` messages. Display shorthand such as
 * `40s`, `2"` or `13.00in` is read as "40 s", "2 quote" or "13.00 in" by some
 * screen readers, so the announcement spells the unit out instead.
 *
 * Each helper takes the already formatted display value, so the spoken text
 * always carries the same number (and the same measurement unit preference)
 * as the screen.
 */

type UnitNames = readonly [singular: string, plural: string];

/** Exactly one ("1", "1.00") is singular; "1.5" and "1 1/2" are plural. */
function withUnit(value: string, [singular, plural]: UnitNames): string {
  return `${value} ${Number(value) === 1 ? singular : plural}`;
}

const TIME_UNITS = new Map<string, UnitNames>([
  ['h', ['hour', 'hours']],
  ['m', ['minute', 'minutes']],
  ['s', ['second', 'seconds']],
]);

/** "40s" → "40 seconds", "1m 20s" → "1 minute 20 seconds", "2h" → "2 hours". */
export function spokenDuration(display: string): string {
  return display.replace(
    /(\d+(?:\.\d+)?)\s*([hms])\b/g,
    (match: string, value: string, unit: string) => {
      const names = TIME_UNITS.get(unit);
      return names ? withUnit(value, names) : match;
    }
  );
}

/** `2"` → "2 seconds", "1/60" → "1/60 second". */
export function spokenShutterSpeed(display: string): string {
  const seconds = /^(\d+(?:\.\d+)?)"$/.exec(display);
  if (seconds?.[1]) return withUnit(seconds[1], ['second', 'seconds']);
  if (/^1\/\d+$/.test(display)) return `${display} second`;
  return display;
}

const LENGTH_UNITS = new Map<string, UnitNames>([
  ['"', ['inch', 'inches']],
  ['″', ['inch', 'inches']],
  ['in', ['inch', 'inches']],
  ['cm', ['centimeter', 'centimeters']],
  ['mm', ['millimeter', 'millimeters']],
]);

/**
 * `14 1/2"` → "14 1/2 inches", "13.00in" → "13.00 inches",
 * "19.1cm" → "19.1 centimeters", "50mm" → "50 millimeters".
 */
export function spokenLength(display: string): string {
  const match = /^(.*?)\s*("|″|in|cm|mm)$/.exec(display);
  const value = match?.[1];
  const units = match?.[2] ? LENGTH_UNITS.get(match[2]) : undefined;
  if (!value || !units) return display;
  return withUnit(value, units);
}

/** 2 → "plus 2 stops", "-1.06" → "minus 1.06 stops", 1 → "plus 1 stop", 0 → "0 stops". */
export function spokenStops(stops: number | string): string {
  const text = String(stops).trim();
  const magnitude = text.replace(/^[+-]/, '');
  const amount = Number(magnitude);
  const sign =
    amount === 0 || !Number.isFinite(amount)
      ? ''
      : text.startsWith('-')
        ? 'minus '
        : 'plus ';
  return `${sign}${magnitude} ${amount === 1 ? 'stop' : 'stops'}`;
}
