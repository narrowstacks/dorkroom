// Pure helpers behind the "log a frame" sheet: the shot it writes and the
// lines it shows. No native modules, so it is tested in `log-frame.test.ts`.
import {
  formatAperture,
  formatReciprocityTime,
  formatShutterSpeed,
  sanitizeText,
} from '@dorkroom/logic';
import { nextFrameNumber, rollLabel } from '@/lib/film-log-options';
import {
  formatCoordinatesCompact,
  isUsableLocation,
} from '@/lib/frame-location-format';
import { spokenDuration } from '@/lib/spoken-time';
import type {
  FilmRoll,
  Lens,
  Shot,
  ShotLocationFields,
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
 * last two trimmed and dropped when empty). A location is stored only when the
 * caller passes one with usable coordinates. ISO is a roll-level property, so
 * the reading's ISO is never written.
 */
export function buildLoggedShot(input: {
  roll: FilmRoll;
  reading: FrameReading;
  lensId?: string;
  place?: string;
  location?: ShotLocationFields;
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
  if (input.location && isUsableLocation(input.location)) {
    shot.location = input.location;
  }
  const notes = cleaned(input.notes, NOTES_MAX);
  if (notes) shot.notes = notes;
  if (input.photo) shot.photo = input.photo;
  return shot;
}

/**
 * What the sheet's Place row shows at medium: the place text, else the compact
 * coordinates when the frame has a location, else null (the row prompts).
 */
export function placeCardValue(
  place: string,
  location: ShotLocationFields | undefined
): string | null {
  const text = place.trim();
  if (text) return text;
  return location && isUsableLocation(location)
    ? formatCoordinatesCompact(location)
    : null;
}

/**
 * The Place row's VoiceOver label. It names the place, or says a location was
 * added, but never reads the coordinates.
 */
export function placeRowLabel(
  place: string,
  location: ShotLocationFields | undefined
): string {
  const text = place.trim();
  if (text) return `Place, ${text}`;
  return location && isUsableLocation(location)
    ? 'Place, not set, location added'
    : 'Place, not set';
}

/**
 * The lens chips: the lenses that fit the roll's camera, in their order, with
 * the lens that was selected when the sheet opened (`leadId`) moved first so
 * it is on screen however many lenses there are. Only the opening selection
 * leads: a chip the user taps stays where it is.
 */
export function lensChipOptions(
  lenses: readonly Lens[],
  leadId?: string
): { label: string; value: string; accessibilityLabel: string }[] {
  const lead = lenses.find((lens) => lens.id === leadId);
  const ordered = lead
    ? [lead, ...lenses.filter((lens) => lens !== lead)]
    : lenses;
  return ordered.map((lens) => ({
    label: lens.name,
    value: lens.id,
    accessibilityLabel: `Lens, ${lens.name}`,
  }));
}

/**
 * The lens that is selected: the picked id (at first the roll's last-used
 * lens) when it is still one of the camera's lenses, else none. A deleted
 * lens, or one that belongs to another body, is no pick.
 */
export function selectedLens(
  lenses: readonly Lens[],
  pickedId: string | undefined
): Lens | undefined {
  return pickedId === undefined
    ? undefined
    : lenses.find((lens) => lens.id === pickedId);
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
 * A shutter speed as the sheet shows it: `1/125`, `2"`, and from a minute (as
 * rounded for display) the way the Reciprocity readout does (`3m 8.3s`, not
 * `188.3"`).
 */
export function formatShutter(seconds: number): string {
  return Math.round(seconds * 10) / 10 >= 60
    ? formatReciprocityTime(seconds)
    : formatShutterSpeed(seconds);
}

const secondsWord = (n: string): string =>
  `${n} ${Number(n) === 1 ? 'second' : 'seconds'}`;

/** A shutter speed in words for VoiceOver: "1/125 second", "2 seconds",
 * "3 minutes 8.3 seconds". */
export function spokenShutter(seconds: number): string {
  const shown = formatShutter(seconds);
  // The shared formatter shows about 0.67 s to 1 s as "1/1"; say the time it
  // stands for instead (to a tenth, like the Reciprocity readout).
  if (shown === '1/1')
    return secondsWord(String(Math.round(seconds * 10) / 10));
  if (shown.includes('/')) return `${shown} second`;
  const plain = /^([\d.]+)"$/.exec(shown);
  if (plain?.[1] !== undefined) return secondsWord(plain[1]);
  return spokenDuration(shown);
}

/** The speed the subtitle names: the roll's EI, else the reading's own ISO
 * (EI for the Meter, which meters at the roll's EI; ISO for a calculator). */
function speedLabel(
  reading: FrameReading,
  roll: Pick<FilmRoll, 'iso'>,
  source: ReadingSource
): string | null {
  if (roll.iso !== undefined) return `EI ${roll.iso}`;
  if (reading.iso !== undefined) {
    return `${source === 'meter' ? 'EI' : 'ISO'} ${reading.iso}`;
  }
  return null;
}

/** What the sheet's readout shows, and the one sentence VoiceOver reads. */
export interface FrameReadout {
  /** The frame number as a figure, two digits at least: `08`. */
  figure: string;
  /** `f/8 · 1/125`, or null when the reading has neither. */
  exposure: string | null;
  /** `Ilford XP2 Super · Bessa R · EI 400`, leaving out what is unknown. */
  subtitle: string;
  /** `Frame 8, f/8 at 1/125 second, Ilford XP2 Super on Bessa R, EI 400`. */
  spoken: string;
}

/**
 * The readout at the top of the log sheet: the frame number, the exposure
 * (aperture and shutter, whichever the reading has) and a subtitle with the
 * roll (its name, else its film), the camera and the speed.
 */
export function frameReadout(input: {
  frameNumber: number;
  reading: FrameReading;
  source: ReadingSource;
  roll: Pick<FilmRoll, 'name' | 'filmStockName' | 'iso'>;
  cameraName: string | undefined;
}): FrameReadout {
  const { reading, roll, cameraName } = input;
  const aperture =
    reading.aperture === undefined ? null : formatAperture(reading.aperture);
  const shutter =
    reading.shutterSpeed === undefined
      ? null
      : formatShutter(reading.shutterSpeed);
  const spokenSpeed =
    reading.shutterSpeed === undefined
      ? null
      : spokenShutter(reading.shutterSpeed);
  const exposureParts = [aperture, shutter].filter(
    (part): part is string => part !== null
  );
  const spokenExposure =
    aperture && spokenSpeed
      ? `${aperture} at ${spokenSpeed}`
      : (aperture ?? spokenSpeed ?? 'no exposure');
  const label = rollLabel(roll);
  const speed = speedLabel(reading, roll, input.source);
  const subtitle = [label, cameraName, speed]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
  const spoken = [
    `Frame ${input.frameNumber}`,
    spokenExposure,
    cameraName ? `${label} on ${cameraName}` : label,
    speed,
  ]
    .filter((part): part is string => Boolean(part))
    .join(', ');
  return {
    figure: String(input.frameNumber).padStart(2, '0'),
    exposure: exposureParts.length > 0 ? exposureParts.join(' · ') : null,
    subtitle,
    spoken,
  };
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
