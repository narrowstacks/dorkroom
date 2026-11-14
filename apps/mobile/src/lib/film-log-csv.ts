// Per-roll CSV export: one row per frame, for spreadsheets and EXIF tools.
// Pure, so it is tested outside the app; the file write and share sheet live in
// `film-log-share.ts`.
//
// Format rules:
// - No metadata preamble: EXIF tools want a clean header row. Roll-level facts
//   go in the file name (`csvFileName`), not the content.
// - RFC 4180: fields with a comma, quote, CR or LF are double-quoted with
//   quotes doubled; records end in CRLF; rows are sorted by frame number.
// - Spreadsheet formula injection: a text field that could be read as a formula
//   gets a leading apostrophe so Excel and Sheets read it as text. That is a
//   field starting with `=`, `@`, a tab or a CR, or with `+` or `-` directly
//   followed by a letter, `(` or `=` (`-SUM(A1)`, `+cmd`). Ordinary values such
//   as `-1 stop` or `+1 Main St` are left alone, since the apostrophe would
//   otherwise land in image metadata. Numbers are never affected: `Latitude` and
//   `Longitude` are plain decimals (6 places) and `Accuracy (m)` whole meters,
//   all empty when the frame has no location (or no known accuracy), so a leading minus is never guarded.
// - "Taken at" is local wall-clock time with an explicit offset (EXIF
//   `DateTimeOriginal` is local time). The capture time zone is not stored, so
//   a file exported in another zone shows that zone's local time.
// - Encoding is UTF-8 WITHOUT a byte order mark, on purpose: EXIF tools and
//   scripts read the first header cell literally, and a BOM can corrupt it. The
//   cost is that Excel opened by double-click may misread accented characters;
//   import the file through Excel's data import dialog (UTF-8) instead.
import { formatReciprocityTime, formatShutterSpeed } from '@dorkroom/logic';
import { rollLabel } from '@/lib/film-log-options';
import {
  formatAccuracyMeters,
  formatCoordinateNumber,
} from '@/lib/frame-location-format';
import type { FilmRoll, Shot } from '@/schemas/film-log.schema';

interface CsvNames {
  cameraName: string;
  lensName: (id: string | undefined) => string | undefined;
}

const FORMULA_PREFIX = /^(?:[=@\t\r]|[+-][A-Za-z(=])/;

function guard(text: string): string {
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

function quote(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

function textCell(value: string | undefined): string {
  return value ? quote(guard(value)) : '';
}

function numberCell(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '' : String(value);
}

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

/** `2026-11-13T15:04:05-08:00`: the wall-clock time at `offsetMinutes` from
 * UTC, written with that offset. Pure, so any offset can be tested. */
export function isoWithOffset(date: Date, offsetMinutes: number): string {
  const wall = new Date(date.getTime() + offsetMinutes * 60_000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  return (
    `${pad(wall.getUTCFullYear(), 4)}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}` +
    `T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Local time with the offset in force at that instant (right across DST). */
export function localIso(date: Date): string {
  return isoWithOffset(date, -date.getTimezoneOffset());
}

function takenAtCell(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? textCell(value) : localIso(date);
}

function shutterSeconds(shot: Shot): number | undefined {
  const value = shot.shutterSpeed;
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Number(value.toPrecision(6));
}

// Same split the app uses for a long time: from 60 s (as rounded to a tenth)
// minutes and seconds, below it the shutter dial's notation.
function shutterLabel(seconds: number): string {
  return Math.round(seconds * 10) / 10 >= 60
    ? formatReciprocityTime(seconds)
    : formatShutterSpeed(seconds);
}

interface Column {
  header: string;
  cell: (shot: Shot, roll: FilmRoll, names: CsvNames) => string;
}

// The one column table: it builds the header row and every data row, so the two
// cannot drift apart.
const COLUMNS: Column[] = [
  { header: 'Frame', cell: (shot) => numberCell(shot.frameNumber) },
  {
    header: 'Taken at (local ISO 8601)',
    cell: (shot) => takenAtCell(shot.takenAt),
  },
  { header: 'Aperture', cell: (shot) => numberCell(shot.aperture) },
  { header: 'Shutter (s)', cell: (shot) => numberCell(shutterSeconds(shot)) },
  {
    header: 'Shutter',
    cell: (shot) => {
      const seconds = shutterSeconds(shot);
      return seconds === undefined ? '' : textCell(shutterLabel(seconds));
    },
  },
  { header: 'ISO', cell: (_shot, roll) => numberCell(roll.iso) },
  {
    header: 'Lens',
    cell: (shot, _roll, names) => textCell(names.lensName(shot.lensId)),
  },
  { header: 'Place', cell: (shot) => textCell(shot.place) },
  // Plain decimals, never quoted or guarded: a leading minus is a number here.
  {
    header: 'Latitude',
    cell: (shot) => formatCoordinateNumber(shot.location?.latitude),
  },
  {
    header: 'Longitude',
    cell: (shot) => formatCoordinateNumber(shot.location?.longitude),
  },
  {
    header: 'Accuracy (m)',
    cell: (shot) => formatAccuracyMeters(shot.location?.accuracyMeters),
  },
  { header: 'Back', cell: (shot, roll) => textCell(shot.back ?? roll.back) },
  { header: 'Notes', cell: (shot) => textCell(shot.notes) },
];

export const CSV_HEADER = COLUMNS.map((column) => column.header);

export function rollToCsv(roll: FilmRoll, names: CsvNames): string {
  const shots = [...roll.shots].sort((a, b) => a.frameNumber - b.frameNumber);
  const records = [
    CSV_HEADER.map(quote).join(','),
    ...shots.map((shot) =>
      COLUMNS.map((column) => column.cell(shot, roll, names)).join(',')
    ),
  ];
  return `${records.join('\r\n')}\r\n`;
}

const MAX_FILE_NAME = 80;

const LETTER_FOLDS = new Map([
  ['ß', 'ss'],
  ['ø', 'o'],
  ['æ', 'ae'],
  ['đ', 'd'],
  ['ł', 'l'],
]);

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ßøæđł]/g, (letter) => LETTER_FOLDS.get(letter) ?? letter)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** e.g. `dorkroom-hp5-plus-nikon-fm2-2026-11-13.csv`: ASCII, lower case,
 * hyphenated, at most 80 characters (the roll and camera parts are trimmed,
 * never the date or extension). */
export function csvFileName(roll: FilmRoll, cameraName: string): string {
  const started = new Date(roll.startedAt);
  const date = Number.isNaN(started.getTime())
    ? undefined
    : localIso(started).slice(0, 10);
  const prefix = 'dorkroom-';
  const suffix = `${date ? `-${date}` : ''}.csv`;
  const room = MAX_FILE_NAME - prefix.length - suffix.length;
  const body = [slug(rollLabel(roll)), slug(cameraName)]
    .filter(Boolean)
    .join('-')
    .slice(0, room)
    .replace(/-+$/, '');
  if (!body) return `dorkroom-roll${suffix}`;
  return `${prefix}${body}${suffix}`;
}
