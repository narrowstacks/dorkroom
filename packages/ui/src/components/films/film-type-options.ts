import type { SelectItem } from '@dorkroom/logic';

/** Film type filter options, shared by every film filter module. */
export const FILM_TYPE_OPTIONS: SelectItem[] = [
  { label: 'All types', value: '' },
  { label: 'Black & White', value: 'bw' },
  { label: 'Color', value: 'color' },
  { label: 'Slide', value: 'slide' },
];
