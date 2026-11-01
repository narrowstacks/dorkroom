import {
  detectFilmBase,
  type NegativeFilmType,
  type NegativeStatistics,
  type PixelPoint,
  type PixelRect,
  type PixelSize,
  type RgbaImage,
  samplePatch,
  scalePoint,
} from '@dorkroom/logic';
import {
  BASE_PATCH_SIZE,
  type BaseSample,
  type CarriedFraming,
  detectedSample,
  inverterStatistics,
  pickedSample,
} from './inverter-state';
import { type FilmExposure, measureFilmExposure } from './live-exposure';
import { livePointToPhoto } from './live-geometry';

/**
 * What live mode measures from each statistics snapshot, and how its framing
 * carries over to the captured photo. Live mode measures the whole frame
 * (it has no crop; the photo is cropped in the editor) and keeps a picked
 * base point in live image pixels; the snapshot is the same picture, smaller.
 *
 * A picked base is kept as a point, not a colour: the camera's exposure moves
 * (see live-exposure.ts), so its colour is sampled afresh from every
 * snapshot, and again from the photo once captured.
 */

/** Base patch in snapshot pixels: the editor's patch, scaled to the
 *  snapshot's size, and never under a few pixels. */
export const LIVE_BASE_PATCH_SIZE = 3;

/**
 * Median blocks measured per live pass. The analysis costs in proportion to
 * this, whatever the snapshot size; about 5000 blocks (2 x 2 pixels on the
 * 160 x 120 snapshot) keeps a pass to a few milliseconds and the levels
 * within a few hundredths of a density of the full measurement.
 */
export const LIVE_SAMPLE_TARGET = 5000;

/**
 * Pixels sampled per live base detection: every other pixel of the 160 x 120
 * snapshot. Detection sorts what it samples, so this sets its cost; a rebate
 * strip is still several sampled rows deep, and the captured photo is
 * searched in full.
 */
export const LIVE_BASE_SAMPLE_TARGET = 4800;

/**
 * How far, in density (log10, worst channel), a newly detected base must be
 * from the one in use to count as a different base. Closer proposals are
 * the same base seen through sensor noise and are ignored.
 */
export const AUTO_BASE_SHIFT = 0.03;

export interface LiveFraming {
  /** Picked base in live pixels, or null to find it automatically. */
  basePoint: PixelPoint | null;
}

export interface LiveSnapshot {
  /** The negative, small, upright, sRGB. */
  image: RgbaImage;
  /** Size of the live image the framing is in. */
  live: PixelSize;
}

export interface LiveReading {
  /** The base, its point in live pixels. */
  base: BaseSample | null;
  statistics: NegativeStatistics | null;
  exposure: FilmExposure | null;
}

/**
 * The automatic base across snapshots: the one in use, and the run of recent
 * proposals that disagreed with it, waiting to outvote it.
 */
export interface AutoBaseTrack {
  accepted: BaseSample | null;
  disagreeing: readonly BaseSample[];
}

export const NO_AUTO_BASE: AutoBaseTrack = { accepted: null, disagreeing: [] };

/** Snapshots in a row that must disagree with the base in use to replace it. */
export const AUTO_BASE_VOTES = 3;

/** Largest per-channel density between two bases. */
export function baseShift(a: BaseSample, b: BaseSample): number {
  let shift = 0;
  for (let c = 0; c < 3; c++) {
    const ratio = Math.max(a.rgb[c], 1e-6) / Math.max(b.rgb[c], 1e-6);
    shift = Math.max(shift, Math.abs(Math.log10(ratio)));
  }
  return shift;
}

const middle = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Per-channel median of some proposals, at the latest one's point. */
function medianBase(bases: readonly BaseSample[]): BaseSample {
  const last = bases[bases.length - 1];
  return {
    ...last,
    rgb: [
      middle(bases.map((b) => b.rgb[0])),
      middle(bases.map((b) => b.rgb[1])),
      middle(bases.map((b) => b.rgb[2])),
    ],
    confidence: middle(bases.map((b) => b.confidence)),
  };
}

/**
 * Hysteresis for the automatic base, so it neither flickers between near
 * answers nor jumps on one odd snapshot, yet cannot get stuck:
 *
 * - within {@link AUTO_BASE_SHIFT} of the base in use: keep it, and forget
 *   the disagreeing run;
 * - further off: add to the run; after {@link AUTO_BASE_VOTES} disagreeing
 *   snapshots in a row, switch to their per-channel median (so proposals
 *   that alternate between two other bases still move it);
 * - nothing found: keep the base and the run as they are.
 *
 * `force` switches at once, for when the picture itself changed for a known
 * reason (new crop or film type, a camera exposure change), where waiting
 * would show a stale base.
 */
export function settleAutoBase(
  track: AutoBaseTrack,
  proposed: BaseSample | null,
  force: boolean
): AutoBaseTrack {
  if (!proposed) return force ? NO_AUTO_BASE : track;
  const { accepted } = track;
  if (force || !accepted) return { accepted: proposed, disagreeing: [] };
  if (baseShift(accepted, proposed) <= AUTO_BASE_SHIFT) {
    return { accepted, disagreeing: [] };
  }
  const disagreeing = [...track.disagreeing, proposed];
  if (disagreeing.length >= AUTO_BASE_VOTES) {
    return { accepted: medianBase(disagreeing), disagreeing: [] };
  }
  return { accepted, disagreeing };
}

/**
 * Whether a snapshot needs a statistics pass. An unchanged snapshot is
 * skipped, except while disagreeing proposals are still voting: a camera
 * held steady on a new negative repeats the same snapshot, and skipping it
 * would leave the run one vote short forever.
 */
export function needsStatsPass(
  snapshotChanged: boolean,
  track: AutoBaseTrack
): boolean {
  return snapshotChanged || track.disagreeing.length > 0;
}

const sizeOf = (image: RgbaImage): PixelSize => ({
  width: image.width,
  height: image.height,
});

const fullRect = (size: PixelSize): PixelRect => ({
  x: 0,
  y: 0,
  width: size.width,
  height: size.height,
});

/** A reading and the automatic-base track to carry into the next one. */
export interface LiveSnapshotRead {
  reading: LiveReading;
  track: AutoBaseTrack;
}

/**
 * The base, statistics and film exposure for a snapshot. A picked base is
 * sampled at its point; an automatic one goes through {@link settleAutoBase}
 * with `track`, and the updated track is returned with the reading.
 */
export function readLiveSnapshot(
  { image, live }: LiveSnapshot,
  framing: LiveFraming,
  filmType: NegativeFilmType,
  track: AutoBaseTrack = NO_AUTO_BASE,
  force = true
): LiveSnapshotRead {
  const size = sizeOf(image);
  const crop = fullRect(size);

  let base: BaseSample | null = null;
  let next = NO_AUTO_BASE;
  if (framing.basePoint) {
    const p = scalePoint(framing.basePoint, live, size);
    const rgb = samplePatch(image, p.x, p.y, LIVE_BASE_PATCH_SIZE);
    if (rgb) base = pickedSample({ point: framing.basePoint, rgb });
  } else {
    const found = detectFilmBase(
      image,
      filmType,
      crop,
      LIVE_BASE_SAMPLE_TARGET
    );
    next = settleAutoBase(
      track,
      found
        ? detectedSample({
            ...found,
            point: scalePoint(found.point, size, live),
          })
        : null,
      force
    );
    base = next.accepted;
  }

  return {
    reading: {
      base,
      statistics: inverterStatistics(
        image,
        base,
        filmType,
        crop,
        LIVE_SAMPLE_TARGET
      ),
      exposure: measureFilmExposure(image, crop, filmType),
    },
    track: next,
  };
}

export interface LiveCarry extends LiveFraming {
  live: PixelSize;
}

/**
 * The live base on the captured photo's proxy, sampled from the photo
 * itself (at the picked point, or found automatically), so the editor starts
 * from the photo's own colours. The photo opens uncropped.
 */
export function carryToPhoto(
  carry: LiveCarry,
  proxy: RgbaImage,
  filmType: NegativeFilmType
): CarriedFraming {
  const size = sizeOf(proxy);
  if (carry.basePoint) {
    const point = livePointToPhoto(carry.basePoint, carry.live, size);
    const rgb = samplePatch(proxy, point.x, point.y, BASE_PATCH_SIZE);
    if (rgb) return { base: pickedSample({ point, rgb }) };
  }
  const found = detectFilmBase(proxy, filmType, fullRect(size));
  return { base: found ? detectedSample(found) : null };
}
