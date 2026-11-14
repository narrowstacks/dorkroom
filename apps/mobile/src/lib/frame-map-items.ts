// The located frames of a roll, as the map screen shows them: one pin per
// point (a pin can stand for several frames) and the accessible list beside
// the map. Pure, so it is tested in
// `frame-map-items.test.ts`.
import {
  describeLocation,
  formatCoordinateNumber,
  isUsableLocation,
} from '@/lib/frame-location-format';
import { frameRowText } from '@/lib/frame-row-text';
import type { Shot } from '@/schemas/film-log.schema';

export interface LocatedFrame {
  shotId: string;
  frameNumber: number;
  place?: string;
  /** "f/8 · 1/125" as the roll page shows it; absent when the frame has no
   * aperture or shutter set. */
  exposure?: string;
  latitude: number;
  longitude: number;
  /** The coordinates as the shot form shows them (coarser for a coarse fix). */
  coordinatesText: string;
  /** `±2.5 km` for a coarse fix, else empty. */
  accuracyText: string;
}

/** Frames with a usable location, in frame order. */
export function locatedFrames(shots: readonly Shot[]): LocatedFrame[] {
  return shots
    .flatMap((shot) => {
      const location = shot.location;
      if (!location || !isUsableLocation(location)) return [];
      const described = describeLocation(location);
      const frame: LocatedFrame = {
        shotId: shot.id,
        frameNumber: shot.frameNumber,
        latitude: location.latitude,
        longitude: location.longitude,
        coordinatesText: described.text,
        accuracyText: described.accuracy,
      };
      const place = shot.place?.trim();
      if (place) frame.place = place;
      if (shot.aperture !== undefined || shot.shutterSpeed !== undefined) {
        frame.exposure = frameRowText(shot, undefined).exposure;
      }
      return [frame];
    })
    .sort((a, b) => a.frameNumber - b.frameNumber);
}

/** The main line of a frame in the map's list: its exposure and place, as the
 * roll page words them; empty when it has neither (the row then shows only its
 * coordinates). */
export function locatedFrameTitle(frame: LocatedFrame): string {
  return [frame.exposure, frame.place].filter(Boolean).join(' · ');
}

/** What VoiceOver reads for a frame in the list: number, exposure, place,
 * coordinates. */
export function locatedFrameLabel(frame: LocatedFrame): string {
  return [
    `Frame ${frame.frameNumber}`,
    // Spoken as on the roll page: "f/8, 1/125", not with the middle dot.
    frame.exposure?.replaceAll(' · ', ', '),
    frame.place,
    frame.coordinatesText,
    frame.accuracyText ? `accuracy ${frame.accuracyText}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
}

/** One map pin: every located frame at the same point (6 decimals). */
export interface FramePoint {
  /** The point's 6-decimal coordinate key (`"48.858400,2.294500"`): stable
   * while frames at that spot are edited, added or removed. It goes only to
   * the map view, which has the coordinates anyway. */
  id: string;
  latitude: number;
  longitude: number;
  /** In frame order. */
  frames: LocatedFrame[];
  /** The pin's label: at most 4 characters, hyphen-minus only. */
  monogram: string;
  /** "Frame 12", "Frames 3-5", "3 frames". */
  title: string;
}

const MAX_MONOGRAM = 4;

function contiguous(numbers: readonly number[]): boolean {
  return numbers.every(
    (value, index) => index === 0 || value === (numbers[index - 1] ?? 0) + 1
  );
}

/**
 * The pin label for these frame numbers: the number for one frame, `3-5` for a
 * run, else `3+` (the first frame and more), else the count, whichever first
 * fits in 4 characters.
 */
export function pointMonogram(frameNumbers: readonly number[]): string {
  const unique = [...new Set(frameNumbers)].sort((a, b) => a - b);
  const first = unique[0] ?? 0;
  const last = unique[unique.length - 1] ?? 0;
  if (frameNumbers.length === 1) return String(first);
  const candidates = [
    unique.length > 1 && contiguous(unique) ? `${first}-${last}` : undefined,
    `${first}+`,
    String(frameNumbers.length),
  ];
  return (
    candidates.find(
      (candidate) => candidate !== undefined && candidate.length <= MAX_MONOGRAM
    ) ?? '+'
  );
}

function pointTitle(frameNumbers: readonly number[]): string {
  const unique = [...new Set(frameNumbers)].sort((a, b) => a - b);
  if (frameNumbers.length === 1) return `Frame ${unique[0] ?? 0}`;
  if (unique.length > 1 && contiguous(unique)) {
    return `Frames ${unique[0] ?? 0}-${unique[unique.length - 1] ?? 0}`;
  }
  return `${frameNumbers.length} frames`;
}

/**
 * Located frames grouped into one pin per distinct point. expo-maps resolves a
 * tapped marker by `MKMapItem` equality, and items at the same coordinate are
 * equal, so two pins at one spot would both select the first: one pin per
 * point instead. Points are keyed by their coordinates at the 6 decimals
 * stored and exported, and ordered by their first frame.
 */
export function framePoints(frames: readonly LocatedFrame[]): FramePoint[] {
  const groups = new Map<string, LocatedFrame[]>();
  for (const frame of frames) {
    const key = `${formatCoordinateNumber(frame.latitude)},${formatCoordinateNumber(frame.longitude)}`;
    const group = groups.get(key);
    if (group) group.push(frame);
    else groups.set(key, [frame]);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const sorted = [...group].sort((a, b) => a.frameNumber - b.frameNumber);
      const head = sorted[0];
      const numbers = sorted.map((frame) => frame.frameNumber);
      return {
        id: key,
        latitude: head?.latitude ?? 0,
        longitude: head?.longitude ?? 0,
        frames: sorted,
        monogram: pointMonogram(numbers),
        title: pointTitle(numbers),
      };
    })
    .sort(
      (a, b) =>
        (a.frames[0]?.frameNumber ?? 0) - (b.frames[0]?.frameNumber ?? 0)
    );
}

/** The point a selection names, or undefined when it is gone (its last frame
 * was deleted or lost its location) or nothing is selected. */
export function selectedPoint(
  points: readonly FramePoint[],
  selectedId: string | null
): FramePoint | undefined {
  if (selectedId === null) return undefined;
  return points.find((point) => point.id === selectedId);
}
