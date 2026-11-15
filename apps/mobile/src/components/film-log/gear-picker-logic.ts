// Pure options and search rows for the Brand and Mount pickers (#733). The
// picker itself is `gear-picker-field.tsx`.
import { foldForSearch, sameName, searchByTerms } from '@/lib/catalog-search';
import { brandsFor, LENS_MOUNTS } from '@/lib/gear-catalog';
import type { CustomBrand, CustomMount } from '@/schemas/film-log.schema';

export interface GearOption {
  /** What the field stores: a brand's name, or a mount's id. */
  value: string;
  label: string;
  /** A second line, e.g. a mount's aliases. */
  detail?: string;
  /** Name and aliases, for search. */
  terms: readonly string[];
}

const pushUnique = (options: GearOption[], name: string) => {
  const clean = name.trim();
  if (!clean) return;
  if (options.some((option) => sameName(option.label, clean))) return;
  options.push({ value: clean, label: clean, terms: [clean] });
};

/**
 * The Brand picker's list: the built-in brands for cameras or lenses, then the
 * user's own, then any brand already on a camera or lens that neither list has
 * (from an export of another phone, say), each once.
 */
export function brandOptions(
  kind: 'camera' | 'lens',
  customBrands: readonly CustomBrand[],
  inUse: readonly (string | undefined)[]
): GearOption[] {
  const options: GearOption[] = brandsFor(kind).map((brand) => ({
    value: brand.name,
    label: brand.name,
    terms: [brand.name, ...brand.aliases],
  }));
  for (const brand of customBrands) pushUnique(options, brand.name);
  for (const brand of inUse) if (brand) pushUnique(options, brand);
  return options;
}

/** The Mount picker's list: the built-in mounts, then the user's own. */
export function mountOptions(
  customMounts: readonly CustomMount[]
): GearOption[] {
  return [
    ...LENS_MOUNTS.map((mount) => ({
      value: mount.id,
      label: mount.name,
      detail: mount.aliases.length > 0 ? mount.aliases.join(', ') : undefined,
      terms: [mount.name, ...mount.aliases],
    })),
    ...customMounts.map((mount) => ({
      value: mount.id,
      label: mount.name,
      terms: [mount.name],
    })),
  ];
}

export interface PickerRows {
  rows: GearOption[];
  /** The typed text to offer as "Add "...", or null when it is empty or
   * already a name or alias in the list. */
  addName: string | null;
}

/** What the picker lists for a query. */
export function pickerRows(
  options: readonly GearOption[],
  query: string
): PickerRows {
  const rows = searchByTerms(options, query, (option) => option.terms);
  const typed = query.trim().replace(/\s+/g, ' ');
  const exists = options.some((option) =>
    option.terms.some((term) => sameName(term, typed))
  );
  return {
    rows,
    addName: foldForSearch(typed) !== '' && !exists ? typed : null,
  };
}
