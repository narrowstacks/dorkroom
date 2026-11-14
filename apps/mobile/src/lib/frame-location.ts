// One foreground location fix for a logged frame, through `expo-location`.
// Native-touching, so it is not unit-tested; the pure half is
// `frame-location-format.ts`.
//
// Privacy: "when in use" only (the config plugin writes no Always or Motion
// string), asked for the first time the user taps "Add location", never at
// launch. The fix is returned to the caller and stored nowhere here, and no
// reverse geocoding is done (that would send coordinates to Apple).
//
// A dev client built before `expo-location` was added has no `ExpoLocation`
// native module, and importing the package would throw, so it is required
// lazily and only once the module is known to exist. That case, a throwing
// call and a position that cannot be used all resolve `unavailable`, with one
// warning in development. This never throws and never rejects.
import { requireOptionalNativeModule } from 'expo';
import { gateStatus, locationFromPosition } from '@/lib/frame-location-format';
import type { ShotLocationFields } from '@/schemas/film-log.schema';

export type FrameLocationResult =
  | { status: 'ok'; location: ShotLocationFields }
  | { status: 'denied' }
  | { status: 'servicesOff' }
  | { status: 'unavailable' }
  | { status: 'timeout' };

/** How long to wait for a fix before giving up. */
export const FRAME_LOCATION_TIMEOUT_MS = 8000;
/** A last known position at most this old (ms) and this precise (m) answers at once. */
const LAST_KNOWN_MAX_AGE_MS = 30_000;
const LAST_KNOWN_ACCURACY_M = 100;

const UNAVAILABLE_WARNING =
  'Frame location unavailable: this dev client lacks the ExpoLocation module. ' +
  'Rebuild it (a native build) to add location to frames.';

type LocationModule = typeof import('expo-location');

let warned = false;
function warnOnce(message: string) {
  if (warned) return;
  warned = true;
  if (__DEV__) console.warn(message);
}

function loadLocation(): LocationModule | null {
  if (!requireOptionalNativeModule('ExpoLocation')) {
    warnOnce(UNAVAILABLE_WARNING);
    return null;
  }
  try {
    return require('expo-location');
  } catch {
    warnOnce(UNAVAILABLE_WARNING);
    return null;
  }
}

type Raced<T> = { timedOut: false; value: T } | { timedOut: true };

/** Settles with the work, or `timedOut` after `ms`. The timer is always cleared, so none is left pending. */
function raceTimeout<T>(work: Promise<T>, ms: number): Promise<Raced<T>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve({ timedOut: false, value });
      },
      (error: Error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function requestFrameLocation(): Promise<FrameLocationResult> {
  const Location = loadLocation();
  if (!Location) return { status: 'unavailable' };
  try {
    // An unreadable services state counts as on: the permission decides then.
    const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
      () => true
    );
    // With services off iOS cannot show the prompt, so do not ask.
    const granted = servicesEnabled
      ? (await Location.requestForegroundPermissionsAsync()).granted
      : false;
    const gate = gateStatus({ servicesEnabled, granted });
    if (gate !== 'ok') return { status: gate };

    // A recent, precise-enough fix answers immediately; otherwise one read.
    const known = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_ACCURACY_M,
    });
    let position = known;
    if (!position) {
      const raced = await raceTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.LocationAccuracy.Balanced,
        }),
        FRAME_LOCATION_TIMEOUT_MS
      );
      if (raced.timedOut) return { status: 'timeout' };
      position = raced.value;
    }
    const location = locationFromPosition(position, new Date());
    return location ? { status: 'ok', location } : { status: 'unavailable' };
  } catch {
    // A native failure: nothing the user can act on here.
    return { status: 'unavailable' };
  }
}
