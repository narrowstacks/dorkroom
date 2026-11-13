// Pure helpers behind the "log a frame" sheet: the shot it writes and the
// lines it shows. No native modules, so it is tested in `log-frame.test.ts`.
import {
  formatAperture,
  formatReciprocityTime,
  formatShutterSpeed,
  sanitizeText,
} from '@dorkroom/logic';
import { nextFrameNumber, rollLabel } from '@/lib/film-log-options';
import type {
  FilmRoll,
  Lens,
  Shot,
  ShotPhoto,
} from '@/schemas/film-log.schema';

/** What the meter or a calculator measured for a frame. Every part is optional. */
export interface FrameReading {
  aperture?: number;
  /** Seconds. */
  shutterSpeed?: number;
  /** The ISO the reading was solved for (not necessarily the roll's EI). */
  iso?: number;
}

const PLACE_MAX = 200;
const NOTES_MAX = 2000;

function cleaned(text: string | undefined, max: number): string | undefined {
  const value = sanitizeText(text, max).trim();
  return value === '' ? undefined : value;
}

/**
 * The shot to store for a reading on a roll: the next frame number, the
 * reading's aperture and shutter, and the sheet's lens, place and notes (the
 * last two trimmed and dropped when empty). ISO is a roll-level property, so
 * the reading's ISO is never written.
 */
export function buildLoggedShot(input: {
  roll: FilmRoll;
  reading: FrameReading;
  lensId?: string;
  place?: string;
  notes?: string;
  photo?: ShotPhoto;
  source: 'meter' | 'manual';
  now: Date;
}): Omit<Shot, 'id'> {
  const { roll, reading } = input;
  const shot: Omit<Shot, 'id'> = {
    frameNumber: nextFrameNumber(roll.shots),
    source: input.source,
    takenAt: input.now.toISOString(),
  };
  if (reading.aperture !== undefined) shot.aperture = reading.aperture;
  if (reading.shutterSpeed !== undefined) {
    shot.shutterSpeed = reading.shutterSpeed;
  }
  if (input.lensId) shot.lensId = input.lensId;
  const place = cleaned(input.place, PLACE_MAX);
  if (place) shot.place = place;
  const notes = cleaned(input.notes, NOTES_MAX);
  if (notes) shot.notes = notes;
  if (input.photo) shot.photo = input.photo;
  return shot;
}

const positive = (n: number): number | undefined =>
  Number.isFinite(n) && n > 0 ? n : undefined;

/** A reading from calculator values, leaving out any that is not a positive number. */
export function readingFromValues(values: {
  aperture?: number;
  shutterSpeed?: number;
  iso?: number;
}): FrameReading {
  const reading: FrameReading = {};
  const aperture =
    values.aperture === undefined ? undefined : positive(values.aperture);
  const shutterSpeed =
    values.shutterSpeed === undefined
      ? undefined
      : positive(values.shutterSpeed);
  const iso = values.iso === undefined ? undefined : positive(values.iso);
  if (aperture !== undefined) reading.aperture = aperture;
  if (shutterSpeed !== undefined) reading.shutterSpeed = shutterSpeed;
  if (iso !== undefined) reading.iso = iso;
  return reading;
}

/** Where a reading came from: the Meter (pinned to the roll's EI) or a calculator. */
export type ReadingSource = 'meter' | 'manual';

/**
 * `f/8 · 1/125 · EI 800`, leaving out whatever the reading lacks. A meter
 * reading is at the roll's exposure index, so it says EI; a calculator's is
 * just an ISO.
 */
export function formatReading(
  reading: FrameReading,
  source: ReadingSource
): string {
  const parts: string[] = [];
  if (reading.aperture !== undefined) {
    parts.push(formatAperture(reading.aperture));
  }
  if (reading.shutterSpeed !== undefined) {
    // A minute or more (as rounded for display) reads as the Reciprocity readout does (3m 8.3s), not 188.3".
    parts.push(
      Math.round(reading.shutterSpeed * 10) / 10 >= 60
        ? formatReciprocityTime(reading.shutterSpeed)
        : formatShutterSpeed(reading.shutterSpeed)
    );
  }
  if (reading.iso !== undefined) {
    parts.push(`${source === 'meter' ? 'EI' : 'ISO'} ${reading.iso}`);
  }
  return parts.join(' · ');
}

/** `HP5+ @ 800 · Nikon FM2`: the roll, its rated EI and its camera, when known. */
export function rollSummary(
  roll: Pick<FilmRoll, 'name' | 'filmStockName' | 'iso'>,
  cameraName: string | undefined
): string {
  const film =
    roll.iso !== undefined
      ? `${rollLabel(roll)} @ ${roll.iso}`
      : rollLabel(roll);
  return cameraName ? `${film} · ${cameraName}` : film;
}

/** A note when the reading was solved for a different ISO than the roll's EI. */
export function isoMismatchNote(
  reading: FrameReading,
  roll: Pick<FilmRoll, 'iso'>,
  source: ReadingSource
): string | null {
  if (
    reading.iso === undefined ||
    roll.iso === undefined ||
    reading.iso === roll.iso
  ) {
    return null;
  }
  const verb = source === 'meter' ? 'Metered at' : 'Worked out for';
  return `${verb} ISO ${reading.iso}; this roll is rated EI ${roll.iso}.`;
}

/** True when lenses exist but none is picked: the frame cannot be logged yet. */
export function needsLens(
  lenses: readonly Lens[],
  lensId: string | undefined
): boolean {
  return lenses.length > 0 && !lensId;
}
