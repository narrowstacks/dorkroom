// Versioned on-device storage for the film log and timer presets (issue #584).
//
// Each MMKV store carries a `schemaVersion` string. When a store is opened,
// `openVersionedStore` runs the ordered migration steps from the stored version
// up to the current one over the raw JSON, then stamps the new version. It runs
// at module load of the storage files, before any hook parses during render.
//
// - Unversioned data is v0. A fresh install is stamped current without running
//   any step.
// - A version this build does not know (newer than current, or not a whole
//   number) means a newer app wrote the data. The store is left untouched and
//   marked read-only: reads still load whatever records this build can parse,
//   and every write to it is dropped, so a downgrade never overwrites data
//   that a newer build can still read.
// - Steps map one record to one record. A record that fails the current schema
//   after migrating is quarantined as stored (see stored-collection.ts).
import type { z } from 'zod';
import {
  type JsonValue,
  markReadOnly,
  migrateCollection,
  type StringStore,
} from '@/lib/stored-collection';

export const SCHEMA_VERSION_KEY = 'schemaVersion';

/** Maps a record stored at version N to its shape at N + 1. `key` names the
 * collection, for steps that treat collections differently. */
export type MigrationStep = (item: JsonValue, key: string) => JsonValue;

/** `MIGRATIONS[n]` upgrades stored data from version n to n + 1, so the
 * current version is `MIGRATIONS.length`. Append a step with every format
 * change; never edit or reorder one that has shipped. */
export const MIGRATIONS: readonly MigrationStep[] = [
  // v0 -> v1: no transform. Unversioned data already has the v1 shape, so this
  // step only brings it under version control.
  (item) => item,
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.length;

export interface VersionedCollection {
  key: string;
  schema: z.ZodType<unknown>;
}

export type StoreOpenResult =
  | { state: 'fresh' | 'current' | 'migrated'; version: number }
  /** Written by a newer build (or an unreadable version): read-only. */
  | { state: 'future'; version: string };

function readVersion(raw: string | undefined): number | 'unknown' {
  if (raw === undefined) return 0;
  return /^\d+$/.test(raw) ? Number(raw) : 'unknown';
}

export function openVersionedStore(
  store: StringStore,
  collections: readonly VersionedCollection[],
  migrations: readonly MigrationStep[] = MIGRATIONS
): StoreOpenResult {
  const current = migrations.length;
  const raw = store.getString(SCHEMA_VERSION_KEY);
  const version = readVersion(raw);
  if (version === 'unknown' || version > current) {
    markReadOnly(store);
    return { state: 'future', version: raw ?? '' };
  }
  if (version === current) return { state: 'current', version };

  const hasData = collections.some(({ key }) => store.getString(key));
  if (!hasData) {
    store.set(SCHEMA_VERSION_KEY, String(current));
    return { state: 'fresh', version: current };
  }
  const steps = migrations.slice(version);
  for (const { key, schema } of collections) {
    migrateCollection(store, key, schema, (item) =>
      steps.reduce((acc, step) => step(acc, key), item)
    );
  }
  store.set(SCHEMA_VERSION_KEY, String(current));
  return { state: 'migrated', version: current };
}
