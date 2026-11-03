/**
 * Font scale (the Dynamic Type multiplier from `useWindowDimensions`) at and
 * above which side-by-side layouts stop fitting and should stack. iOS "Large"
 * is 1.0, the largest standard size (xxxLarge) is about 1.35, and the
 * accessibility sizes start well above that (roughly 1.8 and up); 1.5 sits
 * between the two groups.
 */
export const LARGE_TEXT_SCALE = 1.5;

/** Whether text is scaled large enough that rows should reflow to a column. */
export function isLargeTextScale(fontScale: number): boolean {
  return Number.isFinite(fontScale) && fontScale >= LARGE_TEXT_SCALE;
}
