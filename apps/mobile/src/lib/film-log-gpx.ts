// Per-roll GPX export: one waypoint per located frame, for geotagging scans by
// time or by hand. Pure, so it is tested outside the app; the file write and
// share sheet live in `film-log-share.ts`, beside the CSV.
//
// Format rules:
// - GPX 1.1, waypoints only. Frames are separate exposures, not a recorded
//   path, so there is no `<trk>`.
// - Child elements follow the schema's order (`time`, `name`, `desc`). No
//   `<ele>`: the stored altitude is not the point here, and EXIF tools take it
//   from the waypoint only when present. Accuracy has no GPX 1.1 waypoint field
//   and no extension is invented for it (the CSV carries it).
// - `<time>` is UTC with a `Z` (geotagging tools match it to EXIF time), from
//   the frame's `takenAt`, else the fix's own `capturedAt`; omitted when
//   neither is a usable time.
// - `<desc>` mirrors the CSV's choice of fields, notes included because the
//   CSV exports them: aperture, shutter, ISO, lens, place, notes, one per line.
// - Coordinates are `toFixed(6)` with a `.` separator whatever the locale; a
//   longitude that rounds to 180 is written -180 (`longitudeType` is < 180).
// - Every text value is XML-escaped and stripped of characters XML 1.0 cannot
//   carry (control characters, lone surrogates, U+FFFE and U+FFFF).
import { formatAperture } from '@dorkroom/logic';
import { shutterText } from '@/lib/film-log-csv';
import { rollLabel } from '@/lib/film-log-options';
import {
  formatCoordinateNumber,
  isUsableLocation,
} from '@/lib/frame-location-format';
import type { FilmRoll, Shot } from '@/schemas/film-log.schema';

export interface GpxContext {
  lensName: (id: string | undefined) => string | undefined;
  /** When the file is made; the `<metadata>` time. */
  exportedAt: Date;
}

export interface RollGpx {
  gpx: string;
  /** How many frames became waypoints (frames without a location are skipped). */
  waypoints: number;
}

// XML 1.0's Char production: tab, LF, CR, and U+0020 to U+10FFFF except the
// surrogates and U+FFFE, U+FFFF. Iterating a string yields code points, so a
// lone surrogate arrives on its own and is dropped like any other.
function isXmlChar(codePoint: number): boolean {
  return (
    codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  );
}

function stripIllegalXml(text: string): string {
  let kept = '';
  for (const char of text) {
    if (isXmlChar(char.codePointAt(0) ?? 0)) kept += char;
  }
  return kept;
}

function escapeChar(char: string): string {
  switch (char) {
    case '&':
      return '&amp;';
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    case '"':
      return '&quot;';
    default:
      return '&apos;';
  }
}

/** Text safe inside an XML element or a quoted attribute. */
export function escapeXml(text: string): string {
  return stripIllegalXml(text).replace(/[&<>"']/g, escapeChar);
}

/** A longitude for `<wpt lon>`: 6 decimals, and GPX's `longitudeType` is
 * `[-180, 180)`, so one that rounds to 180 is written as -180 (the same
 * meridian). The CSV keeps its own value. */
export function gpxLongitude(value: number): string {
  const text = formatCoordinateNumber(value);
  return text === '180.000000' ? '-180.000000' : text;
}

/** `2026-11-13T23:04:05Z`: UTC, whole seconds. Undefined for an unusable time. */
export function gpxTime(value: string | Date | undefined): string | undefined {
  if (value === undefined) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function describeShot(shot: Shot, roll: FilmRoll, context: GpxContext): string {
  const lines: string[] = [];
  if (
    shot.aperture !== undefined &&
    Number.isFinite(shot.aperture) &&
    shot.aperture > 0
  ) {
    lines.push(`Aperture: ${formatAperture(shot.aperture)}`);
  }
  const shutter = shutterText(shot);
  if (shutter) lines.push(`Shutter: ${shutter}`);
  if (roll.iso !== undefined && Number.isFinite(roll.iso)) {
    lines.push(`ISO: ${roll.iso}`);
  }
  const lens = context.lensName(shot.lensId)?.trim();
  if (lens) lines.push(`Lens: ${lens}`);
  const place = shot.place?.trim();
  if (place) lines.push(`Place: ${place}`);
  const notes = shot.notes?.trim();
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join('\n');
}

function element(name: string, text: string | undefined): string[] {
  return text ? [`    <${name}>${escapeXml(text)}</${name}>`] : [];
}

/**
 * The roll as a GPX 1.1 document: a `<metadata>` block (the roll's name and
 * the export time) and one `<wpt>` per frame with a usable location, in frame
 * order. `shots` is usually `roll.shots`.
 */
export function buildRollGpx(
  roll: FilmRoll,
  shots: readonly Shot[],
  context: GpxContext
): RollGpx {
  const located = shots
    .filter((shot) => isUsableLocation(shot.location))
    .sort((a, b) => a.frameNumber - b.frameNumber);

  const waypoints = located.flatMap((shot) => {
    const location = shot.location;
    if (!location) return [];
    const lat = formatCoordinateNumber(location.latitude);
    const lon = gpxLongitude(location.longitude);
    return [
      `  <wpt lat="${lat}" lon="${lon}">`,
      ...element('time', gpxTime(shot.takenAt) ?? gpxTime(location.capturedAt)),
      ...element('name', `Frame ${shot.frameNumber}`),
      ...element('desc', describeShot(shot, roll, context)),
      '  </wpt>',
    ];
  });

  const metadataTime = gpxTime(context.exportedAt);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Dorkroom" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
    '  <metadata>',
    ...element('name', rollLabel(roll)),
    ...element('time', metadataTime),
    '  </metadata>',
    ...waypoints,
    '</gpx>',
  ];
  return { gpx: `${lines.join('\n')}\n`, waypoints: located.length };
}
