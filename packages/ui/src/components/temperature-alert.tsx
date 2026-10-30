import { formatTemperatureWithUnit } from '@dorkroom/logic';
import { Flame, Snowflake } from 'lucide-react';
import { useTemperature } from '../contexts/temperature-context';

/** Color tokens for temperature warnings */
const TEMP_WARNING_COLORS = {
  higher: {
    border: 'var(--color-semantic-warning)',
    background: 'rgba(234, 179, 8, 0.1)',
    icon: 'var(--color-semantic-warning)',
  },
  lower: {
    border: 'var(--color-semantic-info, #3b82f6)',
    background: 'rgba(59, 130, 246, 0.1)',
    icon: 'var(--color-semantic-info, #3b82f6)',
  },
} as const;

interface TemperatureAlertProps {
  /** Temperature in Fahrenheit */
  temperatureF?: number | null;
  /** Temperature in Celsius */
  temperatureC?: number | null;
}

/**
 * Warning banner for recipes using non-standard development temperatures.
 * Standard temperature is 68°F (20°C).
 *
 * - Higher temps: Yellow/warning color
 * - Lower temps: Blue/info color
 *
 * Only renders when temperature differs from standard.
 */
export function TemperatureAlert({
  temperatureF,
  temperatureC,
}: TemperatureAlertProps) {
  const { unit } = useTemperature();
  // Same non-standard rule (more than 0.1 °F from 68 °F) as the recipe table.
  const recipeTemp = formatTemperatureWithUnit(
    temperatureF ?? null,
    temperatureC ?? null,
    unit
  );

  if (!recipeTemp.isNonStandard) {
    return null;
  }

  const colors = recipeTemp.isHigher
    ? TEMP_WARNING_COLORS.higher
    : TEMP_WARNING_COLORS.lower;

  const Icon = recipeTemp.isHigher ? Flame : Snowflake;

  return (
    <div
      className="flex items-start gap-2 rounded-lg border p-3 text-sm"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <Icon className="mt-0.5 size-4 shrink-0" style={{ color: colors.icon }} />
      <div style={{ color: 'var(--color-text-secondary)' }}>
        <div className="font-semibold">
          Non-standard temperature: {recipeTemp.text}
        </div>
        <div>
          {recipeTemp.isHigher ? 'Raise' : 'Lower'} your chemistry (developer,
          stop, and fixer) temperature to {recipeTemp.text} before starting
          development.
        </div>
      </div>
    </div>
  );
}
