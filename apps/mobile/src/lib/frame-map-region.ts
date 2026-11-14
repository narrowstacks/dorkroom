// The opening camera of a roll's map: a center and an expo-maps zoom that show
// every located frame with some room around them. Pure, so it is tested in
// `frame-map-region.test.ts`.
//
// expo-maps (57.0.4, iOS) turns a zoom into a region whose longitude AND
// latitude delta are both `360 / 2^zoom`, and MapKit then fits that square of
// degrees into the view. So the zoom comes from the larger of the two spans.

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface FrameMapCamera {
  coordinates: MapPoint;
  zoom: number;
}

/** Room around the points: the span is widened by this factor (20% a side). */
export const MAP_PADDING = 1.4;
/** The smallest span shown, in degrees (about 1 km), so one point or a
 * cluster of identical points opens at street level, not at maximum zoom. */
export const MIN_SPAN_DEG = 0.01;
/** Zoom 1 is a 180 degree delta, MapKit's largest valid latitude span. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 18;
/** Web-Mercator's limit; a center beyond it cannot be shown. */
const MAX_CENTER_LAT = 85;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

interface LongitudeArc {
  center: number;
  span: number;
}

/** A longitude in [-180, 180), unchanged when already there (no float drift). */
function wrapLongitude(value: number): number {
  if (value >= -180 && value < 180) return value;
  const wrapped = (((value + 180) % 360) + 360) % 360;
  return wrapped - 180;
}

/**
 * The narrowest arc of longitudes that covers every value: the circle minus
 * its largest empty gap, so frames on both sides of the antimeridian (179 and
 * -179) span 2 degrees, not 358.
 */
export function longitudeArc(longitudes: readonly number[]): LongitudeArc {
  const sorted = longitudes.map(wrapLongitude).sort((a, b) => a - b);
  const first = sorted[0] ?? 0;
  const last = sorted[sorted.length - 1] ?? 0;
  // The gap that wraps from the last value round to the first.
  let gap = first + 360 - last;
  let start = first;
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i] ?? 0;
    const previous = sorted[i - 1] ?? 0;
    if (current - previous > gap) {
      gap = current - previous;
      start = current;
    }
  }
  const span = 360 - gap;
  return { center: wrapLongitude(start + span / 2), span };
}

/**
 * The camera that fits every point, or null for no points. Non-finite or
 * off-globe points are ignored.
 */
export function frameMapCamera(
  points: readonly MapPoint[]
): FrameMapCamera | null {
  const usable = points.filter(
    (point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      Math.abs(point.latitude) <= 90 &&
      Math.abs(point.longitude) <= 180
  );
  if (usable.length === 0) return null;

  const latitudes = usable.map((point) => point.latitude);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const longitude = longitudeArc(usable.map((point) => point.longitude));

  const span = Math.max(north - south, longitude.span, MIN_SPAN_DEG);
  const zoom = clamp(Math.log2(360 / (span * MAP_PADDING)), MIN_ZOOM, MAX_ZOOM);

  return {
    coordinates: {
      latitude: clamp((south + north) / 2, -MAX_CENTER_LAT, MAX_CENTER_LAT),
      longitude: longitude.center,
    },
    zoom,
  };
}
