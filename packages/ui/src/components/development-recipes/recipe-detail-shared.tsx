import {
  formatClock,
  formatTemperature,
  type TemperatureUnit,
} from '@dorkroom/logic';
import type { FC, ReactNode } from 'react';

/** Format time as "Xm XXs" instead of decimal minutes */
// eslint-disable-next-line react-doctor/only-export-components -- intentional shared helper module for recipe-detail views; consumers import formatTime alongside DetailRow from here
export const formatTime = (minutes: number): string => {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }

  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  if (seconds === 0) {
    return `${wholeMinutes}m`;
  }
  return `${wholeMinutes}m ${seconds.toString().padStart(2, '0')}s`;
};

/** Helper component for detail rows */
export const DetailRow: FC<{ label: string; value: ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex justify-between gap-6 text-sm">
    <span className="text-tertiary">{label}</span>
    <span className="text-right text-primary">{value}</span>
  </div>
);

/**
 * `formatClock` spelled out for a screen reader ("9:30" becomes "9 minutes 30
 * seconds"), so the spoken and the shown time share one rounding.
 */
// eslint-disable-next-line react-doctor/only-export-components -- same helper module as formatTime
export const spokenTime = (minutes: number): string => {
  const [m, s] = formatClock(minutes).split(':').map(Number);
  const unit = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? '' : 's'}`;
  return [m > 0 && unit(m, 'minute'), (s > 0 || m === 0) && unit(s, 'second')]
    .filter(Boolean)
    .join(' ');
};

export interface RecipeTemperature {
  temperatureC: number;
  temperatureF: number;
}

/** A temperature in the user's unit: "20°C". */
// eslint-disable-next-line react-doctor/only-export-components -- same helper module as formatTime
export const temperatureText = (
  { temperatureC, temperatureF }: RecipeTemperature,
  unit: TemperatureUnit
): string =>
  formatTemperature(unit === 'celsius' ? temperatureC : temperatureF, unit, {
    trimTrailingZero: true,
  });
