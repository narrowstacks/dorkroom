import { frameLensName } from '@/lib/camera-lenses';
import { rollRowText } from '@/lib/film-log-list';
import { formatCameraFormat, joinFacts } from '@/lib/film-log-options';
import { cameraDisplayName } from '@/lib/gear-display';
import type { Camera, FilmRoll, Lens } from '@/schemas/film-log.schema';

export interface RollMatch {
  rollId: string;
  title: string;
  /** The Film Log list's detail line: camera, film (when named), EI, frames. */
  subtitle: string;
  /** The Film Log list's status word ("In camera"), shown as a `StatusPill`. */
  status: string;
  /** In camera: the pill takes the phase tint, as in the Film Log list. */
  inCamera: boolean;
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
  const cameraName = (id: string) => {
    const camera = cameraById.get(id);
    return camera ? cameraDisplayName(camera) : undefined;
  };

  const rolls = data.rolls
    .map((roll, index) => ({ roll, index }))
    .filter(({ roll }) => {
      const lensNames = roll.shots.flatMap((shot) => {
        const name = frameLensName(shot, (id) => lensById.get(id)?.name);
        return name ? [name] : [];
      });
      const haystack = [
        roll.name,
        roll.filmStockName,
        cameraName(roll.cameraId),
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
    .map(({ roll }) => {
      const text = rollRowText(roll, cameraName(roll.cameraId), '');
      return {
        rollId: roll.id,
        title: text.title,
        subtitle: text.detail,
        status: text.status,
        inCamera: roll.status === 'active',
      };
    });

  const cameras = data.cameras
    .map((camera) => ({
      camera,
      name: cameraDisplayName(camera),
      used: data.rolls.filter((r) => r.cameraId === camera.id).length,
    }))
    .filter(({ name }) => matchesAll(words(name), tokens))
    .sort((a, b) => b.used - a.used || a.name.localeCompare(b.name))
    .slice(0, MAX_CAMERAS)
    .map(({ camera, name, used }) => {
      return {
        cameraId: camera.id,
        title: name,
        subtitle: joinFacts([
          formatCameraFormat(camera.format),
          used === 0 ? 'No rolls' : `${used} ${used === 1 ? 'roll' : 'rolls'}`,
        ]),
      };
    });

  return { rolls, cameras };
}
