import {
  formatCameraFormat,
  ROLL_STATUS_OPTIONS,
  rollLabel,
  shotCountLabel,
} from '@/lib/film-log-options';
import type { Camera, FilmRoll, Lens } from '@/schemas/film-log.schema';

export interface RollMatch {
  rollId: string;
  title: string;
  subtitle: string;
}

export interface CameraMatch {
  cameraId: string;
  title: string;
  subtitle: string;
}

export interface FilmLogMatches {
  rolls: RollMatch[];
  cameras: CameraMatch[];
}

const MAX_ROLLS = 6;
const MAX_CAMERAS = 3;
const MIN_QUERY_LENGTH = 2;

/** Filler words of a question ("hp5 at 800") that are in no roll field. The
 * rest of a question still has to match: `dd-x` is a developer, not a roll field. */
const STOP_WORDS = new Set(['at', 'in', 'of', 'on', 'for', 'with', 'the']);

/** Lower case with everything but letters and digits removed from each word, so
 * `HP5+` is `hp5` and `Nikon FM-2` is `nikon fm2`. Words that were only
 * punctuation vanish. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
}

/** Whether every query word is a substring of the haystack's words. */
function matchesAll(haystack: readonly string[], tokens: readonly string[]) {
  const text = haystack.join(' ');
  return tokens.every((token) => text.includes(token));
}

function time(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/** The status word the rest of the app uses for a roll. */
function statusLabel(status: FilmRoll['status']): string | undefined {
  return ROLL_STATUS_OPTIONS.find((option) => option.value === status)?.label;
}

function matchSubtitle(roll: FilmRoll, camera: Camera | undefined): string {
  return [
    // A named roll's title hides its film, so say it: it may be why it matched.
    roll.name?.trim() ? roll.filmStockName : undefined,
    camera?.name,
    roll.iso !== undefined ? `EI ${roll.iso}` : undefined,
    statusLabel(roll.status),
    shotCountLabel(roll.shots.length),
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The film log rows Home shows for a query: rolls by their name, film, camera,
 * lenses used, notes and rated EI, and cameras by name. Every query word must
 * be found (punctuation ignored on both sides). Words under two characters and
 * filler words (`at`, `in`, `of`...) are dropped; with none left, nothing matches. Rolls list active first, cameras
 * the most used first.
 */
export function matchFilmLog(
  query: string,
  data: {
    rolls: readonly FilmRoll[];
    cameras: readonly Camera[];
    lenses: readonly Lens[];
  }
): FilmLogMatches {
  if (query.trim().length < MIN_QUERY_LENGTH) return { rolls: [], cameras: [] };
  const tokens = words(query).filter(
    (word) => word.length >= MIN_QUERY_LENGTH && !STOP_WORDS.has(word)
  );
  if (tokens.length === 0) return { rolls: [], cameras: [] };

  const cameraById = new Map(data.cameras.map((c) => [c.id, c]));
  const lensById = new Map(data.lenses.map((l) => [l.id, l]));

  const rolls = data.rolls
    .map((roll, index) => ({ roll, index }))
    .filter(({ roll }) => {
      const lensNames = roll.shots.flatMap((shot) => {
        const lens = shot.lensId ? lensById.get(shot.lensId) : undefined;
        return lens ? [lens.name] : [];
      });
      const haystack = [
        roll.name,
        roll.filmStockName,
        cameraById.get(roll.cameraId)?.name,
        ...lensNames,
        roll.notes,
        roll.iso !== undefined ? String(roll.iso) : undefined,
      ].flatMap((field) => (field ? words(field) : []));
      return matchesAll(haystack, tokens);
    })
    .sort(
      (a, b) =>
        Number(b.roll.status === 'active') -
          Number(a.roll.status === 'active') ||
        time(b.roll.updatedAt) - time(a.roll.updatedAt) ||
        a.index - b.index
    )
    .slice(0, MAX_ROLLS)
    .map(({ roll }) => ({
      rollId: roll.id,
      title: rollLabel(roll),
      subtitle: matchSubtitle(roll, cameraById.get(roll.cameraId)),
    }));

  const cameras = data.cameras
    .map((camera) => ({
      camera,
      used: data.rolls.filter((r) => r.cameraId === camera.id).length,
    }))
    .filter(({ camera }) => matchesAll(words(camera.name), tokens))
    .sort(
      (a, b) => b.used - a.used || a.camera.name.localeCompare(b.camera.name)
    )
    .slice(0, MAX_CAMERAS)
    .map(({ camera, used }) => {
      return {
        cameraId: camera.id,
        title: camera.name,
        subtitle: [
          formatCameraFormat(camera.format),
          used === 0 ? 'No rolls' : `${used} ${used === 1 ? 'roll' : 'rolls'}`,
        ].join(' · '),
      };
    });

  return { rolls, cameras };
}
