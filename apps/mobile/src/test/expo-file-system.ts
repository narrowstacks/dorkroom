// In-memory stand-in for the `expo-file-system/legacy` API: the real module only
// forwards to the Expo native runtime, so it can neither load nor answer outside
// the app. This covers the slice the film log uses — directories, copies, deletes
// and string reads/writes — with the same error semantics, so tests exercise the
// real photo code. File contents are opaque strings: `encoding` is accepted and
// ignored, and nothing in the app round-trips encoded bytes through a test.
const files = new Map<string, string>();
const directories = new Set<string>();

export const documentDirectory = 'file:///test/documents/';
export const cacheDirectory = 'file:///test/cache/';

export const EncodingType = { UTF8: 'utf8', Base64: 'base64' } as const;

/** Drops every file and re-seeds the two root directories. */
export function resetFileSystem(): void {
  files.clear();
  directories.clear();
  directories.add(documentDirectory);
  directories.add(cacheDirectory);
}

resetFileSystem();

const parentOf = (uri: string): string =>
  uri.slice(0, uri.lastIndexOf('/') + 1);

interface FileInfo {
  exists: boolean;
  uri: string;
  isDirectory: boolean;
  size?: number;
}

export async function getInfoAsync(uri: string): Promise<FileInfo> {
  if (directories.has(uri)) return { exists: true, uri, isDirectory: true };
  const contents = files.get(uri);
  if (contents === undefined) return { exists: false, uri, isDirectory: false };
  return { exists: true, uri, isDirectory: false, size: contents.length };
}

export async function makeDirectoryAsync(
  uri: string,
  options?: { intermediates?: boolean }
): Promise<void> {
  if (directories.has(uri)) {
    if (options?.intermediates) return;
    throw new Error(`Directory '${uri}' already exists`);
  }
  if (!options?.intermediates && !directories.has(parentOf(uri))) {
    throw new Error(`Directory '${parentOf(uri)}' does not exist`);
  }
  directories.add(uri);
}

export async function copyAsync({
  from,
  to,
}: {
  from: string;
  to: string;
}): Promise<void> {
  const contents = files.get(from);
  if (contents === undefined) throw new Error(`File '${from}' does not exist`);
  if (!directories.has(parentOf(to))) {
    throw new Error(`Directory '${parentOf(to)}' does not exist`);
  }
  files.set(to, contents);
}

export async function deleteAsync(
  uri: string,
  options?: { idempotent?: boolean }
): Promise<void> {
  if (!files.delete(uri) && !directories.delete(uri) && !options?.idempotent) {
    throw new Error(`File '${uri}' does not exist and could not be deleted`);
  }
}

export async function readAsStringAsync(
  uri: string,
  _options?: { encoding?: string }
): Promise<string> {
  const contents = files.get(uri);
  if (contents === undefined) {
    throw new Error(`File '${uri}' does not exist and could not be read`);
  }
  return contents;
}

export async function writeAsStringAsync(
  uri: string,
  contents: string,
  _options?: { encoding?: string }
): Promise<void> {
  if (!directories.has(parentOf(uri))) {
    throw new Error(`Directory '${parentOf(uri)}' does not exist`);
  }
  files.set(uri, contents);
}
