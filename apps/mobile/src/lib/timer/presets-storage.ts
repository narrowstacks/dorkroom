// MMKV-backed persistence for user-saved timer presets. Mirrors
// lib/film-log-storage.ts: the collection is a JSON-stringified array under one
// key, read back through a schema safeParse so corrupt/legacy data falls back to
// [] instead of crashing. The built-in DEFAULT_BW_PRESET is not stored — it's
// prepended at read time so it's always available.
//
// This file touches the native MMKV module, so (like film-log-storage) it isn't
// unit-tested; the pure schema + `parsePresets` are exercised in presets.test.ts.
import { createMMKV } from 'react-native-mmkv';
import { generateId } from '@/lib/id';
import { DEFAULT_BW_PRESET, parsePresets } from './presets';
import type { TimerPreset, TimerStage } from './types';

export const storage = createMMKV({ id: 'dorkroom-timer' });

export const KEYS = { presets: 'presets' } as const;

function nowIso(): string {
  return new Date().toISOString();
}

/** User-saved presets only (excludes the built-in default). */
export function getUserPresets(): TimerPreset[] {
  return parsePresets(storage.getString(KEYS.presets));
}

/** Everything to show in the preset picker: the built-in default first. */
export function listPresets(): TimerPreset[] {
  return [DEFAULT_BW_PRESET, ...getUserPresets()];
}

export function setUserPresets(presets: TimerPreset[]): void {
  storage.set(KEYS.presets, JSON.stringify(presets));
}

export function addPreset(name: string, stages: TimerStage[]): TimerPreset {
  const created: TimerPreset = {
    id: generateId(),
    name,
    stages,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  setUserPresets([created, ...getUserPresets()]);
  return created;
}

export function updatePreset(
  id: string,
  patch: Partial<Omit<TimerPreset, 'id' | 'createdAt'>>
): void {
  setUserPresets(
    getUserPresets().map((preset) =>
      preset.id === id ? { ...preset, ...patch, updatedAt: nowIso() } : preset
    )
  );
}

export function deletePreset(id: string): void {
  setUserPresets(getUserPresets().filter((preset) => preset.id !== id));
}
