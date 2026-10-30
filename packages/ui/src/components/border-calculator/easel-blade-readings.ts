import type { BorderCalculation } from '@dorkroom/logic';

export interface EaselBladeReadings {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * The blade readings in easel terms, as the "Blade Readings" card labels them.
 *
 * The calculation's left/top/bottom/right are sides of the image as previewed.
 * When the paper is actually portrait the easel sits rotated 90°, so its left
 * and right blades take the top and bottom readings and vice versa. Orientation
 * comes from the calculated paper size, which also covers custom sizes entered
 * already landscape.
 */
export function getEaselBladeReadings(
  calculation: Pick<
    BorderCalculation,
    | 'paperWidth'
    | 'paperHeight'
    | 'leftBladeReading'
    | 'rightBladeReading'
    | 'topBladeReading'
    | 'bottomBladeReading'
  >
): EaselBladeReadings {
  const isPortrait = calculation.paperWidth <= calculation.paperHeight;
  return isPortrait
    ? {
        left: calculation.topBladeReading,
        right: calculation.bottomBladeReading,
        top: calculation.leftBladeReading,
        bottom: calculation.rightBladeReading,
      }
    : {
        left: calculation.leftBladeReading,
        right: calculation.rightBladeReading,
        top: calculation.topBladeReading,
        bottom: calculation.bottomBladeReading,
      };
}
