import { formatMinutes } from '../utils/time-formatting';

export const FILM_COLOR_TYPES = [
  { label: 'All Films', value: '' },
  { label: 'Black & White', value: 'bw' },
];

export const DEVELOPER_TYPES = [
  { label: 'All Developers', value: '' },
  { label: 'Powder', value: 'powder' },
  { label: 'Concentrate', value: 'concentrate' },
];

/**
 * Convert a duration in minutes into a human-readable string.
 *
 * @param minutes - Duration in minutes
 * @returns `Xs` for durations less than one minute (seconds rounded), `Hh Mm` for durations of one hour or more, `N min` for other minute values
 */
export const formatTime = formatMinutes;

export const SORT_OPTIONS = [
  { label: 'Development Time', value: 'timeMinutes' },
  { label: 'Temperature', value: 'temperatureF' },
  { label: 'ISO', value: 'shootingIso' },
];

export const PUSH_PULL_LABELS = {
  [-2]: 'Pull 2 stops',
  [-1]: 'Pull 1 stop',
  0: 'Box Speed',
  1: 'Push 1 stop',
  2: 'Push 2 stops',
} satisfies Record<number, string>;

const OFFICIAL_TAG_PREFIX = 'official-';

/** Makers whose name is not just their tag capitalised. */
const OFFICIAL_TAG_NAMES = new Map([
  ['cinestill', 'CineStill'],
  ['fuji', 'Fujifilm'],
  ['jch', 'JCH'],
]);

/**
 * The maker behind an `official-*` recipe tag ("official-fuji" -> "Fujifilm"),
 * or null when the tag is not an official one.
 */
export function officialTagMaker(tag: string): string | null {
  if (!tag.startsWith(OFFICIAL_TAG_PREFIX)) return null;
  const maker = tag.slice(OFFICIAL_TAG_PREFIX.length);
  return (
    OFFICIAL_TAG_NAMES.get(maker) ??
    maker.charAt(0).toUpperCase() + maker.slice(1)
  );
}

/** Dilutions the recipes page accepts in its `dilution` URL param. */
const RECIPE_URL_DILUTIONS = [/^stock$/i, /^\d+:\d+$/, /^\d+\+\d+$/, /^\d+$/];

/** Whether the recipes page accepts `dilution` as its `dilution` URL param. */
export const isRecipeUrlDilution = (dilution: string): boolean =>
  RECIPE_URL_DILUTIONS.some((pattern) => pattern.test(dilution));
