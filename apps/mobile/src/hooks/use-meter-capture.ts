import * as MediaLibrary from 'expo-media-library';
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { CameraPhotoOutput } from 'react-native-vision-camera';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import {
  deletePhotoFile,
  photoUri,
  savePhoto,
  shouldGrayscale,
} from '@/lib/film-log-photos';
import {
  landCapture,
  rollChanged,
  takeCapture,
} from '@/lib/meter-capture-keeping';
import { getSaveMeterPhotosToLibrary } from '@/lib/photo-settings';
import type { FilmRoll, ShotPhoto } from '@/schemas/film-log.schema';

interface CaptureSettings {
  aperture: number;
  shutterSpeed: number;
  iso: number;
}

interface Pending {
  /** The roll the capture was taken for; it is logged there or nowhere. */
  rollId: string;
  /** The photo's file name, which keys the capture. */
  fileName: string;
  photo: ShotPhoto;
  aperture: number;
  shutterSpeed: number;
  iso: number;
}

export function useMeterCapture(
  photoOutputRef: RefObject<CameraPhotoOutput | null>
) {
  const { roll: activeRoll } = useMeterRoll();
  const [pending, setPending] = useState<Pending | null>(null);
  // The current capture, read by the actions below so a call from a stale
  // closure never acts on a capture that was already logged or handed off.
  const pendingRef = useRef<Pending | null>(null);
  // The roll the meter is on now, for a capture that finishes saving later.
  const activeRollIdRef = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    activeRollIdRef.current = activeRoll?.id;
  });
  const inFlight = useRef(false);
  const mounted = useRef(false);
  // A capture still waiting when the meter goes away (a warm link resetting the
  // stack) has nowhere to be logged: its file goes with it. One already logged
  // or handed to the shot form was taken from the ref, so it is not touched.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = pendingRef.current;
      pendingRef.current = null;
      if (current) void deletePhotoFile(current.fileName);
    };
  }, []);
  const setCurrent = useCallback((next: Pending | null) => {
    pendingRef.current = next;
    setPending(next);
  }, []);

  const store = useCallback(
    async (
      photoOutput: CameraPhotoOutput,
      target: FilmRoll,
      settings: CaptureSettings
    ) => {
      try {
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
          grayscale: shouldGrayscale(target.process),
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
        // It lands only if the meter is still on the roll it was taken for, and
        // it replaces (and deletes) an earlier capture still waiting.
        if (!mounted.current) {
          void deletePhotoFile(photo.fileName);
          return;
        }
        const landed = landCapture(
          pendingRef.current,
          {
            rollId: target.id,
            fileName: photo.fileName,
            photo,
            ...settings,
          },
          activeRollIdRef.current
        );
        for (const file of landed.discard) void deletePhotoFile(file);
        if (landed.current !== pendingRef.current) setCurrent(landed.current);
      } catch (cause) {
        // Nothing was handed to the sheet: say so in development, and let the
        // next press try again.
        if (__DEV__) console.warn('Meter capture failed', cause);
      } finally {
        inFlight.current = false;
      }
    },
    [setCurrent]
  );

  /**
   * Starts a capture and says at once whether the press was accepted, so the
   * caller flashes the screen only for a photo that is being taken. A press
   * while one is still saving, or with no roll, is not.
   */
  const capture = useCallback(
    (settings: CaptureSettings): boolean => {
      const photoOutput = photoOutputRef.current;
      if (!photoOutput || !activeRoll || inFlight.current) return false;
      inFlight.current = true;
      void store(photoOutput, activeRoll, settings);
      return true;
    },
    [activeRoll, photoOutputRef, store]
  );

  /** Takes the capture for `fileName` if it is still the current one. */
  const take = useCallback(
    (fileName: string): Pending | null => {
      const result = takeCapture(pendingRef.current, fileName);
      if (result.taken) setCurrent(result.current);
      return result.taken;
    },
    [setCurrent]
  );

  // The log sheet stored the shot and now owns the photo file: drop the capture
  // without deleting it.
  const clear = useCallback((fileName: string) => void take(fileName), [take]);

  const discard = useCallback(
    (fileName: string) => {
      const taken = take(fileName);
      if (taken) void deletePhotoFile(taken.photo.fileName);
    },
    [take]
  );

  const consumeForEdit = useCallback(
    (fileName: string): string | null =>
      // Keep the file; the shot form owns it now.
      take(fileName)?.photo.fileName ?? null,
    [take]
  );

  // The roll went away (finished, deleted) or the meter moved to another one:
  // the capture has nowhere to be logged, so its file goes with it.
  const activeRollId = activeRoll?.id;
  useEffect(() => {
    const kept = rollChanged(pendingRef.current, activeRollId);
    if (kept.current === pendingRef.current) return;
    for (const file of kept.discard) void deletePhotoFile(file);
    setCurrent(kept.current);
  }, [activeRollId, setCurrent]);

  return {
    pending,
    /** The roll the meter logs to; the capture is logged onto it. */
    roll: activeRoll,
    capture,
    clear,
    discard,
    consumeForEdit,
  };
}
