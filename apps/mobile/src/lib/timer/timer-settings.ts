import { useMMKVBoolean } from 'react-native-mmkv';
import { preferencesStorage } from '@/lib/measurement-settings';

/**
 * Whether the in-app timer sounds play while the iPhone's silent switch is on.
 * Off by default: the switch is respected, so a darkroom phone left silent stays
 * silent and the haptics carry the cue. Alerts delivered while the app is in
 * the background are system notifications and always follow the switch.
 */
export const CUES_IN_SILENT_MODE_KEY = 'dorkroom-timer-cues-in-silent-mode';

export function getCuesInSilentMode(): boolean {
  return preferencesStorage.getBoolean(CUES_IN_SILENT_MODE_KEY) ?? false;
}

export function useCuesInSilentMode(): readonly [
  boolean,
  (v: boolean) => void,
] {
  const [raw, setRaw] = useMMKVBoolean(
    CUES_IN_SILENT_MODE_KEY,
    preferencesStorage
  );
  return [raw ?? false, (v: boolean) => setRaw(v)] as const;
}
