// Ships film-log exports through the iOS share sheet via the RN core `Share`
// API (no extra native dep). The JSON payload shape lives in
// `film-log-export.ts`, the CSV format in `film-log-csv.ts`.
//
// A file is shared by handing `Share.share` its `file://` URL: on iOS that opens
// the share sheet with the file itself (name and type from the path), so
// `expo-sharing` is not needed.
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Share } from 'react-native';
import { shouldIgnoreExportTap } from '@/lib/export-tap-guard';
import { csvFileName, rollToCsv } from '@/lib/film-log-csv';
import { buildRollsExport } from '@/lib/film-log-export';
import { getCameras, getLenses, getRolls } from '@/lib/film-log-storage';

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

// CSVs live alone in one cache folder. Before each export every file except the
// one about to be written is removed (a share extension may still be reading
// the previous one), so old files never pile up.
const EXPORT_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}film-log-exports/`;

const FAILED_MESSAGE = 'The CSV could not be created. Try again.';

// Blocks a second tap while an export is being prepared. It is cleared once
// `Share.share` has been CALLED, not when it settles: on iOS, picking a target
// and then cancelling inside it settles neither callback, so a flag cleared on
// settle could stick forever. The sheet is modal from the call on.
let exporting = false;
// A second tap within a second of the share call is also ignored (see
// `export-tap-guard.ts`): iOS takes
// a moment to present the sheet, and a very fast double tap could slip in.
let lastShareCall = 0;

function failed(error: string): void {
  if (__DEV__) console.warn('CSV export failed', error);
  Alert.alert('Export failed', FAILED_MESSAGE);
}

/** Writes one roll as a CSV to the cache and opens the share sheet with it.
 * Never throws: a failure shows an alert. */
export async function shareRollAsCsv(rollId: string): Promise<void> {
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
    const csv = rollToCsv(roll, {
      cameraName,
      lensName: (id) => (id ? lensNames.get(id) : undefined),
    });

    const fileName = csvFileName(roll, cameraName);
    await FileSystem.makeDirectoryAsync(EXPORT_DIR, { intermediates: true });
    const existing = await FileSystem.readDirectoryAsync(EXPORT_DIR);
    // Best-effort cleanup: a file that cannot be deleted never fails the export.
    await Promise.allSettled(
      existing
        .filter((name) => name !== fileName)
        .map((name) =>
          FileSystem.deleteAsync(`${EXPORT_DIR}${name}`, { idempotent: true })
        )
    );
    const uri = `${EXPORT_DIR}${fileName}`;
    await FileSystem.writeAsStringAsync(uri, csv);
    const pending = Share.share({ url: uri });
    lastShareCall = Date.now();
    exporting = false;
    pending.catch((error) => failed(String(error)));
  } catch (error) {
    exporting = false;
    failed(String(error));
  }
}
