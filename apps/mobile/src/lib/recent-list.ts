import { z } from 'zod';

// A short most-recent-first list of ids (recently used tools, recently opened
// recipes). Pure, so the rules are tested apart from the MMKV store that keeps
// the list.

const idSchema = z.string().min(1);

/** Anything that isn't a JSON array decodes as empty. */
const storedListSchema = z.array(z.unknown()).catch([]);

/** A stored value back to a list of ids; anything malformed is an empty list. */
export function parseRecentIds(raw: string | undefined): string[] {
  if (!raw) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  // Entries are decoded one at a time so one bad entry can't discard the rest.
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of storedListSchema.parse(json)) {
    const id = idSchema.safeParse(entry);
    if (!id.success || seen.has(id.data)) continue;
    seen.add(id.data);
    ids.push(id.data);
  }
  return ids;
}

/** `id` moved to the front of `list`, the list capped at `max` entries. */
export function recordRecentId(
  list: readonly string[],
  id: string,
  max: number
): string[] {
  return [id, ...list.filter((entry) => entry !== id)].slice(0, max);
}
