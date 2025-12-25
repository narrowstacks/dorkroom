import { useTemperature } from '../../contexts/temperature-context';
import { UnitToggle } from '../unit-toggle';

const TEMPERATURE_OPTIONS = [
  { value: 'fahrenheit', label: '°F' },
  { value: 'celsius', label: '°C' },
] as const;

export function TemperatureUnitToggle() {
  const { unit, toggleUnit } = useTemperature();

  return (
    <UnitToggle
      currentUnit={unit}
      onToggle={toggleUnit}
      options={[TEMPERATURE_OPTIONS[0], TEMPERATURE_OPTIONS[1]]}
      ariaLabel={`Switch to ${unit === 'fahrenheit' ? 'Celsius' : 'Fahrenheit'}`}
    />
  );
}
