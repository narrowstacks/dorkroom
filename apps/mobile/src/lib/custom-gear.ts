// Pure rules for brands and mounts the user types (#733): cleaning the text and
// finding an entry it already names, so nothing is stored twice. Tested in
// `custom-gear.test.ts`; the writes are in `film-log-storage.ts`.
import { sanitizeText } from '@dorkroom/logic';
import { sameName } from '@/lib/catalog-search';
import { GEAR_BRANDS, LENS_MOUNTS } from '@/lib/gear-catalog';
import type { CustomBrand, CustomMount } from '@/schemas/film-log.schema';

/** The longest brand or mount name kept. */
export const GEAR_NAME_MAX = 80;

/** A typed brand or mount name as stored: `sanitizeText` with the 80
 * character cap the camera and lens name fields use (a longer name is cut and
 * ends in "...", as there), then runs of space collapsed and trimmed. Empty
 * when nothing usable is left. */
export function cleanGearName(text: string): string {
  // Spaces collapse after sanitizing, so a stripped tag leaves no double space.
  return sanitizeText(text, GEAR_NAME_MAX).replace(/\s+/g, ' ').trim();
}

/** The stored spelling of a brand this name already is (built in first,
 * then the user's own), ignoring case, accents and spacing. */
export function knownBrand(
  name: string,
  customBrands: readonly Pick<CustomBrand, 'name'>[]
): string | undefined {
  return (
    GEAR_BRANDS.find((brand) => sameName(brand.name, name))?.name ??
    customBrands.find((brand) => sameName(brand.name, name))?.name
  );
}

/** The id of a mount this name already is: a built-in name or alias, or a
 * user mount's name. */
export function knownMount(
  name: string,
  customMounts: readonly Pick<CustomMount, 'id' | 'name'>[]
): string | undefined {
  return (
    LENS_MOUNTS.find(
      (mount) =>
        sameName(mount.name, name) ||
        mount.aliases.some((alias) => sameName(alias, name))
    )?.id ?? customMounts.find((mount) => sameName(mount.name, name))?.id
  );
}

/** A mount typed in a form that is not stored until the form is saved. */
export interface PendingMount {
  id: string;
  name: string;
}

/** The held brand to store when a form is saved: only while the form still
 * uses it (the user may have picked another brand after adding it). */
export function heldBrandToStore(
  brand: string | undefined,
  held: string | undefined
): string | undefined {
  return brand && held && sameName(brand, held) ? held : undefined;
}

/** The held mount to store when a form is saved: only while the form's mount
 * is still the held one's id. */
export function heldMountToStore(
  mountId: string | undefined,
  held: PendingMount | undefined
): PendingMount | undefined {
  return held && mountId === held.id ? held : undefined;
}
