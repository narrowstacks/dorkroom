// Read and write a JSON array of records kept under one MMKV key, without ever
// losing a record that fails its schema (issue #532).
//
// Reads are per element: valid records load, invalid ones are skipped. Nothing
// is moved on read, so the hooks can parse during render. Every write first
// copies whatever it is about to overwrite and cannot decode (an invalid
// element, or the whole value when it is not a JSON array) to
// `<key>.quarantine`, an append-only, de-duplicated JSON array of raw JSON
// strings. A write therefore never destroys data it could not read.
import { z } from 'zod';

/** Any value `JSON.parse` can produce: the shape of a stored record before it
 * is validated. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const quarantineSchema = z.array(z.string());

/** The subset of an MMKV instance this module uses. */
export interface StringStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

export const quarantineKey = (key: string): string => `${key}.quarantine`;

interface Decoded<T> {
  valid: T[];
  /** Raw JSON of everything that did not decode. */
  invalid: string[];
}

function decode<T>(raw: string | undefined, schema: z.ZodType<T>): Decoded<T> {
  // A missing key is a fresh install, not a failed read.
  if (!raw) return { valid: [], invalid: [] };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { valid: [], invalid: [raw] };
  }
  if (!Array.isArray(json)) return { valid: [], invalid: [raw] };
  const valid: T[] = [];
  const invalid: string[] = [];
  for (const item of json) {
    const result = schema.safeParse(item);
    if (result.success) valid.push(result.data);
    else invalid.push(JSON.stringify(item));
  }
  return { valid, invalid };
}

/** Pure: the records in a stored value that pass `schema`. */
export function parseCollection<T>(
  raw: string | undefined,
  schema: z.ZodType<T>
): T[] {
  return decode(raw, schema).valid;
}

/** The stored quarantine entries. A value that is not a string array is kept
 * whole as one entry, so a damaged quarantine is never overwritten either. */
function readQuarantine(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const result = quarantineSchema.safeParse(JSON.parse(raw));
    if (result.success) return result.data;
  } catch {
    // Fall through: keep the unreadable value as an entry.
  }
  return [raw];
}

/** The raw entries quarantined for `key`, oldest first. */
export function getQuarantined(store: StringStore, key: string): string[] {
  return readQuarantine(store.getString(quarantineKey(key)));
}

function quarantine(store: StringStore, key: string, invalid: string[]): void {
  if (invalid.length === 0) return;
  const existing = getQuarantined(store, key);
  const merged = [...new Set([...existing, ...invalid])];
  if (merged.length > existing.length) {
    store.set(quarantineKey(key), JSON.stringify(merged));
  }
}

// Stores whose on-device data was written by a newer app version (see
// lib/schema-version.ts). Nothing may be written to them: this build cannot
// know what a newer format needs, and a write would replace it.
const readOnlyStores = new WeakSet<StringStore>();

/** Refuse every later `writeCollection` and `migrateCollection` on `store`. */
export function markReadOnly(store: StringStore): void {
  readOnlyStores.add(store);
}

export const isReadOnly = (store: StringStore): boolean =>
  readOnlyStores.has(store);

/** Replace the records under `key`, first quarantining anything stored there
 * that does not decode. A no-op on a read-only store. */
export function writeCollection<T>(
  store: StringStore,
  key: string,
  schema: z.ZodType<T>,
  items: T[]
): void {
  if (readOnlyStores.has(store)) return;
  quarantine(store, key, decode(store.getString(key), schema).invalid);
  store.set(key, JSON.stringify(items));
}

/** Run `migrate` over every stored record and write back those that then pass
 * `schema`. A record that still fails is quarantined as it was stored, before
 * migration, so nothing is lost. A value that is not a JSON array is left for
 * the next `writeCollection` to quarantine. */
export function migrateCollection<T>(
  store: StringStore,
  key: string,
  schema: z.ZodType<T>,
  migrate: (item: JsonValue) => JsonValue
): void {
  if (readOnlyStores.has(store)) return;
  const raw = store.getString(key);
  if (!raw) return;
  let json: JsonValue;
  try {
    json = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(json)) return;
  const valid: T[] = [];
  const invalid: string[] = [];
  for (const item of json) {
    let result: z.ZodSafeParseResult<T>;
    try {
      result = schema.safeParse(migrate(item));
    } catch {
      invalid.push(JSON.stringify(item));
      continue;
    }
    if (result.success) valid.push(result.data);
    else invalid.push(JSON.stringify(item));
  }
  quarantine(store, key, invalid);
  store.set(key, JSON.stringify(valid));
}
