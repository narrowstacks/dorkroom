import { Flame, Snowflake } from 'lucide-react';
import { useTemperature } from '../contexts/temperature-context';
import { formatTemperatureWithUnit } from '../lib/temperature';

/** Standard development temperature is 68°F / 20°C */
export const STANDARD_TEMP_F = 68;
export const STANDARD_TEMP_C = 20;

/**
 * Check if temperature differs from standard 68°F/20°C and return warning info.
 */
export function getTemperatureWarning(
  tempF?: number | null,
  tempC?: number | null
): { show: boolean; isHigher: boolean } {
  if (tempF != null && tempF !== STANDARD_TEMP_F) {
    return { show: true, isHigher: tempF > STANDARD_TEMP_F };
  }
  // If only C is provided, convert to F for comparison
  if (tempC != null) {
    const equivalentF = (tempC * 9) / 5 + 32;
    if (Math.abs(equivalentF - STANDARD_TEMP_F) > 0.5) {
      return { show: true, isHigher: equivalentF > STANDARD_TEMP_F };
    }
  }
  return { show: false, isHigher: false };
}

/** Color tokens for temperature warnings */
export const TEMP_WARNING_COLORS = {
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
  const warning = getTemperatureWarning(temperatureF, temperatureC);

  if (!warning.show) {
    return null;
  }

  const colors = warning.isHigher
    ? TEMP_WARNING_COLORS.higher
    : TEMP_WARNING_COLORS.lower;

  const Icon = warning.isHigher ? Flame : Snowflake;

  // Format the recipe's temperature
  const recipeTemp = formatTemperatureWithUnit(
    temperatureF ?? null,
    temperatureC ?? null,
    unit
  );

  return (
    <div
      className="flex items-start gap-2 rounded-lg border p-3 text-sm"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: colors.icon }}
      />
      <div style={{ color: 'var(--color-text-secondary)' }}>
        <div className="font-semibold">
          Non-standard temperature: {recipeTemp.text}
        </div>
        <div>
          {warning.isHigher ? 'Raise' : 'Lower'} your chemistry (developer,
          stop, and fixer) to {recipeTemp.text} before starting development.
        </div>
      </div>
    </div>
  );
}
