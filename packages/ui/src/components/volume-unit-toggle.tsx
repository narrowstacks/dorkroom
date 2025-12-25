import { useVolume } from '../contexts/volume-context';
import { UnitToggle } from './unit-toggle';

const VOLUME_OPTIONS = [
  { value: 'ml', label: 'ml' },
  { value: 'floz', label: 'fl oz' },
] as const;

export function VolumeUnitToggle(): React.JSX.Element {
  const { unit, toggleUnit } = useVolume();

  return (
    <UnitToggle
      currentUnit={unit}
      onToggle={toggleUnit}
      options={[VOLUME_OPTIONS[0], VOLUME_OPTIONS[1]]}
      ariaLabel="Volume unit"
    />
  );
}
