// MMKV-backed persistence for user-saved timer presets. Like
// lib/film-log-storage.ts, the collection is a JSON-stringified array under one
// key, read and written through lib/stored-collection.ts: presets that fail
// validation are skipped on read and moved to `presets.quarantine` before a
// write replaces them (issue #532). The built-in DEFAULT_BW_PRESET is not
// stored; it's prepended at read time so it's always available.

import { createMMKV } from 'react-native-mmkv';
import { generateId } from '@/lib/id';
import { openVersionedStore } from '@/lib/schema-version';
import { writeCollection } from '@/lib/stored-collection';
import { DEFAULT_BW_PRESET, parsePresets, timerPresetSchema } from './presets';
import type { TimerPreset, TimerStage } from './types';

export const storage = createMMKV({ id: 'dorkroom-timer' });

export const KEYS = { presets: 'presets' } as const;

// Migrate stored data to the current format before any hook reads it.
export const storeOpenResult = openVersionedStore(storage, [
  { key: KEYS.presets, schema: timerPresetSchema },
]);

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
  writeCollection(storage, KEYS.presets, timerPresetSchema, presets);
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
