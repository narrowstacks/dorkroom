// Config plugin mods run in REVERSE list order, so a plugin that must see the
// finished config has to be listed before the ones it cleans up after.
// `with-local-notifications-only` deletes `aps-environment`, which both
// expo-notifications and expo-widgets write (the widgets plugin writes it even
// with enablePushNotifications false). Listed after either, it would run first
// and the push entitlement would come back, so every signed build would need
// the Push Notifications capability.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface AppConfig {
  expo: { plugins: Array<string | [string, object]> };
}

const config: AppConfig = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'app.json'), 'utf8')
);
const nameOf = (p: string | [string, object]): string =>
  Array.isArray(p) ? p[0] : p;
const names = config.expo.plugins.map(nameOf);
const at = (name: string) => names.indexOf(name);

describe('app.json plugin order', () => {
  it('lists with-local-notifications-only before expo-notifications and expo-widgets', () => {
    const strip = at('./plugins/with-local-notifications-only');
    expect(strip).toBeGreaterThanOrEqual(0);
    expect(at('expo-notifications')).toBeGreaterThan(strip);
    expect(at('expo-widgets')).toBeGreaterThan(strip);
  });

  it('keeps push off for the widgets extension', () => {
    const entry = config.expo.plugins.find(
      (p) => Array.isArray(p) && nameOf(p) === 'expo-widgets'
    );
    expect(entry).toBeDefined();
    expect(JSON.stringify(entry)).toContain('"enablePushNotifications":false');
  });
});
