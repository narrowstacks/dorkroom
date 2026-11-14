// Pure helpers for a frame's GPS location: how it reads on screen and how an
// expo-location fix becomes the stored shape. No native modules, so it is
// tested in `frame-location-format.test.ts`.
import type { ShotLocationFields } from '@/schemas/film-log.schema';

/** The part of expo-location's `LocationObject` this app reads. */
export interface PositionLike {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
  };
  /** Milliseconds since the epoch, when the fix was taken. */
  timestamp?: number;
}

const finite = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;

function fixTime(timestamp: number | undefined, now: Date): Date {
  if (timestamp === undefined || !Number.isFinite(timestamp)) return now;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? now : date;
}

/** True for a location with a latitude and longitude on the globe. */
export function isUsableLocation(
  location: { latitude?: number; longitude?: number } | null | undefined
): boolean {
  return (
    location != null &&
    finite(location.latitude) &&
    finite(location.longitude) &&
    Math.abs(location.latitude) <= 90 &&
    Math.abs(location.longitude) <= 180
  );
}

/**
 * The stored location for a fix: coordinates rounded to 6 decimals (about
 * 0.1 m, more than a phone can know), accuracy and altitude only when finite
 * (accuracy also not negative), and `capturedAt` from the fix's own
 * `timestamp`, or `now` when that is missing or not a usable time. Undefined when the
 * fix has no usable latitude and longitude.
 */
export function locationFromPosition(
  position: PositionLike,
  now: Date
): ShotLocationFields | undefined {
  const { latitude, longitude, accuracy, altitude } = position.coords;
  if (!isUsableLocation({ latitude, longitude })) return undefined;
  const location: ShotLocationFields = {
    latitude: round6(latitude),
    longitude: round6(longitude),
    capturedAt: fixTime(position.timestamp, now).toISOString(),
  };
  if (finite(accuracy) && accuracy >= 0) {
    location.accuracyMeters = Math.round(accuracy * 10) / 10;
  }
  if (finite(altitude))
    location.altitudeMeters = Math.round(altitude * 10) / 10;
  return location;
}

type Coordinates = Pick<ShotLocationFields, 'latitude' | 'longitude'>;

/** Values that would print as -0.000000 (or 0.0000 S) are zero. */
const snap = (value: number): number => (Math.abs(value) < 5e-7 ? 0 : value);

function hemisphere(value: number, positive: string, negative: string) {
  // Zero and negative zero both read as the positive hemisphere.
  return value < 0 ? negative : positive;
}

/** `37.7749° N, 122.4194° W`: 4 decimals (about 11 m). */
export function formatCoordinates(location: Coordinates, decimals = 4): string {
  const latitude = snap(location.latitude);
  const longitude = snap(location.longitude);
  const lat = Math.abs(latitude).toFixed(decimals);
  const lon = Math.abs(longitude).toFixed(decimals);
  return `${lat}° ${hemisphere(latitude, 'N', 'S')}, ${lon}° ${hemisphere(longitude, 'E', 'W')}`;
}

/** `37.77 N 122.42 W`: 2 decimals, for a card that has little room. */
export function formatCoordinatesCompact(location: Coordinates): string {
  const latitude = snap(location.latitude);
  const longitude = snap(location.longitude);
  const lat = Math.abs(latitude).toFixed(2);
  const lon = Math.abs(longitude).toFixed(2);
  return `${lat} ${hemisphere(latitude, 'N', 'S')} ${lon} ${hemisphere(longitude, 'E', 'W')}`;
}

/** A coordinate for the CSV: a plain decimal with exactly 6 places, empty when absent. */
export function formatCoordinateNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '';
  return snap(value).toFixed(6);
}

/** Accuracy above this many meters is shown, and coordinates are shown coarser. */
export const COARSE_ACCURACY_M = 100;

/** `±12 m` under a kilometer, `±2.5 km` from there; empty when unknown. */
export function formatAccuracy(meters: number | undefined): string {
  if (meters === undefined || !Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) return `±${Math.round(meters)} m`;
  return `±${(meters / 1000).toFixed(1)} km`;
}

/** An accuracy column cell: integer meters, empty when unknown. */
export function formatAccuracyMeters(meters: number | undefined): string {
  if (meters === undefined || !Number.isFinite(meters) || meters < 0) return '';
  return String(Math.round(meters));
}

/**
 * The location as the row shows it. A coarse fix (iOS "Precise Location" off
 * can be kilometers out) shows 2 decimals and its accuracy, so it never looks
 * more exact than it is. Stored values are untouched.
 */
export function describeLocation(
  location: Coordinates & { accuracyMeters?: number }
) {
  const coarse =
    location.accuracyMeters !== undefined &&
    Number.isFinite(location.accuracyMeters) &&
    location.accuracyMeters > COARSE_ACCURACY_M;
  return {
    text: formatCoordinates(location, coarse ? 2 : 4),
    accuracy: coarse ? formatAccuracy(location.accuracyMeters) : '',
  };
}

/**
 * Whether Log or Save is held back. A fix still being found would be dropped
 * by a commit (it is not on the frame yet), so locating blocks it; the wait is
 * bounded by the lookup's timeout.
 */
export function isCommitDisabled(state: {
  blocked?: boolean;
  rollGone?: boolean;
  locating: boolean;
}): boolean {
  return Boolean(state.blocked || state.rollGone || state.locating);
}

/**
 * Why a lookup stops before reading a position. Location Services off for the
 * whole phone wins over a denied permission, because Settings is a different
 * place for each. A denied permission (including one that cannot be asked
 * again) keeps one line. "Restricted" is not told apart.
 */
export function gateStatus(state: {
  servicesEnabled: boolean;
  granted: boolean;
}): 'ok' | 'servicesOff' | 'denied' {
  if (!state.servicesEnabled) return 'servicesOff';
  return state.granted ? 'ok' : 'denied';
}
