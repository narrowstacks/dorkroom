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

/** An optional field that reads as absent when its stored value is malformed,
 * so one bad value costs only that value. */
const tolerant = <T extends z.ZodType>(schema: T) =>
  schema.optional().catch(undefined);

/**
 * Where a frame was taken, recorded only when the user asked for it. Same rules
 * as `development`: tolerant per optional field, loose so a key a newer build
 * adds survives, and the shot's `.catch` below makes a location without a valid
 * latitude and longitude read as no location. A shot is nested in its roll, so
 * anything that could fail a shot would fail the whole roll; this cannot.
 */
const shotLocationFields = {
  /** Degrees, WGS 84. */
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  /** Horizontal accuracy radius in meters. */
  accuracyMeters: tolerant(z.number().nonnegative()),
  altitudeMeters: tolerant(z.number()),
  /** ISO instant the fix was taken. */
  capturedAt: tolerant(z.string()),
};

export const shotLocationSchema = z.looseObject(shotLocationFields);

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
  /** Free-text place name. Independent of `location`: a frame can have either, both or neither. */
  place: z.string().optional(),
  /** GPS fix, only when the user added one to this frame. Tolerant: a malformed one reads as none. */
  location: shotLocationSchema.optional().catch(undefined),
  takenAt: z.string().optional(),
  source: z.enum(['manual', 'meter']),
});

/**
 * How a roll was developed, recorded when it is marked developed (from the
 * Process Timer's "Save to roll", or bare `developedAt` from "Mark as
 * developed"). Every name is a snapshot, like `filmStockName`, so a later
 * catalog change cannot orphan it.
 *
 * Tolerant per field, unlike the rest of the film log: a malformed optional
 * value reads as absent, and the object is loose, so keys a newer build adds
 * survive a read and write by this one. A record without a valid
 * `developedAt` is no record (the roll's `.catch` below).
 */
const developmentRecordFields = {
  /** ISO instant. */
  developedAt: z.string(),
  /** The recipe's uuid (or numeric id as a string) when it came from one. */
  recipeId: tolerant(z.string()),
  /** e.g. "Ilford HP5 Plus in Ilford DD-X". */
  recipeName: tolerant(z.string()),
  /** e.g. "Ilford DD-X". */
  developer: tolerant(z.string()),
  /** e.g. "1+4" or "Stock". */
  dilution: tolerant(z.string()),
  temperatureF: tolerant(z.number()),
  /** The develop stage's duration as set for the run, in seconds (not the
   * time elapsed: a stage skipped early still records its set time). */
  timeSeconds: tolerant(z.number()),
  /** The recipe's shooting ISO (EI). */
  shootingIso: tolerant(z.number()),
  notes: tolerant(z.string()),
};

export const rollDevelopmentSchema = z.looseObject(developmentRecordFields);

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
  /**
   * Set when the roll is marked developed. Tolerant: a record whose
   * `developedAt` is missing or malformed reads as no record (`.catch`), so it
   * can never make the whole roll fail its schema and drop out of the list.
   * Rolls stored before it existed have none.
   */
  development: rollDevelopmentSchema.optional().catch(undefined),
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
/** A stored location: the fields below plus any key a newer build added. Read it. */
export type ShotLocation = z.infer<typeof shotLocationSchema>;
/** The location's known fields only, with no index signature, so a misspelled
 * key is a compile error where one is built. */
export type ShotLocationFields = z.output<
  z.ZodObject<typeof shotLocationFields>
>;
export type Shot = z.infer<typeof shotSchema>;
/** A stored record: the fields below plus any key a newer build added (the
 * schema is loose). Read it; build new records as {@link RollDevelopmentFields}. */
export type RollDevelopment = z.infer<typeof rollDevelopmentSchema>;
/** The record's known fields only, with no index signature, so a misspelled
 * or renamed key is a compile error where a record is built. */
export type RollDevelopmentFields = z.output<
  z.ZodObject<typeof developmentRecordFields>
>;
export type FilmRoll = z.infer<typeof filmRollSchema>;
export type RollStatus = FilmRoll['status'];
