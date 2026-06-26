import { useMMKVBoolean } from 'react-native-mmkv';
import { useRolls } from '@/hooks/use-film-log';
import { meterStorage } from '@/lib/meter-settings';

const KEY = 'linkFilmLog';

/**
 * Whether the light meter is linked to the film log — i.e. shows the roll pill
 * and EI lock, pins ISO to the roll's EI, and logs shots from the shutter. When
 * off, the meter is a clean, standalone tool with none of that chrome.
 *
 * The default tracks whether the user has any rolls: on when the film log has
 * content, off when it's empty (so a meter-only user gets a clear viewfinder
 * without opting out). Once the user flips the toggle, that explicit choice wins.
 */
export function useLinkFilmLog(): readonly [boolean, (v: boolean) => void] {
  const hasRolls = useRolls().length > 0;
  const [raw, setRaw] = useMMKVBoolean(KEY, meterStorage);
  return [raw ?? hasRolls, (v: boolean) => setRaw(v)] as const;
}
