import { describe, expect, it } from 'vitest';
import { PHOTO_DIR, photoUri, shouldGrayscale } from './film-log-photos';

// The runner points 'expo-file-system/legacy' at src/test/expo-file-system.ts,
// whose documentDirectory is 'file:///test/documents/'. Nothing here touches
// native code: savePhoto and the Skia grayscale pass are device-verified.
describe('film-log-photos helpers', () => {
  it('PHOTO_DIR is under the document directory', () => {
    expect(PHOTO_DIR).toBe('file:///test/documents/film-log/');
  });

  it('photoUri joins the dir and filename', () => {
    expect(photoUri('abc.jpg')).toBe('file:///test/documents/film-log/abc.jpg');
  });

  it('shouldGrayscale only for bw', () => {
    expect(shouldGrayscale('bw')).toBe(true);
    expect(shouldGrayscale('color')).toBe(false);
    expect(shouldGrayscale('slide')).toBe(false);
  });
});
