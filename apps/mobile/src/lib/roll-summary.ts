// The words of a roll page's summary header: what is in the camera, the dates
// the roll really has, and the frame counts. Pure, so the copy is tested.
import { rollDateLabel } from '@/lib/film-log-list';
import { formatProcess } from '@/lib/film-log-options';
import { pushPullLabel } from '@/lib/roll-lifecycle';
import type { FilmRoll, RollStatus } from '@/schemas/film-log.schema';

/**
 * The first line: camera, the film when the page title is the roll's name (not
 * the film itself), EI with any push or pull, and the process.
 *
 * "Voigtlander Bessa R · EI 800 (Push +1) · B&W"
 */
export function rollSetupLine(
  roll: Pick<
    FilmRoll,
    'name' | 'filmStockName' | 'iso' | 'pushPull' | 'process'
  >,
  cameraName: string | undefined
): string {
  // The title is the film when the roll has no name, so the film is named
  // here only for a named roll; a roll with no film says so.
  const film = !roll.filmStockName
    ? 'No film set'
    : roll.name?.trim()
      ? roll.filmStockName
      : undefined;
  const push = pushPullLabel(roll.pushPull);
  const ei =
    roll.iso === undefined
      ? undefined
      : push
        ? `EI ${roll.iso} (${push})`
        : `EI ${roll.iso}`;
  return [cameraName ?? 'Unknown camera', film, ei, formatProcess(roll.process)]
    .filter(Boolean)
    .join(' · ');
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days, in local time, from `startedAt` to `now`: 0 on the day
 * it was loaded. Undefined for a date that does not parse or lies ahead.
 */
export function daysInCamera(startedAt: string, now: Date): number | undefined {
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return undefined;
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Rounded, so a day that is 23 or 25 hours long (a DST change) still counts one.
  const days = Math.round((today.getTime() - startDay.getTime()) / DAY_MS);
  return days < 0 ? undefined : days;
}

function dated(
  prefix: string,
  iso: string | undefined,
  now: Date,
  locale?: string
) {
  if (!iso) return undefined;
  const label = rollDateLabel(iso, now, locale);
  return label ? `${prefix} ${label}` : undefined;
}

/**
 * The second line, from the dates the roll stores: started, then how long a
 * loaded roll has been in the camera (from its second day), the day it was
 * marked shot, and the day it was developed. Empty when none parse.
 *
 * "Started Nov 1 · 12 days in camera", "Started Nov 1 · Shot Nov 13 · Developed Nov 20"
 */
export function rollDatesLine(
  roll: Pick<FilmRoll, 'status' | 'startedAt' | 'finishedAt' | 'development'>,
  now: Date,
  locale?: string
): string {
  const parts = [dated('Started', roll.startedAt, now, locale)];
  if (roll.status === 'active') {
    const days = daysInCamera(roll.startedAt, now);
    if (days !== undefined && days > 0) {
      parts.push(`${days} ${days === 1 ? 'day' : 'days'} in camera`);
    }
  } else {
    parts.push(dated('Shot', roll.finishedAt, now, locale));
  }
  if (roll.status === 'developed') {
    parts.push(dated('Developed', roll.development?.developedAt, now, locale));
  }
  return parts.filter(Boolean).join(' · ');
}

/** "3 with a location", or undefined when no frame has one. */
export function locatedCountLabel(located: number): string | undefined {
  return located > 0 ? `${located} with a location` : undefined;
}

/** The one sentence of a roll with no frames. A roll in the camera points at
 * the Meter shortcut in the summary above. */
export function noFramesMessage(status: RollStatus): string {
  return status === 'active'
    ? 'No frames yet. Add one by hand, or open the Meter and log it from there.'
    : 'No frames were logged on this roll.';
}

/** Whether the Meter shortcut shows: only for a roll in the camera, the only
 * rolls the Meter can log to. */
export function offersMeterShortcut(status: RollStatus): boolean {
  return status === 'active';
}

/** From this text size up (the accessibility sizes), the summary's side by
 * side pieces (the map thumbnail and the counts, the counts and Meter) stack. */
export const SUMMARY_STACK_FONT_SCALE = 1.5;

export function stacksSummary(fontScale: number): boolean {
  return fontScale >= SUMMARY_STACK_FONT_SCALE;
}

/** From this text size up (iOS XXL, about 1.2), the lifecycle track is a
 * column: its three labels and glyphs need about 320pt in a row, more than a
 * 375pt phone has inside the summary at those sizes. */
export const TRACK_STACK_FONT_SCALE = 1.2;

export function stacksLifecycleTrack(fontScale: number): boolean {
  return fontScale >= TRACK_STACK_FONT_SCALE;
}
