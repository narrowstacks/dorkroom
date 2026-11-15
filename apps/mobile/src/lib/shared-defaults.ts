// The App Group's UserDefaults, shared with the widget extension, through the
// local Expo module in `modules/dorkroom-shared`. A dev client built before that
// module existed (or vitest) has no native module, and a build without the App
// Group entitlement makes every call throw: both fall back to "nothing stored"
// and a no-op write, with one warning in development, never a crash.
import {
  type DorkroomSharedModule,
  loadDorkroomShared,
} from '../../modules/dorkroom-shared';

export interface SharedDefaults {
  /** The stored value, or null when absent or unavailable. */
  getBool: (key: string) => boolean | null;
  setBool: (key: string, value: boolean) => void;
  /** The stored value, or null when absent, not finite or unavailable. */
  getNumber: (key: string) => number | null;
  setNumber: (key: string, value: number) => void;
  /** Asks Control Center to re-read one control kind (all of them when omitted). */
  reloadControls: (kind?: string) => void;
}

export const SHARED_DEFAULTS_UNAVAILABLE =
  'App Group storage unavailable: this dev client lacks the DorkroomShared module ' +
  '(rebuild it after a prebuild) or the App Group entitlement. Control Center ' +
  'controls will not follow the app.';

/**
 * Wraps the native module so that a missing module or a throwing call degrades
 * to null reads and no-op writes. `warn` is called once, on the first failure.
 */
export function createSharedDefaults(
  native: DorkroomSharedModule | null,
  warn: (message: string) => void
): SharedDefaults {
  let warned = false;
  const fail = () => {
    if (warned) return;
    warned = true;
    warn(SHARED_DEFAULTS_UNAVAILABLE);
  };
  function attempt<T>(call: (module: DorkroomSharedModule) => T, fallback: T) {
    if (native === null) {
      fail();
      return fallback;
    }
    try {
      return call(native);
    } catch {
      fail();
      return fallback;
    }
  }
  return {
    getBool: (key) => attempt((m) => m.getSharedBool(key), null),
    setBool: (key, value) =>
      attempt((m) => m.setSharedBool(key, value), undefined),
    getNumber: (key) => {
      const value = attempt((m) => m.getSharedNumber(key), null);
      return value !== null && Number.isFinite(value) ? value : null;
    },
    setNumber: (key, value) =>
      attempt((m) => m.setSharedNumber(key, value), undefined),
    reloadControls: (kind) =>
      attempt(
        (m) =>
          kind === undefined ? m.reloadControls() : m.reloadControls(kind),
        undefined
      ),
  };
}

/** `__DEV__`, or false where it is not defined at all (vitest). */
function isDevelopment(): boolean {
  try {
    return __DEV__;
  } catch {
    return false;
  }
}

export const sharedDefaults: SharedDefaults = createSharedDefaults(
  loadDorkroomShared(),
  (message) => {
    if (isDevelopment()) console.warn(message);
  }
);
