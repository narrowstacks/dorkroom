import { DEFAULT_INVERSION_ADJUSTMENTS } from '@dorkroom/logic';
import { z } from 'zod';
import type { InverterState, RestoredSession } from './inverter-state';

/**
 * The editor session as stored between launches: which photo (a file name in
 * the inverter's own documents folder) and everything done to it. Pure, so
 * the round trip is tested; `src/lib/inverter-session-storage.ts` reads and
 * writes it.
 *
 * A record is user work with no other copy, so a bad one degrades to no
 * session rather than throwing. `version` is for future changes: a newer or
 * unknown version is dropped, an older one migrated in `parseSession`.
 */
export const SESSION_VERSION = 1;

const finite = z.number().refine(Number.isFinite);
const point = z.object({ x: finite, y: finite });
const rect = z.object({
  x: finite,
  y: finite,
  width: finite.refine((v) => v > 0),
  height: finite.refine((v) => v > 0),
});
const rgb = z.tuple([finite, finite, finite]);
const picked = z.object({ point, rgb });

export const sessionSchema = z.object({
  version: z.literal(SESSION_VERSION),
  /** The source photo's file name inside the inverter's folder. */
  fileName: z
    .string()
    .min(1)
    .refine((name) => !name.includes('/'), 'a bare file name'),
  filmType: z.enum(['c41', 'bw']),
  crop: rect,
  base: picked.extend({ auto: z.boolean(), confidence: finite }).nullable(),
  neutral: picked.nullable(),
  adjustments: z.object({
    exposure: finite,
    contrast: finite,
    warmth: finite,
    tint: finite,
    saturation: finite,
  }),
  orientation: z.object({
    quarterTurns: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
    ]),
    mirrored: z.boolean(),
  }),
});

export type SessionRecord = z.infer<typeof sessionSchema>;

/** The editor state worth keeping, for the photo stored as `fileName`. Null
 *  while there is no photo or crop to keep. */
export function toSessionRecord<N>(
  state: Pick<
    InverterState<N>,
    | 'negative'
    | 'filmType'
    | 'crop'
    | 'base'
    | 'neutral'
    | 'adjustments'
    | 'orientation'
  >,
  fileName: string
): SessionRecord | null {
  if (!state.negative || !state.crop) return null;
  return {
    version: SESSION_VERSION,
    fileName,
    filmType: state.filmType,
    crop: state.crop,
    base: state.base
      ? {
          point: state.base.point,
          rgb: [state.base.rgb[0], state.base.rgb[1], state.base.rgb[2]],
          auto: state.base.auto,
          confidence: state.base.confidence,
        }
      : null,
    neutral: state.neutral
      ? {
          point: state.neutral.point,
          rgb: [
            state.neutral.rgb[0],
            state.neutral.rgb[1],
            state.neutral.rgb[2],
          ],
        }
      : null,
    adjustments: { ...state.adjustments },
    orientation: { ...state.orientation },
  };
}

/** A stored session, or null for a missing, unreadable or unknown one. */
export function parseSession(raw: string | undefined): SessionRecord | null {
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = sessionSchema.safeParse(json);
  return result.success ? result.data : null;
}

export function serializeSession(record: SessionRecord): string {
  return JSON.stringify(record);
}

/**
 * The record against the photo it was made on: the crop clipped to the
 * proxy, and picks dropped when they fall outside it (a proxy rebuilt at a
 * different size), so a stale record never breaks the editor.
 */
export function restoreSession(
  record: SessionRecord,
  proxy: { width: number; height: number }
): RestoredSession {
  const inside = (p: { x: number; y: number }) =>
    p.x >= 0 && p.y >= 0 && p.x <= proxy.width && p.y <= proxy.height;
  const x = Math.min(Math.max(0, record.crop.x), proxy.width - 1);
  const y = Math.min(Math.max(0, record.crop.y), proxy.height - 1);
  const crop = {
    x,
    y,
    width: Math.max(1, Math.min(record.crop.width, proxy.width - x)),
    height: Math.max(1, Math.min(record.crop.height, proxy.height - y)),
  };
  return {
    filmType: record.filmType,
    crop,
    base: record.base && inside(record.base.point) ? record.base : null,
    neutral:
      record.filmType === 'c41' &&
      record.neutral &&
      inside(record.neutral.point)
        ? record.neutral
        : null,
    adjustments: { ...DEFAULT_INVERSION_ADJUSTMENTS, ...record.adjustments },
    orientation: record.orientation,
  };
}

/**
 * Files in the inverter's folder that no session points at: left by a kill
 * between copying a new photo and saving the record, or by a load that
 * replaced a restore. Only names that look like the inverter's own copies
 * (a bare name with an extension) are ever offered for deletion.
 */
export function orphanedSources(
  files: readonly string[],
  keep: string | null
): string[] {
  return files.filter(
    (name) => name !== keep && !name.includes('/') && /\.[a-z0-9]+$/i.test(name)
  );
}
