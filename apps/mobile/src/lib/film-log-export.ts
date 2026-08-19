// JSON export format for the film log: data in → plain object out, with no
// native dependencies, so it runs (and is tested) outside the app. The share
// sheet that ships this payload lives in `film-log-share.ts`.
//
// TODO(export): a real `.json` *file* share (expo-file-system + expo-sharing,
// needs a dev build) and Lightroom/XMP/CSV formats are deferred follow-ups.
import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
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
