import { useMemo, useState } from 'react';
import { useCustomBrands, useCustomMounts } from '@/hooks/use-film-log';
import { sameName } from '@/lib/catalog-search';
import {
  cleanGearName,
  heldBrandToStore,
  heldMountToStore,
  knownBrand,
  knownMount,
  type PendingMount,
} from '@/lib/custom-gear';
import { addCustomBrand, addCustomMount } from '@/lib/film-log-storage';
import { CUSTOM_MOUNT_PREFIX } from '@/lib/gear-catalog';
import { generateId } from '@/lib/id';

/**
 * A brand or mount the user adds in a camera or lens form is held here, not
 * stored, until the form is saved (#733): Cancel leaves nothing behind. The
 * picker offers it like a stored one meanwhile. A name that is already a
 * built-in or stored entry (case, accents and spacing ignored) selects that
 * entry instead.
 */
export function usePendingGear() {
  const customBrands = useCustomBrands();
  const customMounts = useCustomMounts();
  const [pendingBrand, setPendingBrand] = useState<string>();
  const [pendingMount, setPendingMount] = useState<PendingMount>();

  const mounts = useMemo(
    () => (pendingMount ? [...customMounts, pendingMount] : customMounts),
    [customMounts, pendingMount]
  );

  /** The picker's Add: returns the brand to select, or undefined for nothing. */
  const addBrand = (typed: string): string | undefined => {
    const name = cleanGearName(typed);
    if (!name) return undefined;
    const known = knownBrand(name, customBrands);
    if (known) return known;
    setPendingBrand(name);
    return name;
  };

  /** The picker's Add: returns the mount id to select, or undefined. */
  const addMount = (typed: string): string | undefined => {
    const name = cleanGearName(typed);
    if (!name) return undefined;
    const known = knownMount(name, customMounts);
    if (known) return known;
    if (pendingMount && sameName(pendingMount.name, name)) {
      return pendingMount.id;
    }
    const pending = { id: `${CUSTOM_MOUNT_PREFIX}${generateId()}`, name };
    setPendingMount(pending);
    return pending.id;
  };

  /** On save: stores the held brand if the form still uses it. */
  const commitBrand = (brand: string | undefined): string | undefined => {
    const held = heldBrandToStore(brand, pendingBrand);
    return held ? addCustomBrand(held) : brand;
  };

  /** On save: stores the held mount if the form still uses it. */
  const commitMount = (mountId: string | undefined): string | undefined => {
    const held = heldMountToStore(mountId, pendingMount);
    return held ? addCustomMount(held) : mountId;
  };

  return {
    customBrands,
    /** The user's mounts plus the held one, for the picker and names. */
    mounts,
    pendingBrand,
    addBrand,
    addMount,
    commitBrand,
    commitMount,
  };
}
