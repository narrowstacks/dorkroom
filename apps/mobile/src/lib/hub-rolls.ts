// The words and decisions of the phase hubs' roll cards and empty states.
// Pure, so the copy is tested. Hubs say "frames", like the Film Log list and a
// roll's page.
import { rollDateLabel } from '@/lib/film-log-list';
import { frameCountLabel, rollLabel } from '@/lib/film-log-options';
import {
  developedInLabel,
  recentDevelopedRolls,
  rollsToDevelop,
} from '@/lib/roll-lifecycle';
import type { Phase } from '@/lib/tools';
import type { FilmRoll } from '@/schemas/film-log.schema';

/**
 * The line under a recently developed roll. What it was developed in when the
 * roll has a recipe, else the date its development record stores ("Developed
 * Nov 13"; "Developed" alone when that date does not parse), then its frame
 * count, left out for a roll with none so "0 frames" is never the only detail.
 * Nothing here comes from a date the roll does not store.
 */
export function recentNegativeLine(
  roll: Pick<FilmRoll, 'shots' | 'development'>,
  now: Date,
  locale?: string
): string {
  const recipe = developedInLabel(roll.development);
  const date = roll.development
    ? rollDateLabel(roll.development.developedAt, now, locale)
    : '';
  const developed = recipe ?? (date ? `Developed ${date}` : 'Developed');
  const frames =
    roll.shots.length > 0 ? frameCountLabel(roll.shots.length) : undefined;
  return [developed, frames].filter(Boolean).join(' · ');
}

/** The one spoken label of a recent negatives row. */
export function recentNegativeLabel(
  roll: Pick<FilmRoll, 'name' | 'filmStockName' | 'shots' | 'development'>,
  now: Date,
  locale?: string
): string {
  return `${rollLabel(roll)}, ${recentNegativeLine(roll, now, locale)}`;
}

/** What the hubs know about the user's rolls. */
export interface HubRollCounts {
  /** A roll is in the camera (the one the Meter logs to). */
  hasRollInCamera: boolean;
  /** Shot rolls waiting to be developed. */
  waiting: number;
  /** Developed rolls. */
  developed: number;
}

/**
 * The counts from the SAME selectors the cards use (`rollsToDevelop`,
 * `recentDevelopedRolls`, and the roll the Meter logs to, passed in), so a card
 * and its empty line can never both show or both be missing.
 */
export function hubRollCounts(
  rolls: readonly FilmRoll[],
  rollInCamera: FilmRoll | undefined
): HubRollCounts {
  return {
    hasRollInCamera: rollInCamera !== undefined,
    waiting: rollsToDevelop(rolls).length,
    developed: recentDevelopedRolls(rolls, rolls.length).length,
  };
}

/** Where a hub's empty line sits: Shoot's, which carries the primary action,
 * takes the roll card's slot above the tools; the others follow the tools. */
export function hubEmptyPlacement(phase: Phase): 'above' | 'below' {
  return phase === 'shoot' ? 'above' : 'below';
}

export interface HubEmptyState {
  message: string;
  /** At most one action: Shoot's opens the new roll form, Print's the Develop
   * hub when rolls are waiting there. */
  action?: { label: string; path: string };
}

/** Where "New roll" goes: the same form Film Log's + opens. */
export const NEW_ROLL_PATH = '/shoot/film-log/roll-form';

/** The Develop hub, for Print's "To develop: N" link. */
export const DEVELOP_HUB_PATH = '/develop';

/**
 * The quiet line a hub shows where its roll card would otherwise be absent,
 * or null when the card shows. Shoot without a roll in the camera offers New
 * roll; Develop only says what is missing; Print adds "To develop: N" when
 * shot rolls are waiting in Develop.
 */
export function hubEmptyState(
  phase: Phase,
  counts: HubRollCounts
): HubEmptyState | null {
  switch (phase) {
    case 'shoot':
      return counts.hasRollInCamera
        ? null
        : {
            message: 'No roll in the camera.',
            action: { label: 'New roll', path: NEW_ROLL_PATH },
          };
    case 'develop':
      return counts.waiting > 0
        ? null
        : { message: 'Nothing waiting to be developed.' };
    case 'print':
      if (counts.developed > 0) return null;
      return counts.waiting > 0
        ? {
            message: 'No developed rolls yet.',
            action: {
              label: `To develop: ${counts.waiting}`,
              path: DEVELOP_HUB_PATH,
            },
          }
        : { message: 'No developed rolls yet.' };
  }
}
