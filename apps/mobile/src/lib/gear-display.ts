import { cameraLensKind, fixedLensLabel } from '@/lib/camera-lenses';
// How cameras, lenses and mounts read in the film log (#733). Pure, tested in
// `gear-display.test.ts`. Nothing here changes a stored value.
import { foldForSearch, sameName } from '@/lib/catalog-search';
import { formatCameraFormat, joinFacts } from '@/lib/film-log-options';
import { builtInMount, GEAR_BRANDS } from '@/lib/gear-catalog';
import type { Camera, CustomMount, Lens } from '@/schemas/film-log.schema';

/** "Brand Name", or the name alone when it already starts, as a whole word,
 * with the brand or one of a built-in brand's aliases (folded, so
 * "Voigtlander Bessa R" under Voigtländer and "Fuji GW690" under Fujifilm are
 * not doubled; "Leicaflex" under Leica still is prefixed). */
function withBrand(brand: string | undefined, name: string): string {
  const cleanBrand = brand?.trim();
  if (!cleanBrand) return name;
  const builtIn = GEAR_BRANDS.find((entry) => sameName(entry.name, cleanBrand));
  const foldedName = foldForSearch(name);
  const startsWithBrand = [cleanBrand, ...(builtIn?.aliases ?? [])]
    .map(foldForSearch)
    .some(
      (term) =>
        term !== '' &&
        (foldedName === term || foldedName.startsWith(`${term} `))
    );
  return startsWithBrand ? name : `${cleanBrand} ${name}`;
}

/**
 * A camera as the film log shows it everywhere (rolls, hubs, widgets,
 * Spotlight, exports): "Voigtländer Bessa R". A camera with no brand shows its
 * name exactly as before, and brand Nikon with name "Nikon FM2" stays "Nikon
 * FM2".
 */
export function cameraDisplayName(
  camera: Pick<Camera, 'name' | 'brand'>
): string {
  return withBrand(camera.brand, camera.name);
}

/** A lens with its brand, by the same rule, for the Cameras & lenses list. */
export function lensDisplayName(lens: Pick<Lens, 'name' | 'brand'>): string {
  return withBrand(lens.brand, lens.name);
}

/** The display name of a mount id: built in, else the user's own, else
 * "Unknown mount" (a custom mount whose list was lost). */
export function mountName(
  mountId: string,
  customMounts: readonly CustomMount[]
): string {
  return (
    builtInMount(mountId)?.name ??
    customMounts.find((mount) => mount.id === mountId)?.name ??
    'Unknown mount'
  );
}

/** The Cameras & lenses row's second line for a camera: the mount or "Fixed
 * lens 90mm f/3.5" when set, then the format and backs as before. */
export function cameraDetailLine(
  camera: Camera,
  customMounts: readonly CustomMount[]
): string {
  const backs = camera.backs?.length
    ? `${camera.backs.length} ${camera.backs.length === 1 ? 'back' : 'backs'}`
    : undefined;
  let lens: string | undefined;
  const kind = cameraLensKind(camera);
  if (kind === 'fixed' && camera.fixedLens) {
    const label = fixedLensLabel(camera.fixedLens);
    lens = label === 'Fixed lens' ? label : `Fixed lens ${label}`;
  } else if (kind === 'mount' && camera.mountId) {
    lens = mountName(camera.mountId, customMounts);
  }
  return joinFacts([lens, formatCameraFormat(camera.format), backs]);
}

/** The Cameras & lenses row's second line for a lens: focal length, then the
 * mount (and a camera it is also pinned to), or, with no mount, the camera it
 * is used on or "Any camera" as before. */
export function lensDetailLine(
  lens: Lens,
  cameras: readonly Camera[],
  customMounts: readonly CustomMount[]
): string {
  const focal =
    lens.focalLength === undefined ? undefined : `${lens.focalLength}mm`;
  const pinned = lens.cameraId
    ? cameras.find((camera) => camera.id === lens.cameraId)
    : undefined;
  const parts = lens.mountId
    ? [
        focal,
        mountName(lens.mountId, customMounts),
        pinned ? `also ${cameraDisplayName(pinned)}` : undefined,
      ]
    : [focal, pinned ? cameraDisplayName(pinned) : 'Any camera'];
  return joinFacts(parts);
}

/** The lens form's line under a mount: "Fits: Bessa R, Leica IIIf". */
export function fitsLine(cameras: readonly Camera[]): string {
  return cameras.length === 0
    ? 'No cameras with this mount yet.'
    : `Fits: ${cameras.map(cameraDisplayName).join(', ')}`;
}
