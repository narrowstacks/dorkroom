// Smart lists and summary stats over the film log. Pure: data in, data out, so
// it runs (and is tested) outside the app. A roll's `startedAt` that does not
// parse is never thrown on: it is left out of "This year" and sorted last.
import type { Camera, FilmRoll } from '@/schemas/film-log.schema';

export type RollFilter = 'all' | 'in-camera' | 'to-develop' | 'this-year';

export const ROLL_FILTERS: { value: RollFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-camera', label: 'In camera' },
  { value: 'to-develop', label: 'To develop' },
  { value: 'this-year', label: 'This year' },
];

/** Time in ms, or NaN when the date does not parse. */
function startedTime(roll: FilmRoll): number {
  return new Date(roll.startedAt).getTime();
}

function startedThisYear(roll: FilmRoll, now: Date): boolean {
  const time = startedTime(roll);
  return (
    !Number.isNaN(time) && new Date(time).getFullYear() === now.getFullYear()
  );
}

function matches(roll: FilmRoll, filter: RollFilter, now: Date): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'in-camera':
      return roll.status === 'active';
    case 'to-develop':
      return roll.status === 'finished';
    case 'this-year':
      return startedThisYear(roll, now);
  }
}

export function filterRolls(
  rolls: FilmRoll[],
  filter: RollFilter,
  now: Date
): FilmRoll[] {
  return rolls.filter((roll) => matches(roll, filter, now));
}

export function rollCounts(rolls: FilmRoll[], now: Date) {
  return {
    all: rolls.length,
    'in-camera': filterRolls(rolls, 'in-camera', now).length,
    'to-develop': filterRolls(rolls, 'to-develop', now).length,
    'this-year': filterRolls(rolls, 'this-year', now).length,
  } satisfies Record<RollFilter, number>;
}

const STATUS_RANK = {
  active: 0,
  finished: 1,
  developed: 2,
} satisfies Record<FilmRoll['status'], number>;

/** Active, then finished, then developed; newest start first within a group,
 * unparseable dates last. Stable, and does not mutate its input. */
export function sortRolls(rolls: FilmRoll[]): FilmRoll[] {
  return [...rolls].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    const timeA = startedTime(a);
    const timeB = startedTime(b);
    const validA = !Number.isNaN(timeA);
    const validB = !Number.isNaN(timeB);
    if (validA && validB) return timeB - timeA;
    if (validA) return -1;
    if (validB) return 1;
    return 0;
  });
}

export interface FilmLogStats {
  rollsThisYear: number;
  framesThisYear: number;
  topFilm?: { name: string; rolls: number };
  topCamera?: { name: string; rolls: number };
}

/** The key with the most rolls; ties go to the most recently started. */
function topEntry(
  entries: { key: string; time: number }[]
): { key: string; rolls: number } | undefined {
  const tally = new Map<string, { rolls: number; latest: number }>();
  for (const { key, time } of entries) {
    const latest = Number.isNaN(time) ? -Infinity : time;
    const current = tally.get(key);
    tally.set(key, {
      rolls: (current?.rolls ?? 0) + 1,
      latest: Math.max(current?.latest ?? -Infinity, latest),
    });
  }
  let best: { key: string; rolls: number; latest: number } | undefined;
  for (const [key, value] of tally) {
    if (
      !best ||
      value.rolls > best.rolls ||
      (value.rolls === best.rolls && value.latest > best.latest)
    ) {
      best = { key, ...value };
    }
  }
  return best ? { key: best.key, rolls: best.rolls } : undefined;
}

export function filmLogStats(
  rolls: FilmRoll[],
  cameras: Camera[],
  now: Date
): FilmLogStats {
  const thisYear = filterRolls(rolls, 'this-year', now);
  const stats: FilmLogStats = {
    rollsThisYear: thisYear.length,
    framesThisYear: thisYear.reduce((sum, roll) => sum + roll.shots.length, 0),
  };

  const film = topEntry(
    rolls.flatMap((roll) => {
      const name = roll.filmStockName?.trim();
      return name ? [{ key: name, time: startedTime(roll) }] : [];
    })
  );
  if (film) stats.topFilm = { name: film.key, rolls: film.rolls };

  const cameraNames = new Map(
    cameras.map((camera) => [camera.id, camera.name])
  );
  const camera = topEntry(
    rolls.flatMap((roll) =>
      cameraNames.has(roll.cameraId)
        ? [{ key: roll.cameraId, time: startedTime(roll) }]
        : []
    )
  );
  const cameraName = camera ? cameraNames.get(camera.key) : undefined;
  if (camera && cameraName) {
    stats.topCamera = { name: cameraName, rolls: camera.rolls };
  }
  return stats;
}
