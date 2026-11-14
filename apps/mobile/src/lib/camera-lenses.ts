// Which lenses a frame can be shot with on a camera, and how a frame records
// its lens (#733). Pure, tested in `camera-lenses.test.ts`.
//
// `lensesForCamera` is THE rule, used everywhere a lens is chosen for a frame
// (the log-a-frame sheet, the shot form) through `useCameraLenses`:
//
// - A fixed-lens camera offers exactly its built-in lens, never a saved one.
// - Any other camera offers the lenses with its mount, the lenses pinned to it
//   by `cameraId`, and the lenses with neither a mount nor a pin (today's "any
//   camera" lenses). A lens with a mount is not offered on a camera with
//   another mount, or none, unless it is pinned there.
//
// With no mounts anywhere (data from before #733) that is exactly the old rule,
// `!lens.cameraId || lens.cameraId === cameraId`; the tests run both over the
// same fixtures.
//
// A fixed lens is not a saved `Lens`. A frame shot with one stores no `lensId`
// and a `fixedLensName` snapshot ("90mm f/3.5") instead, like a roll's
// `filmStockName`: the frame keeps its lens when the camera is later edited,
// changed to interchangeable lenses, or deleted, and every export can name it.
import { formatAperture } from '@dorkroom/logic';
import { lastUsedLensId } from '@/lib/film-log-options';
import type {
  Camera,
  FilmRoll,
  FixedLens,
  Lens,
  Shot,
} from '@/schemas/film-log.schema';

/** What a camera takes: a fixed lens, a mount, or neither (legacy, or not set). */
export type CameraLensKind = 'fixed' | 'mount' | 'none';

/** A fixed lens wins if a camera somehow stores both. */
export function cameraLensKind(
  camera: Pick<Camera, 'fixedLens' | 'mountId'>
): CameraLensKind {
  if (camera.fixedLens) return 'fixed';
  if (camera.mountId) return 'mount';
  return 'none';
}

/** "90mm f/3.5", "90mm", the lens's own name when it has one, else "Fixed lens". */
export function fixedLensLabel(lens: FixedLens): string {
  const name = lens.name?.trim();
  if (name) return name;
  const parts = [
    lens.focalLength === undefined ? undefined : `${lens.focalLength}mm`,
    lens.maxAperture === undefined
      ? undefined
      : formatAperture(lens.maxAperture),
  ].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? parts.join(' ') : 'Fixed lens';
}

/** The lenses a frame on a camera can be shot with. */
export type CameraLenses =
  | { kind: 'fixed'; label: string }
  | { kind: 'interchangeable'; lenses: Lens[] };

/**
 * The lenses for the camera `cameraId` (a roll's camera; it may have been
 * deleted, and then only the lenses pinned to that id or to no camera and no
 * mount are offered, as before).
 */
export function lensesForCamera(
  cameraId: string | undefined,
  cameras: readonly Camera[],
  lenses: readonly Lens[]
): CameraLenses {
  const camera =
    cameraId === undefined
      ? undefined
      : cameras.find((candidate) => candidate.id === cameraId);
  if (camera?.fixedLens) {
    return { kind: 'fixed', label: fixedLensLabel(camera.fixedLens) };
  }
  const mountId = camera?.mountId || undefined;
  return {
    kind: 'interchangeable',
    lenses: lenses.filter((lens) => {
      if (lens.cameraId && lens.cameraId === cameraId) return true;
      if (lens.mountId) return lens.mountId === mountId;
      return !lens.cameraId;
    }),
  };
}

/** The cameras a lens fits by its mount (fixed-lens cameras never). Empty for
 * a lens with no mount. The lens form's "Fits" line. */
export function camerasForLens(
  lens: Pick<Lens, 'mountId'>,
  cameras: readonly Camera[]
): Camera[] {
  if (!lens.mountId) return [];
  return cameras.filter(
    (camera) => !camera.fixedLens && camera.mountId === lens.mountId
  );
}

// --- A frame's lens --------------------------------------------------------

/** The choice value of a fixed-lens camera's lens. Never stored. */
export const FIXED_LENS_CHOICE = '__fixed-lens__';
/** The choice value of the lens snapshot a frame already records. Never stored. */
export const RECORDED_LENS_CHOICE = '__recorded-lens__';

/** A lens as a frame's lens field offers it. A saved `Lens` is one as it is;
 * the fixed and recorded lenses use the sentinel ids above. */
export interface LensChoice {
  id: string;
  name: string;
}

type RecordedLens = Pick<Shot, 'lensId' | 'fixedLensName'>;

/** The lens a frame names: its saved lens's name, else its snapshot. */
export function frameLensName(
  shot: RecordedLens,
  lensName: (id: string) => string | undefined
): string | undefined {
  return (
    (shot.lensId ? lensName(shot.lensId) : undefined) ?? shot.fixedLensName
  );
}

/**
 * The lens choices for a frame: the camera's lenses (or its fixed lens), plus
 * the lens an existing frame records when the camera no longer offers it, so
 * editing the frame shows it instead of an empty field.
 */
export function lensChoices(
  cameraLenses: CameraLenses,
  allLenses: readonly Lens[],
  recorded?: RecordedLens
): LensChoice[] {
  const choices: LensChoice[] =
    cameraLenses.kind === 'fixed'
      ? [{ id: FIXED_LENS_CHOICE, name: cameraLenses.label }]
      : cameraLenses.lenses.map((lens) => ({ id: lens.id, name: lens.name }));
  if (recorded?.lensId) {
    const id = recorded.lensId;
    if (!choices.some((choice) => choice.id === id)) {
      const lens = allLenses.find((candidate) => candidate.id === id);
      if (lens) choices.push({ id: lens.id, name: lens.name });
    }
  } else if (
    recorded?.fixedLensName &&
    !(
      cameraLenses.kind === 'fixed' &&
      cameraLenses.label === recorded.fixedLensName
    )
  ) {
    choices.unshift({ id: RECORDED_LENS_CHOICE, name: recorded.fixedLensName });
  }
  return choices;
}

/**
 * The choice a frame's lens field starts on. An existing frame starts on what
 * it records (never invented); a new frame on a fixed-lens camera starts on
 * that lens, otherwise on `fallback` (the roll's last lens, or the sheet's).
 */
export function initialLensChoice(
  cameraLenses: CameraLenses,
  existing: RecordedLens | undefined,
  fallback: string | undefined
): string | undefined {
  if (existing) {
    if (existing.lensId) return existing.lensId;
    if (!existing.fixedLensName) return undefined;
    return cameraLenses.kind === 'fixed' &&
      cameraLenses.label === existing.fixedLensName
      ? FIXED_LENS_CHOICE
      : RECORDED_LENS_CHOICE;
  }
  return cameraLenses.kind === 'fixed' ? FIXED_LENS_CHOICE : fallback;
}

/** A frame's two lens fields, both always present (see `frameLensFields`). */
export interface FrameLensFields {
  lensId: string | undefined;
  fixedLensName: string | undefined;
}

/**
 * The lens a NEW frame starts on for a roll: the fixed lens on a fixed-lens
 * camera, else the roll's last-used lens only while the camera still offers
 * it (as the log sheet's `selectedLens`), else none. Also what the shot form
 * resets to when its roll is switched.
 */
export function newFrameLensChoice(
  cameraLenses: CameraLenses,
  lastUsedId: string | undefined
): string | undefined {
  const offered =
    cameraLenses.kind === 'interchangeable' &&
    cameraLenses.lenses.some((lens) => lens.id === lastUsedId)
      ? lastUsedId
      : undefined;
  return initialLensChoice(cameraLenses, undefined, offered);
}

/**
 * The lens a new frame resets to when the shot form's roll is switched to
 * `rollId`: a lens chosen for the previous roll's camera may not exist on this
 * one, so it starts again from this roll's own default.
 */
export function lensChoiceForRoll(
  rollId: string,
  rolls: readonly Pick<FilmRoll, 'id' | 'cameraId' | 'shots'>[],
  cameras: readonly Camera[],
  lenses: readonly Lens[]
): string | undefined {
  const roll = rolls.find((candidate) => candidate.id === rollId);
  return newFrameLensChoice(
    lensesForCamera(roll?.cameraId, cameras, lenses),
    lastUsedLensId(roll?.shots ?? [])
  );
}

const NO_LENS: FrameLensFields = {
  lensId: undefined,
  fixedLensName: undefined,
};

/**
 * The lens fields to store for a choice. Both keys are always present, so an
 * update replaces the old pair: a saved lens clears a snapshot, and the fixed
 * lens clears a `lensId`. The recorded snapshot is kept as it was.
 *
 * A NEW frame (no `existing`) stores only a choice its camera offers now, so a
 * value left over from another roll's camera is dropped. An existing frame is
 * never validated: it keeps a lens since deleted or no longer fitting, and a
 * fixed-lens frame whose camera is no longer fixed keeps its snapshot.
 */
export function frameLensFields(
  choice: string | undefined,
  cameraLenses: CameraLenses,
  existing: RecordedLens | undefined
): FrameLensFields {
  if (choice === undefined) return NO_LENS;
  if (
    !existing &&
    !lensChoices(cameraLenses, []).some((offered) => offered.id === choice)
  ) {
    return NO_LENS;
  }
  if (choice === RECORDED_LENS_CHOICE) {
    return { lensId: undefined, fixedLensName: existing?.fixedLensName };
  }
  if (choice === FIXED_LENS_CHOICE) {
    return {
      lensId: undefined,
      fixedLensName:
        cameraLenses.kind === 'fixed'
          ? cameraLenses.label
          : existing?.fixedLensName,
    };
  }
  return { lensId: choice, fixedLensName: undefined };
}

/** True when the camera has saved lenses but none is chosen: a frame cannot be
 * logged yet. Never for a fixed-lens camera. */
export function needsLensChoice(
  cameraLenses: CameraLenses,
  choice: string | undefined
): boolean {
  return (
    cameraLenses.kind === 'interchangeable' &&
    cameraLenses.lenses.length > 0 &&
    !choice
  );
}
