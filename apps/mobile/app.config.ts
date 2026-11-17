import type { ExpoConfig } from 'expo/config';
import pkg from './package.json';

/**
 * Turns a CalVer string from package.json into a valid iOS
 * `CFBundleShortVersionString`: one to three period-separated non-negative
 * integers. Zero-padded parts such as `2026.07.03` are normalized to
 * `2026.7.3` so the store never sees leading zeros. Anything else throws, so a
 * malformed version fails the build instead of the App Store upload.
 *
 * Lives in this file because Expo only transpiles the config file itself, not
 * local modules it imports.
 */
export function toBundleShortVersion(version: string): string {
  const parts = version.trim().split('.');
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(
      `Invalid app version "${version}": expected 1 to 3 period-separated integers (e.g. 2026.10.30).`
    );
  }
  return parts.map((p) => String(Number(p))).join('.');
}

/**
 * app.json stays the static config. This file only overrides `version`, so
 * `package.json` is the single version source: Settings
 * (`Constants.expoConfig.version`), CFBundleShortVersionString and the
 * CHANGELOG all follow it. Do not add a `version` key to app.json.
 */
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  version: toBundleShortVersion(pkg.version),
});
