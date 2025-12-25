import { useMeasurement } from '../contexts/measurement-context';
import { UnitToggle } from './unit-toggle';

const MEASUREMENT_OPTIONS = [
  { value: 'imperial', label: 'in' },
  { value: 'metric', label: 'cm' },
] as const;

export function MeasurementUnitToggle(): React.JSX.Element {
  const { unit, toggleUnit } = useMeasurement();

  return (
    <UnitToggle
      currentUnit={unit}
      onToggle={toggleUnit}
      options={[MEASUREMENT_OPTIONS[0], MEASUREMENT_OPTIONS[1]]}
      ariaLabel="Measurement unit"
    />
  );
}
