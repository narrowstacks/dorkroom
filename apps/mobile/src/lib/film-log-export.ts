// JSON export for the film log. `buildRollsExport` is pure (data in → plain
// object out) so it's unit-testable; `shareRollsAsJson` reads the stores and
// opens the iOS share sheet via the RN core `Share` API (no extra native dep).
//
// TODO(export): a real `.json` *file* share (expo-file-system + expo-sharing,
// needs a dev build) and Lightroom/XMP/CSV formats are deferred follow-ups.
import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
import { Share } from 'react-native';
import { getCameras, getLenses, getRolls } from '@/lib/film-log-storage';
import type { Camera, FilmRoll, Lens } from '@/types/film-log';

export const FILM_LOG_EXPORT_VERSION = 1;

interface ExportInput {
  rolls: FilmRoll[];
  cameras: Camera[];
  lenses: Lens[];
  exportedAt: string;
}

/** Pure: resolves camera/lens names onto each roll/shot so the export is portable. */
export function buildRollsExport({
  rolls,
  cameras,
  lenses,
  exportedAt,
}: ExportInput) {
  const cameraName = (id: string | undefined) =>
    cameras.find((camera) => camera.id === id)?.name;
  const lensName = (id: string | undefined) =>
    lenses.find((lens) => lens.id === id)?.name;

  return {
    app: 'dorkroom',
    kind: 'film-log',
    version: FILM_LOG_EXPORT_VERSION,
    exportedAt,
    cameras,
    lenses,
    rolls: rolls.map((roll) => ({
      ...roll,
      cameraName: cameraName(roll.cameraId),
      shots: roll.shots.map((shot) => ({
        ...shot,
        lensName: lensName(shot.lensId),
        apertureLabel:
          shot.aperture !== undefined
            ? formatAperture(shot.aperture)
            : undefined,
        shutterLabel:
          shot.shutterSpeed !== undefined
            ? formatShutterSpeed(shot.shutterSpeed)
            : undefined,
      })),
    })),
  };
}

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
