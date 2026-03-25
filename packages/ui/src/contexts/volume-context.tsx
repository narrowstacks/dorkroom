import type { VolumeUnit } from '@dorkroom/logic';

import { createUnitContext } from './create-unit-context';

const { Provider, useUnit } = createUnitContext<VolumeUnit>({
  name: 'Volume',
  storageKey: 'dorkroom-volume-unit',
  defaultUnit: 'ml',
  units: ['ml', 'floz'] as const,
});

export const VolumeProvider = Provider;
export const useVolume = useUnit;
