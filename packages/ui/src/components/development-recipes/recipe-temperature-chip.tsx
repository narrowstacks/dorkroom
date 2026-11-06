import { isHigherTemperature, isNonStandardTemperature } from '@dorkroom/logic';
import { ThermometerSnowflake, ThermometerSun } from 'lucide-react';
import type { FC } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { cn } from '../../lib/cn';
import { temperatureFlagText } from './recipe-detail-shared';

export interface RecipeTemperatureChipProps {
  temperatureC: number;
  temperatureF: number;
  className?: string;
}

/**
 * Flags a recipe that is not at room temperature: "High temp 24°C" or "Low
 * temp 18°C", in the user's unit. Nothing is drawn at 20°C, judged by the same
 * tolerance as `isNonStandardTemperature`. Warm or cool by token, with an icon and
 * words, so the meaning survives the one-colour themes: those tell High from Low
 * by a solid fill against a dashed outline. The fill is opaque, so a hovered row
 * underneath changes nothing. It avoids the bare `border` class, which the
 * high-contrast theme repaints on every `rounded-xl` surface.
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
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium [border-width:1px]',
        isHigher
          ? 'darkroom-invert-icon bg-[color:var(--color-temp-high-bg)] text-[color:var(--color-temp-high-text)] border-[color:var(--color-temp-high-border)] [border-style:var(--temp-high-border-style)]'
          : 'bg-[color:var(--color-temp-low-bg)] text-[color:var(--color-temp-low-text)] border-[color:var(--color-temp-low-border)] [border-style:var(--temp-low-border-style)]',
        className
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {temperatureFlagText({ temperatureC, temperatureF }, unit)}
    </span>
  );
};
