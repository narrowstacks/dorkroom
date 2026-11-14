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
  expo: {
    ios: { deploymentTarget?: string };
    plugins: Array<string | [string, object]>;
  };
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

describe('Control Center controls', () => {
  it('lists with-widget-controls before expo-widgets, so it runs after it', () => {
    // It patches the extension expo-widgets regenerates on every prebuild.
    const controls = at('./plugins/with-widget-controls');
    expect(controls).toBeGreaterThanOrEqual(0);
    expect(at('expo-widgets')).toBeGreaterThan(controls);
  });

  it('builds the extension for the same iOS as the app', () => {
    // Expo's built-in `ios.deploymentTarget` sets the app target and the
    // Podfile properties, and expo-widgets reads it for the extension;
    // expo-build-properties still carries its own copy for the app and the
    // Podfile. Keep the two equal. Controls need iOS 18+.
    const buildProperties = config.expo.plugins.find(
      (p) => Array.isArray(p) && nameOf(p) === 'expo-build-properties'
    );
    const match = JSON.stringify(buildProperties).match(
      /"deploymentTarget":"([^"]+)"/
    );
    expect(match?.[1]).toBeDefined();
    expect(config.expo.ios.deploymentTarget).toBe(match?.[1]);
    expect(Number(config.expo.ios.deploymentTarget)).toBeGreaterThanOrEqual(18);
  });
});
