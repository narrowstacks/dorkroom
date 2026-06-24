// Owns the on-disk photo files for film-log shots. Files live under
// documentDirectory/film-log/; callers store only the bare filename. The Skia
// grayscale pass is isolated in toGrayscale so the rest stays Skia-free and the
// later databack imprint can reuse the same plumbing.
import { ImageFormat, Skia } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import { generateId } from '@/lib/id';
import type { FilmProcess, ShotPhoto } from '@/types/film-log';

if (!FileSystem.documentDirectory) {
  throw new Error('expo-file-system documentDirectory unavailable');
}

export const PHOTO_DIR = `${FileSystem.documentDirectory}film-log/`;

export function photoUri(fileName: string): string {
  return `${PHOTO_DIR}${fileName}`;
}

export function shouldGrayscale(process: FilmProcess): boolean {
  return process === 'bw';
}

export async function ensurePhotoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

// Luminance grayscale (Rec. 601) color matrix.
const GRAYSCALE_MATRIX = [
  0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0,
  0, 0, 0, 0, 1, 0,
];

/** Desaturate the image at sourceUri and write a new temp JPEG; returns its uri. */
export async function toGrayscale(sourceUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const data = Skia.Data.fromBase64(base64);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not decode image for grayscale');
  const width = image.width();
  const height = image.height();
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Could not create Skia surface');
  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(GRAYSCALE_MATRIX));
  surface.getCanvas().drawImage(image, 0, 0, paint);
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const outBase64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);
  const outUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}grayscale-${generateId()}.jpg`;
  await FileSystem.writeAsStringAsync(outUri, outBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outUri;
}

export async function savePhoto(
  sourceUri: string,
  opts: {
    source: 'meter' | 'library';
    width: number;
    height: number;
    grayscale: boolean;
  }
): Promise<ShotPhoto> {
  await ensurePhotoDir();
  const fileName = `${generateId()}.jpg`;
  const dest = photoUri(fileName);
  // Convert to grayscale for B&W rolls; if the source can't be decoded (e.g. an
  // unexpected format), fall back to the original in colour rather than failing
  // the whole capture.
  let from = sourceUri;
  // The grayscale pass writes a temp JPEG that copyAsync duplicates into
  // PHOTO_DIR; track it so we can delete the temp after the copy.
  let tempGrayscale: string | undefined;
  let grayscaleApplied = false;
  if (opts.grayscale) {
    try {
      from = await toGrayscale(sourceUri);
      tempGrayscale = from;
      grayscaleApplied = true;
    } catch (error) {
      console.warn(
        'film-log: grayscale conversion failed, saving colour',
        error
      );
    }
  }
  try {
    await FileSystem.copyAsync({ from, to: dest });
  } finally {
    if (tempGrayscale) await deletePhotoFileAt(tempGrayscale);
  }
  return {
    fileName,
    width: opts.width,
    height: opts.height,
    capturedAt: new Date().toISOString(),
    source: opts.source,
    grayscale: grayscaleApplied,
  };
}

/** Best-effort delete of a file at an absolute uri; never throws. */
async function deletePhotoFileAt(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort; a missing file must never block a data mutation.
  }
}

export async function deletePhotoFile(fileName: string): Promise<void> {
  await deletePhotoFileAt(photoUri(fileName));
}
