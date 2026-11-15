// A dev client built before expo-maps was added has no `ExpoMaps` native
// module, and expo-maps throws the moment it is imported. The loader must
// check first, never import it, warn once in development and return null, so
// the map screen can show its "needs the latest app build" state.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createAppleMapsLoader,
  FRAME_MAP_UNAVAILABLE,
  frameMapView,
  loadAppleMaps,
} from './frame-map-native';
// `expo` and `expo-maps` resolve to src/test stand-ins (vitest.config.ts): the
// first reports every native module missing, the second throws if imported.

describe('loadAppleMaps without the ExpoMaps native module', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeAll(() => {
    vi.stubGlobal('__DEV__', true);
  });

  it('returns null without importing expo-maps, and warns once', () => {
    expect(loadAppleMaps()).toBeNull();
    expect(loadAppleMaps()).toBeNull();
    expect('__expoMapsImported' in globalThis).toBe(false);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([
      FRAME_MAP_UNAVAILABLE,
    ]);
  });
});

describe('createAppleMapsLoader with the native modules but a failing import', () => {
  it('returns null, warns once and never throws; the screen asks for a build', () => {
    const warn = vi.fn();
    const requireMaps = vi.fn(() => {
      throw new Error('stale bundle');
    });
    const load = createAppleMapsLoader({
      hasNativeModule: () => true,
      requireMaps,
      warn,
    });
    expect(() => load()).not.toThrow();
    expect(load()).toBeNull();
    expect(requireMaps).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(
      frameMapView({
        hasLocations: true,
        hasMap: load() !== null,
        safelight: false,
        showInSafelight: false,
      })
    ).toBe('needs-build');
  });

  it('asks for both native modules before requiring', () => {
    const asked: string[] = [];
    const requireMaps = vi.fn(() => {
      throw new Error('must not be called');
    });
    const load = createAppleMapsLoader({
      hasNativeModule: (name) => {
        asked.push(name);
        return name === 'ExpoMaps';
      },
      requireMaps,
      warn: () => {},
    });
    expect(load()).toBeNull();
    expect(asked).toEqual(['ExpoMaps', 'ExpoAppleMaps']);
    expect(requireMaps).not.toHaveBeenCalled();
  });
});

describe('frameMapView', () => {
  const base = {
    hasLocations: true,
    hasMap: true,
    safelight: false,
    showInSafelight: false,
  };

  it('picks what shows in the map place', () => {
    expect(frameMapView({ ...base, hasLocations: false })).toBe('no-locations');
    expect(frameMapView({ ...base, hasMap: false })).toBe('needs-build');
    expect(frameMapView({ ...base, safelight: true })).toBe('safelight');
    expect(
      frameMapView({ ...base, safelight: true, showInSafelight: true })
    ).toBe('map');
    expect(frameMapView(base)).toBe('map');
  });
});
