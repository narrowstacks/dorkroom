import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));
vi.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  }),
}));
vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  makeDirectoryAsync: vi.fn(async () => {}),
  copyAsync: vi.fn(async () => {}),
  deleteAsync: vi.fn(async () => {}),
  getInfoAsync: vi.fn(async () => ({ exists: false })),
}));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {} }));

import { PHOTO_DIR, photoUri, shouldGrayscale } from './film-log-photos';

describe('film-log-photos helpers', () => {
  it('PHOTO_DIR is under the document directory', () => {
    expect(PHOTO_DIR).toBe('file:///docs/film-log/');
  });

  it('photoUri joins the dir and filename', () => {
    expect(photoUri('abc.jpg')).toBe('file:///docs/film-log/abc.jpg');
  });

  it('shouldGrayscale only for bw', () => {
    expect(shouldGrayscale('bw')).toBe(true);
    expect(shouldGrayscale('color')).toBe(false);
    expect(shouldGrayscale('slide')).toBe(false);
  });
});
