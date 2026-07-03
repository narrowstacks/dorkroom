import { createMMKV } from 'react-native-mmkv';
import { generateId } from '@/lib/id';

const storage = createMMKV({ id: 'dorkroom-client-id' });
const KEY = 'clientId';

/**
 * Stable per-install identity sent as `X-Client-Id` so the shared public API
 * key can be rate-limited per device instead of globally (see
 * `apps/mobile/src/lib/api-config.ts`). Not a secret, and not a tracking
 * identifier: it's wiped with the app on uninstall and never synced or
 * derived from hardware. A reinstall mints a fresh id, which is deliberate.
 */
export function getClientId(): string {
  const existing = storage.getString(KEY);
  if (existing) {
    return existing;
  }
  const created = generateId();
  storage.set(KEY, created);
  return created;
}
