// The shot form's starting values, from the shot being edited or, for a new
// shot, from the route's params (the log sheet's "More options") and the roll.
// Pure so the rules are tested: an existing shot is never pre-filled.
import { sanitizeText } from '@dorkroom/logic';
import { lastUsedLensId, lastUsedPlace } from '@/lib/film-log-options';
import type {
  Lens,
  Shot,
  ShotLocation,
  ShotPhoto,
} from '@/schemas/film-log.schema';

/** A route param, which expo-router may hand over as one string or several. */
export type RouteParam = string | string[] | undefined;

/** The first value of a route param, or undefined when it is absent or empty. */
export function firstParam(value: RouteParam): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined || first === '' ? undefined : first;
}

/**
 * A route param that is present: its first value, empty included. An empty
 * value means the sender cleared the field; only an absent one is "not given".
 */
export function presentParam(value: RouteParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** What a new shot starts with when nothing was handed over. */
export const DEFAULT_APERTURE = 8;
export const DEFAULT_SHUTTER_SPEED = 0.008;

export interface ShotFormDefaults {
  lensId: string | undefined;
  place: string;
  notes: string;
  aperture: number | undefined;
  shutterSpeed: number | undefined;
  back: string | undefined;
  /** An existing shot's own location. A new shot never inherits one. */
  location: ShotLocation | undefined;
}

/**
 * An existing shot starts as it was saved, every field, so a value it never had
 * (a frame logged from Reciprocity has no aperture) stays unset until the user
 * picks one. A new shot starts from the params and falls back to the roll's last
 * lens and place, the roll's back and the default exposure; a lens param counts
 * only when it is one of the lenses available on the roll's camera.
 * `prefill` is the metered aperture and shutter, already snapped to stops.
 */
export function shotFormDefaults(
  params: {
    lensId?: RouteParam;
    place?: RouteParam;
    notes?: RouteParam;
  },
  existing:
    | Pick<
        Shot,
        | 'lensId'
        | 'place'
        | 'notes'
        | 'aperture'
        | 'shutterSpeed'
        | 'back'
        | 'location'
      >
    | undefined,
  roll: { shots: readonly Shot[]; back?: string } | undefined,
  lenses: readonly Pick<Lens, 'id'>[],
  prefill: { aperture?: number; shutterSpeed?: number } = {}
): ShotFormDefaults {
  if (existing) {
    return {
      lensId: existing.lensId,
      place: existing.place ?? '',
      notes: existing.notes ?? '',
      aperture: existing.aperture,
      shutterSpeed: existing.shutterSpeed,
      back: existing.back,
      location: existing.location,
    };
  }
  const shots = roll?.shots ?? [];
  // Present-but-empty means cleared (no fallback); absent falls back.
  const paramLens = presentParam(params.lensId);
  const lensFromParams =
    paramLens === undefined
      ? lastUsedLensId(shots)
      : lenses.some((lens) => lens.id === paramLens)
        ? paramLens
        : paramLens === ''
          ? undefined
          : lastUsedLensId(shots);
  return {
    lensId: lensFromParams,
    place: presentParam(params.place) ?? lastUsedPlace(shots) ?? '',
    notes: presentParam(params.notes) ?? '',
    aperture: prefill.aperture ?? DEFAULT_APERTURE,
    shutterSpeed: prefill.shutterSpeed ?? DEFAULT_SHUTTER_SPEED,
    back: roll?.back,
    // Coordinates belong to one frame, unlike the place name, and never come
    // from a route param (a link could plant them). The log sheet's draft is
    // handed over in memory: see frame-location-handoff.ts.
    location: undefined,
  };
}

export interface ShotFormValues {
  frameNumber: number;
  aperture: number | undefined;
  shutterSpeed: number | undefined;
  lensId: string | undefined;
  back: string | undefined;
  notes: string;
  place: string;
  photo: ShotPhoto | undefined;
  location: ShotLocation | undefined;
}

/**
 * The fields to store for the form's values. Nothing the user never chose is
 * invented: an unset aperture, shutter, lens or back stays unset, and empty
 * notes or place are left out. (A new shot's form starts from its defaults, so
 * those are what it writes.) The back counts only for a camera that uses backs.
 */
export function shotFormFields(
  form: ShotFormValues,
  context: { showBacks: boolean; source: Shot['source'] }
): Omit<Shot, 'id' | 'takenAt'> {
  const notes = sanitizeText(form.notes, 2000);
  return {
    frameNumber: form.frameNumber,
    aperture: form.aperture,
    shutterSpeed: form.shutterSpeed,
    lensId: form.lensId,
    back: context.showBacks ? form.back : undefined,
    notes: notes === '' ? undefined : notes,
    place: sanitizeText(form.place, 200) || undefined,
    source: context.source,
    photo: form.photo,
    // Undefined removes it from a stored shot on update, which is what Remove does.
    location: form.location,
  };
}
