import type { Combination, Developer } from '@dorkroom/api';

/**
 * A recipe's dilution as people read it: its custom dilution, else the
 * developer's dilution it points at, else "Stock" (a recipe whose dilution is
 * missing or blank was developed in stock solution).
 *
 * @example
 * ```typescript
 * getCombinationDilution({ customDilution: null, dilutionId: '2' }, ddx); // '1+4'
 * ```
 */
export function getCombinationDilution(
  combination: Pick<Combination, 'customDilution' | 'dilutionId'>,
  developer: Pick<Developer, 'dilutions'> | null | undefined
): string {
  const custom = combination.customDilution?.trim();
  if (custom) return custom;
  const { dilutionId } = combination;
  const match =
    developer && dilutionId
      ? developer.dilutions.find((d) => String(d.id) === String(dilutionId))
      : undefined;
  return match?.dilution?.trim() || 'Stock';
}

/**
 * `getCombinationDilution`, or null when the recipe points at a developer's
 * dilution and that developer is gone. Reading that as "Stock" would tell someone
 * to pour neat developer, so say it is unknown instead. A recipe with no dilution
 * at all really is Stock.
 */
export function getKnownCombinationDilution(
  combination: Pick<Combination, 'customDilution' | 'dilutionId'>,
  developer: Pick<Developer, 'dilutions'> | null | undefined
): string | null {
  const isUnknown =
    !combination.customDilution?.trim() &&
    !!combination.dilutionId &&
    !developer;
  return isUnknown ? null : getCombinationDilution(combination, developer);
}
