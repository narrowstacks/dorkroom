// Film roll tracker domain types. Mobile-only for now (MMKV-backed); kept aligned
// with @dorkroom/api's `Film` so the stubbed film picker can later swap to the
// real `useFilms()` with a one-file mapping. See lib/film-stocks-stub.ts.

export type FilmProcess = 'bw' | 'color' | 'slide';

export type CameraFormat =
  | '35mm'
  | '120'
  | '4x5'
  | '8x10'
  | 'digital'
  | 'other';

/** Stub shape; mirrors a subset of @dorkroom/api `Film` (colorType→process, isoSpeed→iso). */
export interface FilmStock {
  id: string;
  brand: string;
  name: string;
  iso: number;
  process: FilmProcess;
}

export interface Camera {
  id: string;
  name: string;
  format: CameraFormat;
  /** Holder/back labels for multi-back or sheet-film bodies, e.g. ['A12 #1','A12 #2']. */
  backs?: string[];
  notes?: string;
  createdAt: string;
}

export interface Lens {
  id: string;
  name: string;
  /** Optional association to a saved camera; null/undefined = used across bodies. */
  cameraId?: string | null;
  focalLength?: number;
  maxAperture?: number;
  notes?: string;
  createdAt: string;
}

export interface Shot {
  id: string;
  frameNumber: number;
  aperture?: number;
  /** Shutter speed in seconds (e.g. 1/125 → 0.008). */
  shutterSpeed?: number;
  // ISO is a roll-level property (the rated EI); shots inherit FilmRoll.iso.
  lensId?: string;
  /** Per-shot holder/back override (defaults to the roll's `back`). */
  back?: string;
  notes?: string;
  takenAt?: string;
  source: 'manual' | 'meter';
}

export interface FilmRoll {
  id: string;
  name?: string;
  cameraId: string;
  filmStockId?: string;
  /** Name snapshot so a later film-stock change/delete doesn't orphan the roll. */
  filmStockName?: string;
  /** Defaults from the chosen film stock's process; manually overridable. */
  process: FilmProcess;
  /** Exposure index the roll is rated at (box speed by default; raise/lower to push/pull). */
  iso?: number;
  /** Push/pull in stops (e.g. +1 to push one stop). */
  pushPull?: number;
  /** Roll-level default holder/back. */
  back?: string;
  status: 'active' | 'finished' | 'developed';
  shots: Shot[];
  startedAt: string;
  finishedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
