import type { Combination, Developer } from '@dorkroom/api';

/** Temperature unit shown in recipe UI (mobile-local preference). */
export type TempUnit = 'C' | 'F';

/**
 * Format a development time (in minutes) as the compact `Xm YYs` string used by
 * the web recipes table — e.g. 8.5 -> "8m 30s", 0.75 -> "45s", 5 -> "5m".
 * Returns "—" for non-finite or negative input.
 */
export function formatRecipeTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const totalSeconds = Math.round(minutes * 60);
  if (totalSeconds === 0) return '0s';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * Resolve the dilution string for a recipe, following the web priority:
 * explicit `customDilution` -> the developer's named dilution looked up by
 * `dilutionId` -> "Stock".
 */
export function resolveDilution(
  combination: Pick<Combination, 'customDilution' | 'dilutionId'>,
  developer?: Pick<Developer, 'dilutions'>
): string {
  const custom = combination.customDilution?.trim();
  if (custom) return custom;
  if (combination.dilutionId && developer?.dilutions) {
    const match = developer.dilutions.find(
      (d) => d.id === combination.dilutionId
    );
    if (match?.dilution) return match.dilution;
  }
  return 'Stock';
}

export interface PushPullDisplay {
  /** Signed magnitude label, e.g. "+1", "-2", "+0.5". */
  label: string;
  direction: 'push' | 'pull';
}

/**
 * Describe a push/pull value in stops for the badge. Box speed (0, or values
 * that round to 0) returns null so the caller renders nothing.
 */
export function pushPullDisplay(stops: number): PushPullDisplay | null {
  if (!Number.isFinite(stops)) return null;
  // Round to 1 decimal; treat anything that rounds to 0 as box speed.
  const rounded = Math.round(stops * 10) / 10;
  if (rounded === 0) return null;
  const sign = rounded > 0 ? '+' : '-';
  return {
    label: `${sign}${Math.abs(rounded)}`,
    direction: rounded > 0 ? 'push' : 'pull',
  };
}

/**
 * Format a recipe temperature in the selected unit, e.g. (20, 68, 'C') -> "20°C".
 * Whole numbers render without decimals; fractional values keep one decimal.
 */
export function formatRecipeTemp(
  temperatureC: number,
  temperatureF: number,
  unit: TempUnit
): string {
  const value = unit === 'C' ? temperatureC : temperatureF;
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}°${unit}`;
}

/**
 * Human label for a recipe source tag, e.g. "official-kodak" -> "Kodak
 * official". Unknown/unprefixed tags pass through unchanged.
 */
export function formatSourceTag(tag: string): string {
  const m = tag.match(/^official-(.+)$/);
  if (!m) return tag;
  const brand = m[1]
    .split('-')
    .map((w) =>
      w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)
    )
    .join(' ');
  return `${brand} official`;
}

/**
 * Display value for the Agitation row: the API's agitation_method when
 * present ("intermittent" -> "Intermittent"), else "Standard".
 */
export function formatAgitationMethod(
  method: string | null | undefined
): string {
  const trimmed = method?.trim();
  if (!trimmed) return 'Standard';
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}
