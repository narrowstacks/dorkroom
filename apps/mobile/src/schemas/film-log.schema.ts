// Film roll tracker domain: zod schemas and the types inferred from them.
// Mobile-only for now (MMKV-backed); kept aligned with @dorkroom/api's `Film`
// so the stubbed film picker can later swap to the real `useFilms()` with a
// one-file mapping. See lib/film-stocks-stub.ts.
//
// The schemas (a) validate data read back from MMKV (corruption: caller falls
// back to []) and (b) shape the export envelope.
//
// These schemas are the ONLY declaration of the film-log shapes. zod strips
// keys a schema does not list, so a field declared on a hand-written type but
// missing here would be written to MMKV and then erased on the next read (and
// the next write would persist the erasure). Deriving every type with
// `z.infer` makes that drift impossible: a field exists in both or neither.
import { z } from 'zod';

export const filmProcessSchema = z.enum(['bw', 'color', 'slide']);

export const cameraFormatSchema = z.enum([
  '35mm',
  '120',
  '4x5',
  '8x10',
  'digital',
  'other',
]);

/** Stub shape; mirrors a subset of @dorkroom/api `Film` (colorType->process, isoSpeed->iso). */
export const filmStockSchema = z.object({
  id: z.string(),
  brand: z.string(),
  name: z.string(),
  iso: z.number(),
  process: filmProcessSchema,
});

export const cameraSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: cameraFormatSchema,
  /** Holder/back labels for multi-back or sheet-film bodies, e.g. ['A12 #1','A12 #2']. */
  backs: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const lensSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Optional association to a saved camera; null/undefined = used across bodies. */
  cameraId: z.string().nullish(),
  focalLength: z.number().optional(),
  maxAperture: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const shotPhotoSchema = z.object({
  /** Bare filename under documentDirectory/film-log/, never an absolute path. */
  fileName: z.string(),
  width: z.number(),
  height: z.number(),
  capturedAt: z.string(),
  source: z.enum(['meter', 'library']),
  /** True when the stored file was desaturated for a B&W roll. */
  grayscale: z.boolean().optional(),
});

export const shotSchema = z.object({
  id: z.string(),
  frameNumber: z.number(),
  aperture: z.number().optional(),
  /** Shutter speed in seconds (e.g. 1/125 -> 0.008). */
  shutterSpeed: z.number().optional(),
  photo: shotPhotoSchema.optional(),
  // ISO is a roll-level property (the rated EI); shots inherit FilmRoll.iso.
  lensId: z.string().optional(),
  /** Per-shot holder/back override (defaults to the roll's `back`). */
  back: z.string().optional(),
  notes: z.string().optional(),
  takenAt: z.string().optional(),
  source: z.enum(['manual', 'meter']),
});

export const filmRollSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  cameraId: z.string(),
  filmStockId: z.string().optional(),
  /** Name snapshot so a later film-stock change/delete doesn't orphan the roll. */
  filmStockName: z.string().optional(),
  /** Defaults from the chosen film stock's process; manually overridable. */
  process: filmProcessSchema,
  /** Exposure index the roll is rated at (box speed by default; raise/lower to push/pull). */
  iso: z.number().optional(),
  /** Push/pull in stops (e.g. +1 to push one stop). */
  pushPull: z.number().optional(),
  /** Roll-level default holder/back. */
  back: z.string().optional(),
  status: z.enum(['active', 'finished', 'developed']),
  shots: z.array(shotSchema),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const camerasSchema = z.array(cameraSchema);
export const lensesSchema = z.array(lensSchema);
export const rollsSchema = z.array(filmRollSchema);
export const customFilmsSchema = z.array(filmStockSchema);

export type FilmProcess = z.infer<typeof filmProcessSchema>;
export type CameraFormat = z.infer<typeof cameraFormatSchema>;
export type FilmStock = z.infer<typeof filmStockSchema>;
export type Camera = z.infer<typeof cameraSchema>;
export type Lens = z.infer<typeof lensSchema>;
export type ShotPhoto = z.infer<typeof shotPhotoSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type FilmRoll = z.infer<typeof filmRollSchema>;
