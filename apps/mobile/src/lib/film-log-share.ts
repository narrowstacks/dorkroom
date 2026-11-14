// Ships film-log exports through the iOS share sheet via the RN core `Share`
// API (no extra native dep). The JSON payload shape lives in
// `film-log-export.ts`, the CSV format in `film-log-csv.ts`, the GPX format in
// `film-log-gpx.ts`.
//
// A file is shared by handing `Share.share` its `file://` URL: on iOS that opens
// the share sheet with the file itself (name and type from the path), so
// `expo-sharing` is not needed.
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Share } from 'react-native';
import { shouldIgnoreExportTap } from '@/lib/export-tap-guard';
import { csvFileName, gpxFileName, rollToCsv } from '@/lib/film-log-csv';
import { buildRollsExport } from '@/lib/film-log-export';
import { buildRollGpx } from '@/lib/film-log-gpx';
import { getCameras, getLenses, getRolls } from '@/lib/film-log-storage';
import type { FilmRoll } from '@/schemas/film-log.schema';

/** Opens the share sheet with the full log serialized as pretty JSON. */
export async function shareRollsAsJson(): Promise<void> {
  const payload = buildRollsExport({
    rolls: getRolls(),
    cameras: getCameras(),
    lenses: getLenses(),
    exportedAt: new Date().toISOString(),
  });
  await Share.share({ message: JSON.stringify(payload, null, 2) });
}

// Exports (CSV and GPX) live alone in one cache folder. Before each export
// every file except the one about to be written is removed (a share extension
// may still be reading the previous one), so old files never pile up.
const EXPORT_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}film-log-exports/`;

// Blocks a second tap while an export is being prepared. It is cleared once
// `Share.share` has been CALLED, not when it settles: on iOS, picking a target
// and then cancelling inside it settles neither callback, so a flag cleared on
// settle could stick forever. The sheet is modal from the call on. One flag
// for both formats: only one share sheet can be up at a time.
let exporting = false;
// A second tap within a second of the share call is also ignored (see
// `export-tap-guard.ts`): iOS takes
// a moment to present the sheet, and a very fast double tap could slip in.
let lastShareCall = 0;

interface RollFile {
  fileName: string;
  contents: string;
}

interface RollNames {
  cameraName: string;
  lensName: (id: string | undefined) => string | undefined;
}

interface RollExport {
  /** "CSV", "GPX file": the thing that could not be created. */
  what: string;
  /** The file, or a message to show when there is nothing to export. */
  build: (roll: FilmRoll, names: RollNames) => RollFile | { empty: string };
}

function failed(what: string, error: string): void {
  if (__DEV__) console.warn(`${what} export failed`, error);
  Alert.alert('Export failed', `The ${what} could not be created. Try again.`);
}

// Writes one roll's file to the cache and opens the share sheet with it. Never
// throws: a failure shows an alert.
async function shareRollFile(
  rollId: string,
  format: RollExport
): Promise<void> {
  if (shouldIgnoreExportTap({ exporting, now: Date.now(), lastShareCall })) {
    return;
  }
  exporting = true;
  try {
    const roll = getRolls().find((candidate) => candidate.id === rollId);
    if (!roll) {
      exporting = false;
      Alert.alert('Export failed', 'That roll no longer exists.');
      return;
    }
    const cameraName =
      getCameras().find((camera) => camera.id === roll.cameraId)?.name ??
      'Unknown camera';
    const lensNames = new Map(getLenses().map((lens) => [lens.id, lens.name]));
    const file = format.build(roll, {
      cameraName,
      lensName: (id) => (id ? lensNames.get(id) : undefined),
    });
    if ('empty' in file) {
      exporting = false;
      Alert.alert('Nothing to export', file.empty);
      return;
    }

    await FileSystem.makeDirectoryAsync(EXPORT_DIR, { intermediates: true });
    const existing = await FileSystem.readDirectoryAsync(EXPORT_DIR);
    // Best-effort cleanup: a file that cannot be deleted never fails the export.
    await Promise.allSettled(
      existing
        .filter((name) => name !== file.fileName)
        .map((name) =>
          FileSystem.deleteAsync(`${EXPORT_DIR}${name}`, { idempotent: true })
        )
    );
    const uri = `${EXPORT_DIR}${file.fileName}`;
    await FileSystem.writeAsStringAsync(uri, file.contents);
    const pending = Share.share({ url: uri });
    lastShareCall = Date.now();
    exporting = false;
    pending.catch((error) => failed(format.what, String(error)));
  } catch (error) {
    exporting = false;
    failed(format.what, String(error));
  }
}

const CSV_EXPORT: RollExport = {
  what: 'CSV',
  build: (roll, names) => ({
    fileName: csvFileName(roll, names.cameraName),
    contents: rollToCsv(roll, names),
  }),
};

// RN's `Share.share` takes no MIME type on iOS: the share sheet types the file
// from its `.gpx` extension (`application/gpx+xml`).
const GPX_EXPORT: RollExport = {
  what: 'GPX file',
  build: (roll, names) => {
    const { gpx, waypoints } = buildRollGpx(roll, roll.shots, {
      lensName: names.lensName,
      exportedAt: new Date(),
    });
    if (waypoints === 0) {
      return { empty: 'No frame on this roll has a location.' };
    }
    return { fileName: gpxFileName(roll, names.cameraName), contents: gpx };
  },
};

/** Writes one roll as a CSV to the cache and opens the share sheet with it.
 * Never throws: a failure shows an alert. */
export function shareRollAsCsv(rollId: string): Promise<void> {
  return shareRollFile(rollId, CSV_EXPORT);
}

/** Writes the roll's located frames as GPX waypoints and opens the share
 * sheet with the file. Never throws: a failure shows an alert. */
export function shareRollAsGpx(rollId: string): Promise<void> {
  return shareRollFile(rollId, GPX_EXPORT);
}
