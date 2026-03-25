import type { MeasurementUnit } from '@dorkroom/logic';

import { createUnitContext } from './create-unit-context';

const { Provider, useUnit } = createUnitContext<MeasurementUnit>({
  name: 'Measurement',
  storageKey: 'dorkroom-measurement-unit',
  defaultUnit: 'imperial',
  units: ['imperial', 'metric'] as const,
});

export const MeasurementProvider = Provider;
export const useMeasurement = useUnit;
