// The Apple Maps view from `expo-maps`, loaded only when the build has it.
// expo-maps calls `requireNativeModule('ExpoMaps')` the moment it is imported,
// which throws in a dev client built before it was added (and under vitest), so
// it is required lazily and only once both of its native modules are known to
// exist. That case returns null, with one warning in development, and the map
// screen shows "Map needs the latest app build" instead of crashing.
//
// Privacy: nothing here asks for location. The map is given frame coordinates
// only as markers and a camera; the user-location dot and button stay off.
import { requireOptionalNativeModule } from 'expo';

type MapsModule = typeof import('expo-maps');
export type AppleMapsApi = MapsModule['AppleMaps'];

export const FRAME_MAP_UNAVAILABLE =
  'Frame map unavailable: this dev client lacks the ExpoMaps module. ' +
  'Rebuild it (a native build) to see a roll on a map.';

/** What the map screen shows in the map's place. */
export type FrameMapView = 'no-locations' | 'needs-build' | 'safelight' | 'map';

/** The message for `needs-build`. */
export const MAP_NEEDS_BUILD = 'Map needs the latest app build.';

export function frameMapView(state: {
  hasLocations: boolean;
  hasMap: boolean;
  safelight: boolean;
  showInSafelight: boolean;
}): FrameMapView {
  if (!state.hasLocations) return 'no-locations';
  if (!state.hasMap) return 'needs-build';
  if (state.safelight && !state.showInSafelight) return 'safelight';
  return 'map';
}

export interface AppleMapsLoaderDeps {
  hasNativeModule: (name: string) => boolean;
  /** `require('expo-maps')`; may throw. */
  requireMaps: () => MapsModule;
  warn: (message: string) => void;
}

/**
 * A loader that checks both native modules before requiring expo-maps, and
 * returns null (warning once) when either is missing or the require throws.
 * The result is cached.
 */
export function createAppleMapsLoader(
  deps: AppleMapsLoaderDeps
): () => AppleMapsApi | null {
  let loaded: AppleMapsApi | null | undefined;
  const unavailable = (): null => {
    deps.warn(FRAME_MAP_UNAVAILABLE);
    return null;
  };
  return () => {
    if (loaded !== undefined) return loaded;
    if (
      !deps.hasNativeModule('ExpoMaps') ||
      !deps.hasNativeModule('ExpoAppleMaps')
    ) {
      loaded = unavailable();
      return loaded;
    }
    try {
      loaded = deps.requireMaps().AppleMaps;
    } catch {
      loaded = unavailable();
    }
    return loaded;
  };
}

function isDevelopment(): boolean {
  try {
    return __DEV__;
  } catch {
    return false;
  }
}

/** The `AppleMaps` namespace, or null when this build has no map. Cached. */
export const loadAppleMaps = createAppleMapsLoader({
  hasNativeModule: (name) => requireOptionalNativeModule(name) !== null,
  requireMaps: () => require('expo-maps'),
  warn: (message) => {
    if (isDevelopment()) console.warn(message);
  },
});
