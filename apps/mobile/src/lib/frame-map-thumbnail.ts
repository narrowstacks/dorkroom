// The roll page's map thumbnail is drawn, not a map: one dot per located point,
// placed by the points' own coordinates inside a small box. A live map view
// there would sit inside a scrolling list header, would fetch tiles from Apple
// whenever the roll is opened, and cannot be dimmed under safelight. Pure, so
// the placement is tested in `frame-map-thumbnail.test.ts`.
import { formatCoordinateNumber } from '@/lib/frame-location-format';
import { longitudeArc, type MapPoint } from '@/lib/frame-map-region';

/** A dot's centre as fractions of the box: 0 is the left or top edge, 1 the
 * right or bottom. */
export interface ThumbnailDot {
  x: number;
  y: number;
}

/** Room kept clear at each edge, as a fraction of the box, so a dot at the
 * extent of the spread is drawn whole. */
export const THUMBNAIL_INSET = 0.18;
/** More dots than this only turn the box into a smudge. */
export const MAX_THUMBNAIL_DOTS = 24;

function usable(point: MapPoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

/**
 * Dots for the located points: north up, east right, one scale for both axes
 * so a spread keeps its shape, centred in the box, the antimeridian handled
 * as the map's camera handles it (`longitudeArc`). Points at the same spot (6
 * decimals) are one dot; a single spot is the centre. At most
 * `MAX_THUMBNAIL_DOTS`, in the order given.
 */
export function thumbnailDots(points: readonly MapPoint[]): ThumbnailDot[] {
  const seen = new Set<string>();
  const unique = points.filter((point) => {
    if (!usable(point)) return false;
    const key = `${formatCoordinateNumber(point.latitude)},${formatCoordinateNumber(point.longitude)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) return [];

  const latitudes = unique.map((point) => point.latitude);
  const north = Math.max(...latitudes);
  const south = Math.min(...latitudes);
  const arc = longitudeArc(unique.map((point) => point.longitude));
  const west = arc.center - arc.span / 2;
  const scale = Math.max(north - south, arc.span);
  const room = 1 - 2 * THUMBNAIL_INSET;

  return unique.slice(0, MAX_THUMBNAIL_DOTS).map((point) => {
    if (scale === 0) return { x: 0.5, y: 0.5 };
    // Degrees east of the arc's west end, in [0, 360).
    const wrapped = (((point.longitude - west) % 360) + 360) % 360;
    // The western-most point can land a hair below 0 and wrap to ~360.
    const east = wrapped > arc.span + 1e-6 ? wrapped - 360 : wrapped;
    return {
      x: 0.5 + ((east - arc.span / 2) / scale) * room,
      y: 0.5 + (((north + south) / 2 - point.latitude) / scale) * room,
    };
  });
}
