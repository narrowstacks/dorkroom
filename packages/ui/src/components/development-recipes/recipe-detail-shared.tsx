import {
  formatClock,
  formatTemperature,
  getFilmDisplayName,
  isHigherTemperature,
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

/** Where a speed sits against the box speed, in the prototype's words. */
// eslint-disable-next-line react-doctor/only-export-components -- same helper module as formatTime
export const describeSpeed = (
  iso: number,
  boxIso: number | undefined
): string | null => {
  if (!boxIso) return null;
  if (iso === boxIso) return 'box speed';
  const stops = Math.log2(iso / boxIso);
  if (Number.isInteger(stops)) {
    return stops > 0 ? `push +${stops}` : `pull -${-stops}`;
  }
  return iso > boxIso ? 'above box speed' : 'below box speed';
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

/** What the temperature chip says: "High temp 24°C" or "Low temp 18°C". */
// eslint-disable-next-line react-doctor/only-export-components -- same helper module as formatTime
export const temperatureFlagText = (
  temperature: RecipeTemperature,
  unit: TemperatureUnit
): string =>
  `${isHigherTemperature(temperature.temperatureF) ? 'High' : 'Low'} temp ${temperatureText(temperature, unit)}`;

/** "Ilford HP5 Plus in Kodak XTOL". Names alone are ambiguous: several films are "100". */
// eslint-disable-next-line react-doctor/only-export-components -- same helper module as formatTime
export const recipeTitle = (
  film: { brand: string; name: string } | null | undefined,
  developer: { manufacturer: string; name: string } | null | undefined
): string => {
  const filmName = film
    ? `${film.brand} ${getFilmDisplayName(film)}`
    : 'Unknown film';
  const developerName = developer
    ? `${developer.manufacturer} ${developer.name}`
    : 'Unknown developer';
  return `${filmName} in ${developerName}`;
};
