// Zod schemas for the film-log domain. Used to (a) validate data read back from
// MMKV (corruption → caller falls back to []) and (b) shape the export envelope.
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
  backs: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const lensSchema = z.object({
  id: z.string(),
  name: z.string(),
  cameraId: z.string().nullish(),
  focalLength: z.number().optional(),
  maxAperture: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const shotPhotoSchema = z.object({
  fileName: z.string(),
  width: z.number(),
  height: z.number(),
  capturedAt: z.string(),
  source: z.enum(['meter', 'library']),
  grayscale: z.boolean().optional(),
});

export const shotSchema = z.object({
  id: z.string(),
  frameNumber: z.number(),
  aperture: z.number().optional(),
  shutterSpeed: z.number().optional(),
  photo: shotPhotoSchema.optional(),
  lensId: z.string().optional(),
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
  filmStockName: z.string().optional(),
  process: filmProcessSchema,
  iso: z.number().optional(),
  pushPull: z.number().optional(),
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
