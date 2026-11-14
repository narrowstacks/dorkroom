// One frame's row on a roll's page: the edge number, the exposure, the lens
// and place, and one spoken label. Pure, so the wording is tested.
import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
import { stacksRollRow } from '@/lib/film-log-list';
import { isUsableLocation } from '@/lib/frame-location-format';
import type { Shot } from '@/schemas/film-log.schema';

/** The number in the row's left column, like a negative's edge number: two
 * digits at least ("07", "36", "112"). */
export function frameNumberLabel(frameNumber: number): string {
  return String(frameNumber).padStart(2, '0');
}

export interface FrameRowText {
  number: string;
  /** "f/8 · 1/125", or "No exposure set". ISO is the roll's EI (a frame
   * stores none), so it is never repeated here. */
  exposure: string;
  /** Lens, back and place, as set; empty when none is. */
  detail: string;
  /** The first line of the frame's notes, or empty. */
  notes: string;
  located: boolean;
  fromMeter: boolean;
  /** Everything the row shows, glyphs included, as one VoiceOver label. Never
   * the coordinates. */
  accessibilityLabel: string;
}

export function frameRowText(
  shot: Pick<
    Shot,
    | 'frameNumber'
    | 'aperture'
    | 'shutterSpeed'
    | 'back'
    | 'place'
    | 'notes'
    | 'location'
    | 'source'
    | 'photo'
  >,
  lensName: string | undefined
): FrameRowText {
  const settings = [
    shot.aperture === undefined ? undefined : formatAperture(shot.aperture),
    shot.shutterSpeed === undefined
      ? undefined
      : formatShutterSpeed(shot.shutterSpeed),
  ].filter((part): part is string => Boolean(part));
  const exposure =
    settings.length > 0 ? settings.join(' · ') : 'No exposure set';
  const details = [
    lensName?.trim(),
    shot.back?.trim(),
    shot.place?.trim(),
  ].filter((part): part is string => Boolean(part));
  const notes = shot.notes?.trim().split(/\r?\n/)[0]?.trim() ?? '';
  const located = isUsableLocation(shot.location);
  const fromMeter = shot.source === 'meter';
  const hasPhoto = shot.photo !== undefined;
  const accessibilityLabel = [
    `Frame ${shot.frameNumber}`,
    ...(settings.length > 0 ? settings : [exposure]),
    ...details,
    notes || undefined,
    located ? 'has location' : undefined,
    fromMeter ? 'logged from the Meter' : undefined,
    hasPhoto ? 'has photo' : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  return {
    number: frameNumberLabel(shot.frameNumber),
    exposure,
    detail: details.join(' · '),
    notes,
    located,
    fromMeter,
    accessibilityLabel,
  };
}

/** The number column's width at a text size: three digits of the row's
 * number at 18pt, scaled with Dynamic Type, so rows stay aligned past frame
 * 99 and at the accessibility sizes. */
export const FRAME_NUMBER_COLUMN_WIDTH = 36;

export function frameNumberColumnWidth(fontScale: number): number {
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  return Math.ceil(FRAME_NUMBER_COLUMN_WIDTH * scale);
}

/** From the same text size a roll row stacks at, a frame row stacks too: the
 * number and glyphs on a first line, the text lines full width below, so the
 * fixed number column and the glyphs never squeeze the text into a strip. */
export function stacksFrameRow(fontScale: number): boolean {
  return stacksRollRow(fontScale);
}
