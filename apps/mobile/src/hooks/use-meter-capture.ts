import * as MediaLibrary from 'expo-media-library';
import { type RefObject, useCallback, useMemo, useState } from 'react';
import type { CameraPhotoOutput } from 'react-native-vision-camera';
import { useLensesForCamera } from '@/hooks/use-film-log';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import { lastUsedLensId } from '@/lib/film-log-options';
import {
  deletePhotoFile,
  photoUri,
  savePhoto,
  shouldGrayscale,
} from '@/lib/film-log-photos';
import { addShot } from '@/lib/film-log-storage';
import { getSaveMeterPhotosToLibrary } from '@/lib/photo-settings';
import type { ShotPhoto } from '@/schemas/film-log.schema';

interface Pending {
  photo: ShotPhoto;
  aperture: number;
  shutterSpeed: number;
  iso: number;
}

export function useMeterCapture(
  photoOutputRef: RefObject<CameraPhotoOutput | null>
) {
  const { roll: activeRoll } = useMeterRoll();
  const lenses = useLensesForCamera(activeRoll?.cameraId);
  // Last lens used on this roll, pre-selected in the confirm sheet. Undefined on
  // a roll's first shot, where the sheet then requires the user to pick one.
  const defaultLensId = useMemo(
    () => (activeRoll ? lastUsedLensId(activeRoll.shots) : undefined),
    [activeRoll]
  );
  const [pending, setPending] = useState<Pending | null>(null);

  const capture = useCallback(
    async (settings: {
      aperture: number;
      shutterSpeed: number;
      iso: number;
    }) => {
      const photoOutput = photoOutputRef.current;
      if (!photoOutput || !activeRoll) return;
      // capturePhoto returns the in-memory Photo (with width/height);
      // saveToTemporaryFileAsync writes to a temp path (no file:// scheme).
      const captured = await photoOutput.capturePhoto({}, {});
      const { width, height } = captured;
      const tempPath = await captured.saveToTemporaryFileAsync();
      captured.dispose();
      const sourceUri = tempPath.startsWith('file://')
        ? tempPath
        : `file://${tempPath}`;
      const photo = await savePhoto(sourceUri, {
        source: 'meter',
        width,
        height,
        grayscale: shouldGrayscale(activeRoll.process),
      });
      if (getSaveMeterPhotosToLibrary()) {
        try {
          const perm = await MediaLibrary.requestPermissionsAsync(true);
          // Asset.create, not the legacy createAssetAsync, which throws
          // unconditionally since expo-media-library 57.
          if (perm.granted)
            await MediaLibrary.Asset.create(photoUri(photo.fileName));
        } catch (cause) {
          // Non-fatal: keep the in-app copy, but don't hide the failure.
          if (__DEV__)
            console.warn('Saving meter photo to Photos failed', cause);
        }
      }
      setPending({ photo, ...settings });
    },
    [activeRoll, photoOutputRef]
  );

  const save = useCallback(
    (lensId: string | undefined) => {
      if (!pending || !activeRoll) return;
      addShot(activeRoll.id, {
        frameNumber:
          activeRoll.shots.reduce((m, s) => Math.max(m, s.frameNumber), 0) + 1,
        aperture: pending.aperture,
        shutterSpeed: pending.shutterSpeed,
        lensId,
        source: 'meter',
        photo: pending.photo,
        takenAt: new Date().toISOString(),
      });
      setPending(null);
    },
    [pending, activeRoll]
  );

  const discard = useCallback(() => {
    if (pending) void deletePhotoFile(pending.photo.fileName);
    setPending(null);
  }, [pending]);

  const consumeForEdit = useCallback((): string | null => {
    const f = pending?.photo.fileName ?? null;
    setPending(null); // keep the file; the shot form owns it now
    return f;
  }, [pending]);

  return {
    pending,
    activeRollId: activeRoll?.id,
    activeRollName: activeRoll?.name?.trim()
      ? activeRoll.name
      : (activeRoll?.filmStockName ?? 'roll'),
    lenses,
    defaultLensId,
    capture,
    save,
    discard,
    consumeForEdit,
  };
}
