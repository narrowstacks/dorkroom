import {
  formatTemperature,
  isHigherTemperature,
  isNonStandardTemperature,
} from '@dorkroom/logic';
import { ThermometerSnowflake, ThermometerSun } from 'lucide-react';
import type { FC } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { cn } from '../../lib/cn';

export interface RecipeTemperatureChipProps {
  temperatureC: number;
  temperatureF: number;
  className?: string;
}

/**
 * Flags a recipe that is not at room temperature: "High temp 24°C" or "Low
 * temp 18°C", in the user's unit. Nothing is drawn at 20°C, judged by the same
 * tolerance as `isNonStandardTemperature`. An icon and words carry the meaning,
 * so it survives the one-colour darkroom theme. It takes its colour from the
 * surface it sits on (`currentColor`), so a hovered row that flips its text
 * colour takes the chip with it. It avoids the bare `border`
 * class, which the high-contrast theme repaints on every `rounded-xl` surface.
 */
export const RecipeTemperatureChip: FC<RecipeTemperatureChipProps> = ({
  temperatureC,
  temperatureF,
  className,
}) => {
  const { unit } = useTemperature();
  if (!isNonStandardTemperature(temperatureF)) return null;

  const isHigher = isHigherTemperature(temperatureF);
  const Icon = isHigher ? ThermometerSun : ThermometerSnowflake;
  const value = formatTemperature(
    unit === 'celsius' ? temperatureC : temperatureF,
    unit,
    { trimTrailingZero: true }
  );

  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-lg border-1 border-current px-2.5 text-sm font-medium',
        className
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {isHigher ? 'High' : 'Low'} temp {value}
    </span>
  );
};
