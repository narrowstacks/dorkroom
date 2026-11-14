// A roll's way through the phases: Loaded (status `active`), Shot (`finished`),
// Developed (`developed`), then Printing, which is not a stored status: it is a
// developed roll shown in the Print hub's recent list. Pure: data in, data out.
import { toCelsius } from '@dorkroom/logic';
import {
  formatRecipeTemp,
  formatRecipeTime,
  pushPullDisplay,
} from '@/components/development/recipe-format';
import { rollLabel, shotCountLabel } from '@/lib/film-log-options';
import { queryOf, toolHref } from '@/lib/home/destination';
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import type {
  FilmRoll,
  RollDevelopment,
  RollStatus,
} from '@/schemas/film-log.schema';

/** The fields a status change may touch. */
export type RollStatusPatch = Partial<
  Pick<FilmRoll, 'status' | 'finishedAt' | 'development'>
>;

/**
 * The patch that moves a roll to `next`, keeping the dates consistent with it:
 * a shot or developed roll has a `finishedAt` (kept when it has one), a
 * developed roll has a development record (kept, else just `developedAt`),
 * and a roll back in the camera has no `finishedAt`. A development record is
 * never deleted by a status change: it is user data, shown only while the roll
 * is developed. `roll` is undefined for a roll being created.
 */
export function rollStatusPatch(
  roll: Pick<FilmRoll, 'status' | 'finishedAt' | 'development'> | undefined,
  next: RollStatus,
  now: string
): RollStatusPatch {
  if (roll?.status === next) return { status: next };
  switch (next) {
    case 'active':
      return { status: 'active', finishedAt: undefined };
    case 'finished':
      return { status: 'finished', finishedAt: roll?.finishedAt ?? now };
    case 'developed':
      return {
        status: 'developed',
        finishedAt: roll?.finishedAt ?? now,
        development: roll?.development ?? { developedAt: now },
      };
  }
}

/**
 * The status fields the roll form writes on save: none when its status control
 * still shows the status the form opened with, so a form left open cannot undo
 * a newer change made elsewhere (Mark as shot on the hub, Save to roll from
 * the timer). Otherwise the patch for the change, computed against the roll as
 * it is now. The form's other fields never include `finishedAt` or
 * `development`, so it cannot write a stale copy of them either.
 */
export function rollFormStatusPatch(
  roll: Pick<FilmRoll, 'status' | 'finishedAt' | 'development'> | undefined,
  openedStatus: RollStatus | undefined,
  formStatus: RollStatus,
  now: string
): RollStatusPatch {
  if (roll && formStatus === openedStatus) return {};
  return rollStatusPatch(roll, formStatus, now);
}

/** Time in ms, or NaN when missing or unparseable. */
function timeOf(iso: string | undefined): number {
  return iso ? Date.parse(iso) : Number.NaN;
}

/** Ascending by time, unparseable last; stable. */
function byTime<T>(items: readonly T[], time: (item: T) => number): T[] {
  return [...items].sort((a, b) => {
    const ta = time(a);
    const tb = time(b);
    const va = !Number.isNaN(ta);
    const vb = !Number.isNaN(tb);
    if (va && vb) return ta - tb;
    if (va) return -1;
    if (vb) return 1;
    return 0;
  });
}

/** Shot rolls waiting for the tank, oldest `finishedAt` first (a roll without
 * one goes by `updatedAt`). */
export function rollsToDevelop(rolls: readonly FilmRoll[]): FilmRoll[] {
  return byTime(
    rolls.filter((roll) => roll.status === 'finished'),
    (roll) => {
      const finished = timeOf(roll.finishedAt);
      return Number.isNaN(finished) ? timeOf(roll.updatedAt) : finished;
    }
  );
}

/** When a developed roll was developed: its record's date, else `updatedAt`. */
function developedTime(roll: FilmRoll): number {
  const developed = timeOf(roll.development?.developedAt);
  return Number.isNaN(developed) ? timeOf(roll.updatedAt) : developed;
}

/** The most recently developed rolls, newest first, at most `limit`. */
export function recentDevelopedRolls(
  rolls: readonly FilmRoll[],
  limit: number
): FilmRoll[] {
  const developed = rolls.filter((roll) => roll.status === 'developed');
  // Newest first, with undated rolls still last.
  const dated = byTime(developed, (roll) => -developedTime(roll));
  return dated.slice(0, limit);
}

/** "Push +1" / "Pull -0.5", or undefined at box speed. The word carries the
 * direction, so it never rests on colour. */
export function pushPullLabel(stops: number | undefined): string | undefined {
  if (stops === undefined) return undefined;
  const display = pushPullDisplay(stops);
  if (!display) return undefined;
  return `${display.direction === 'push' ? 'Push' : 'Pull'} ${display.label}`;
}

/** The line under a roll waiting to be developed: EI, push/pull, shots. */
export function rollToDevelopLine(
  roll: Pick<FilmRoll, 'iso' | 'pushPull' | 'shots'>
): string {
  return [
    roll.iso !== undefined ? `EI ${roll.iso}` : undefined,
    pushPullLabel(roll.pushPull),
    shotCountLabel(roll.shots.length),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** What a roll was developed in: the recipe's name, else developer and
 * dilution, else undefined. */
export function developedInLabel(
  development: RollDevelopment | undefined
): string | undefined {
  if (!development) return undefined;
  const recipe = development.recipeName?.trim();
  if (recipe) return recipe;
  const parts = [development.developer?.trim(), development.dilution?.trim()]
    .filter(Boolean)
    .join(' ');
  return parts || undefined;
}

/**
 * The rows of a roll's "Developed" section, in the recipe screen's formats
 * (°C first, then °F, as the recipe shows them). The date is left to the
 * screen, which formats it in the user's locale. Unknown fields are left out.
 */
export function developmentDetails(
  development: RollDevelopment
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const recipe = development.recipeName?.trim();
  const developer = development.developer?.trim();
  if (recipe) rows.push({ label: 'Recipe', value: recipe });
  else if (developer) rows.push({ label: 'Developer', value: developer });
  const dilution = development.dilution?.trim();
  if (dilution) rows.push({ label: 'Dilution', value: dilution });
  const f = development.temperatureF;
  if (f !== undefined && Number.isFinite(f)) {
    const c = toCelsius(f);
    rows.push({
      label: 'Temperature',
      value: `${formatRecipeTemp(c, f, 'C')} · ${formatRecipeTemp(c, f, 'F')}`,
    });
  }
  const seconds = development.timeSeconds;
  if (seconds !== undefined && Number.isFinite(seconds) && seconds > 0) {
    // The develop time set for the run, not a measured one (see the schema).
    rows.push({ label: 'Time set', value: formatRecipeTime(seconds / 60) });
  }
  if (development.shootingIso !== undefined) {
    rows.push({
      label: 'Shooting ISO',
      value: String(development.shootingIso),
    });
  }
  return rows;
}

/** Catalog film ids are the film's slug; a user's own film is `custom-...`
 * and has no recipes in the catalog. */
function catalogFilmSlug(filmStockId: string | undefined): string | undefined {
  const id = filmStockId?.trim();
  return id && !id.startsWith('custom-') ? id : undefined;
}

/**
 * Where a roll waiting to be developed opens the recipe browser: filtered to
 * its film (by slug, the identifier Home uses) and its EI, carrying `roll` so
 * a recipe started from there knows which roll it is developing. A roll with
 * no catalog film opens the browser unfiltered (its EI alone would hide every
 * other film's recipes for no reason).
 *
 * @param opened - Tells two openings apart, so the same roll opened twice
 *   re-applies its filters. Omit in tests for a stable path.
 */
export function recipesPathForRoll(
  roll: Pick<FilmRoll, 'id' | 'filmStockId' | 'iso'>,
  opened?: number
): string {
  const film = catalogFilmSlug(roll.filmStockId);
  return `${toolHref('recipes')}${queryOf({
    film,
    iso: film && roll.iso !== undefined ? String(roll.iso) : undefined,
    roll: roll.id,
    [LINK_OPENED_PARAM]: opened !== undefined ? String(opened) : undefined,
  })}`;
}

/**
 * The roll the "Save to roll" card starts on. When the run was started for a
 * roll, that roll if it is still waiting to be developed, else none: the user
 * picks, rather than the card offering a roll the run was not for. When the
 * run named no roll, the only waiting roll, else none.
 */
export function defaultRollToDevelop(
  candidates: readonly Pick<FilmRoll, 'id'>[],
  sessionRollId: string | undefined
): string | undefined {
  if (sessionRollId) {
    return candidates.some((roll) => roll.id === sessionRollId)
      ? sessionRollId
      : undefined;
  }
  return candidates.length === 1 ? candidates[0]?.id : undefined;
}

/** Whether the "Save to roll" card lists the waiting rolls to pick from:
 * whenever there is more than one, and also whenever nothing is preselected
 * (the run's own roll moved on, leaving one other), so it never dead-ends on
 * a disabled button with nothing to pick. */
export function showsRollPicker(
  candidateCount: number,
  preselected: string | undefined
): boolean {
  return (
    candidateCount > 1 || (candidateCount > 0 && preselected === undefined)
  );
}

/** The words of "Mark as developed" for a roll: it keeps a record the roll
 * already has (and its date), else records today's date. */
export function markDevelopedCopy(
  roll: Pick<FilmRoll, 'name' | 'filmStockName' | 'development'>,
  formatDate: (iso: string) => string
) {
  const label = rollLabel(roll);
  const kept = roll.development;
  if (kept) {
    const keeps = `Keeps the development saved on ${formatDate(kept.developedAt)}.`;
    return {
      message: `${label} moves to Developed. ${keeps}`,
      accessibilityLabel: `Mark as developed. ${keeps}`,
    };
  }
  return {
    message: `${label} moves to Developed with today's date. Runs saved from the Process Timer also record the recipe.`,
    accessibilityLabel: "Mark as developed. Records today's date.",
  };
}
