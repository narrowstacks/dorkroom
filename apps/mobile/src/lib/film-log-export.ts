// JSON export format for the film log: data in → plain object out, with no
// native dependencies, so it runs (and is tested) outside the app. The share
// sheet that ships this payload lives in `film-log-share.ts`.
//
// TODO(export): a real `.json` *file* share (expo-file-system + expo-sharing,
// needs a dev build) and Lightroom/XMP/CSV formats are deferred follow-ups.
import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
import { frameLensName } from '@/lib/camera-lenses';
import { cameraDisplayName } from '@/lib/gear-display';
import type {
  Camera,
  CustomBrand,
  CustomMount,
  FilmRoll,
  Lens,
} from '@/schemas/film-log.schema';

export const FILM_LOG_EXPORT_VERSION = 1;

interface ExportInput {
  rolls: FilmRoll[];
  cameras: Camera[];
  lenses: Lens[];
  /** Brands and mounts the user added (#733); absent in older exports. */
  customBrands?: CustomBrand[];
  customMounts?: CustomMount[];
  exportedAt: string;
}

/** Pure: resolves camera/lens names onto each roll/shot so the export is portable. */
export function buildRollsExport({
  rolls,
  cameras,
  lenses,
  customBrands = [],
  customMounts = [],
  exportedAt,
}: ExportInput) {
  const cameraName = (id: string | undefined) => {
    const camera = cameras.find((candidate) => candidate.id === id);
    return camera ? cameraDisplayName(camera) : undefined;
  };
  const lensName = (id: string) => lenses.find((lens) => lens.id === id)?.name;

  return {
    app: 'dorkroom',
    kind: 'film-log',
    version: FILM_LOG_EXPORT_VERSION,
    exportedAt,
    cameras,
    lenses,
    customBrands,
    customMounts,
    rolls: rolls.map((roll) => ({
      ...roll,
      cameraName: cameraName(roll.cameraId),
      shots: roll.shots.map((shot) => ({
        ...shot,
        lensName: frameLensName(shot, lensName),
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
