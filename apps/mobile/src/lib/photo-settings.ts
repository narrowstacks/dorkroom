import { meterStorage } from '@/lib/meter-settings';

const KEY = 'saveMeterPhotosToLibrary';
export function getSaveMeterPhotosToLibrary(): boolean {
  return meterStorage.getBoolean(KEY) ?? false;
}
export function setSaveMeterPhotosToLibrary(value: boolean): void {
  meterStorage.set(KEY, value);
}
export const SAVE_METER_PHOTOS_KEY = KEY;
