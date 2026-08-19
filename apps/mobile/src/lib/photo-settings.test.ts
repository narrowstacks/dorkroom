import { beforeEach, describe, expect, it } from 'vitest';
import { meterStorage } from '@/lib/meter-settings';
import {
  getSaveMeterPhotosToLibrary,
  setSaveMeterPhotosToLibrary,
} from './photo-settings';

describe('photo-settings', () => {
  beforeEach(() => meterStorage.clearAll());
  it('defaults to false', () => {
    expect(getSaveMeterPhotosToLibrary()).toBe(false);
  });
  it('round-trips true', () => {
    setSaveMeterPhotosToLibrary(true);
    expect(getSaveMeterPhotosToLibrary()).toBe(true);
  });
});
