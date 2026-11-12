import { useMemo } from 'react';
import { createMMKV, useMMKVString } from 'react-native-mmkv';
import { z } from 'zod';
import { type RecordingToolId, recordsLastResult } from '@/lib/tools';

// The last answer each calculator showed, for the hub tiles. Local to the
// device, never sent anywhere. One JSON object keyed by tool id.
export const storage = createMMKV({ id: 'dorkroom-last-results' });
export const KEY = 'lastResults';

const lastResultSchema = z.object({
  /** The readout as shown, e.g. "17m 2.2s". Entries stored by an earlier build
   * also carry a timestamp, which parsing drops. */
  text: z.string().min(1),
});

export type LastResult = z.infer<typeof lastResultSchema>;
/** Last results by tool id; a tool with none has no entry. */
export interface LastResults {
  readonly [toolId: string]: LastResult | undefined;
}

const storedSchema = z.record(z.string(), z.unknown());

/**
 * Pure: the usable entries in a stored value. Damaged JSON, entries that fail
 * the schema and ids that are no longer tools are dropped one by one, so a bad
 * entry never hides a good one.
 */
export function parseLastResults(raw: string | undefined): LastResults {
  if (!raw) return {};
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }
  const stored = storedSchema.safeParse(json);
  if (!stored.success) return {};
  const results: { [toolId: string]: LastResult } = {};
  for (const [id, entry] of Object.entries(stored.data)) {
    // Also drops results stored before a tool was found not to keep its inputs.
    if (!recordsLastResult(id)) continue;
    const parsed = lastResultSchema.safeParse(entry);
    if (parsed.success) results[id] = parsed.data;
  }
  return results;
}

export function getLastResults(): LastResults {
  return parseLastResults(storage.getString(KEY));
}

export function recordLastResult(toolId: RecordingToolId, text: string): void {
  if (text === '') return;
  const next = { ...getLastResults(), [toolId]: { text } };
  storage.set(KEY, JSON.stringify(next));
}

/** Every tool's last result, re-read whenever one is recorded. */
export function useLastResults(): LastResults {
  const [raw] = useMMKVString(KEY, storage);
  return useMemo(() => parseLastResults(raw), [raw]);
}
