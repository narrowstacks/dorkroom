import { useMMKVBoolean } from 'react-native-mmkv';
import { meterStorage } from '@/lib/meter-settings';

const KEY = 'saveMeterPhotosToLibrary';
export function getSaveMeterPhotosToLibrary(): boolean {
  return meterStorage.getBoolean(KEY) ?? false;
}
export function setSaveMeterPhotosToLibrary(value: boolean): void {
  meterStorage.set(KEY, value);
}
export const SAVE_METER_PHOTOS_KEY = KEY;

export function useSaveMeterPhotosToLibrary(): readonly [
  boolean,
  (v: boolean) => void,
] {
  const [raw, setRaw] = useMMKVBoolean(SAVE_METER_PHOTOS_KEY, meterStorage);
  return [raw ?? false, (v: boolean) => setRaw(v)] as const;
}
