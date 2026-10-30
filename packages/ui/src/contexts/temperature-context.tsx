import type { TemperatureUnit } from '@dorkroom/logic';
import { createUnitContext } from './create-unit-context';

const { Provider, useUnit } = createUnitContext<TemperatureUnit>({
  name: 'Temperature',
  storageKey: 'dorkroom-temperature-unit',
  defaultUnit: 'fahrenheit',
  units: ['fahrenheit', 'celsius'] as const,
});

export const TemperatureProvider = Provider;
export const useTemperature = useUnit;
