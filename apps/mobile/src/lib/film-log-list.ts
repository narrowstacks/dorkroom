// The Film Log list's words: the stats caption, which empty state to show, and
// each roll row's text and spoken label. Pure, so the wording is tested.
import type {
  FilmLogStats,
  RollFilter,
  TopEntry,
} from '@/lib/film-log-collection';
import {
  frameCountDisplay,
  frameCountLabel,
  joinFacts,
  keepTogether,
  rollLabel,
  rollStatusLabel,
} from '@/lib/film-log-options';
import type { FilmRoll } from '@/schemas/film-log.schema';

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export { frameCountLabel };

/** A "most shot" claim needs a clear winner: two rolls or more, and no tie. */
function clearWinner(entry: TopEntry | undefined): string | undefined {
  return entry && entry.rolls >= 2 && !entry.tied ? entry.name : undefined;
}

/** Below this many rolls the caption only repeats the rows, so it is hidden. */
export const CAPTION_MIN_ROLLS = 3;

/**
 * The one caption line under the chips, from `filmLogStats`: this year's rolls
 * and frames (by start date), then, as two separate all-time facts, the most
 * shot film and the most used camera when one clearly leads. They are counted
 * apart, so the line never pairs them. Null below `CAPTION_MIN_ROLLS` rolls.
 *
 * "2026: 9 rolls, 23 frames. All time, most shot: HP5 Plus; most used camera: FM2."
 */
export function filmLogCaption(
  stats: FilmLogStats,
  year: number,
  totalRolls: number
): string | null {
  if (totalRolls < CAPTION_MIN_ROLLS) return null;
  const yearPart =
    stats.rollsThisYear === 0
      ? `No rolls started in ${year} yet.`
      : `${year}: ${plural(stats.rollsThisYear, 'roll')}, ${frameCountDisplay(stats.framesThisYear)}.`;
  const film = clearWinner(stats.topFilm);
  const camera = clearWinner(stats.topCamera);
  const facts = [
    film ? `most shot: ${film}` : null,
    camera ? `most used camera: ${camera}` : null,
  ].filter(Boolean);
  return facts.length > 0
    ? `${yearPart} All time, ${facts.join('; ')}.`
    : yearPart;
}

/**
 * The hint under the first-roll empty state. A new roll needs a camera (the
 * roll form sends you to Cameras & lenses without one), so with none it says
 * to add one first; otherwise it only says where they live.
 */
export function firstRollHint(cameraCount: number): string {
  return cameraCount === 0
    ? 'Add your cameras and lenses first, in the More menu.'
    : 'Your cameras and lenses are in the More menu.';
}

type NarrowFilter = Exclude<RollFilter, 'all'>;

const NO_MATCH_TEXT = {
  'in-camera': 'No rolls in camera right now.',
  'to-develop': 'No rolls to develop.',
  'this-year': 'No rolls started this year.',
} satisfies Record<NarrowFilter, string>;

export type FilmLogEmptyState =
  | { kind: 'none' }
  | { kind: 'first-roll' }
  | { kind: 'no-match'; filter: NarrowFilter; message: string };

/**
 * Which empty state the list shows: the guided first-roll state when there are
 * no rolls at all (whatever the filter, a link may open on one), a one-line
 * message naming the filter when it hides every roll, else none.
 */
export function filmLogEmptyState(
  totalRolls: number,
  filter: RollFilter,
  visibleCount: number
): FilmLogEmptyState {
  if (totalRolls === 0) return { kind: 'first-roll' };
  if (visibleCount > 0 || filter === 'all') return { kind: 'none' };
  return { kind: 'no-match', filter, message: NO_MATCH_TEXT[filter] };
}

/** The roll's start date for its row: "Nov 1", with the year when it is not
 * the current one ("Oct 2, 2025"); empty when the date does not parse. */
export function rollDateLabel(
  startedAt: string,
  now: Date,
  locale?: string
): string {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return '';
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

export interface RollRowText {
  title: string;
  /** Camera, film (when the title is a name), EI and frame count. */
  detail: string;
  status: string;
  /** Everything above and the date, as one VoiceOver label. */
  accessibilityLabel: string;
}

/**
 * A roll row's text. `cameraName` is undefined when the camera was deleted:
 * the row then leaves it out rather than say "Unknown camera".
 */
export function rollRowText(
  roll: Pick<FilmRoll, 'name' | 'filmStockName' | 'iso' | 'shots' | 'status'>,
  cameraName: string | undefined,
  dateLabel: string
): RollRowText {
  const title = rollLabel(roll);
  const named = Boolean(roll.name?.trim());
  const film = named ? roll.filmStockName : undefined;
  const ei = roll.iso === undefined ? undefined : `EI ${roll.iso}`;
  const frames = frameCountLabel(roll.shots.length);
  const status = rollStatusLabel(roll.status);
  // "EI 400" and "3 frames" never break inside, so a long detail line wraps
  // between facts ("0" alone at a line end read as a broken row).
  const detail = joinFacts([
    cameraName,
    film,
    ei && keepTogether(ei),
    keepTogether(frames),
  ]);
  const accessibilityLabel = [
    title,
    film,
    status,
    cameraName,
    ei,
    frames,
    dateLabel ? `started ${dateLabel}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  return { title, detail, status, accessibilityLabel };
}

/** From this text size up (the accessibility sizes), a row puts its status
 * and date under the text instead of beside it, so the title keeps the width. */
export const ROLL_ROW_STACK_FONT_SCALE = 1.5;

export function stacksRollRow(fontScale: number): boolean {
  return fontScale >= ROLL_ROW_STACK_FONT_SCALE;
}
