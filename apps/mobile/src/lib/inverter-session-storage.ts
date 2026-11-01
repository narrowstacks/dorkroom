// Keeps the negative inverter's session between screens and launches: the
// source photo, copied into Library/Application Support/negative-inverter/
// (app data iOS never purges, unlike Caches, and not shown in the Files app,
// unlike Documents), and the editor state as one JSON record in its own MMKV
// instance. One file per photo under a generated name, so a future gallery
// can list the folder. The record's shape and validation live in
// components/negative-inverter/inverter-session.ts.
//
// expo-file-system 57 has no Application Support path or backup-exclusion
// flag, so the folder is found from Documents' parent (the app container),
// and the copy is included in device backups like any app data.
import { Directory, File, Paths } from 'expo-file-system';
import { createMMKV } from 'react-native-mmkv';
import {
  orphanedSources,
  parseSession,
  serializeSession,
  type SessionRecord,
} from '@/components/negative-inverter/inverter-session';
import { generateId } from '@/lib/id';

const storage = createMMKV({ id: 'dorkroom-negative-inverter' });
const SESSION_KEY = 'session';

const folder = () =>
  new Directory(
    Paths.document.parentDirectory,
    'Library',
    'Application Support',
    'negative-inverter'
  );

/** The stored photo's URI. */
export function sourceUri(fileName: string): string {
  return new File(folder(), fileName).uri;
}

/**
 * Copy a photo (the picker's or the camera's temporary file) into the
 * inverter's folder and return its new file name.
 */
export function storeSource(uri: string): string {
  const dir = folder();
  dir.create({ intermediates: true, idempotent: true });
  const from = new File(uri);
  const extension = from.extension || '.jpg';
  const fileName = `${generateId()}${extension}`;
  from.copy(new File(dir, fileName));
  return fileName;
}

/** Best-effort delete of a stored photo; never throws. */
export function deleteSource(fileName: string | null): void {
  if (!fileName) return;
  try {
    const file = new File(folder(), fileName);
    if (file.exists) file.delete();
  } catch {
    // A leftover file is only wasted space; the next replace or discard
    // removes the session that pointed at it.
  }
}

/** The stored session, or null when there is none, it does not parse, or
 *  its photo is gone. */
export function readSession(): SessionRecord | null {
  const record = parseSession(storage.getString(SESSION_KEY));
  if (!record) return null;
  try {
    if (new File(folder(), record.fileName).exists) return record;
  } catch {
    // Treated as a missing photo below.
  }
  return null;
}

export function writeSession(record: SessionRecord): void {
  storage.set(SESSION_KEY, serializeSession(record));
}

/** Forget the session; its photo is deleted separately. */
export function clearSession(): void {
  storage.remove(SESSION_KEY);
}

/** Delete every photo in the folder except `keep`; never throws. Run before
 *  any load starts, so no copy in flight can be swept. */
export function sweepSources(keep: string | null): void {
  try {
    const dir = folder();
    if (!dir.exists) return;
    const names = dir
      .list()
      .filter((entry) => entry instanceof File)
      .map((file) => file.name);
    for (const name of orphanedSources(names, keep)) deleteSource(name);
  } catch {
    // Leftovers are only wasted space; the next launch tries again.
  }
}
