import { UnitToggle } from '@dorkroom/ui';
import { useState } from 'react';

// Canonical generic two-option toggle — measurement units (in | cm).
export const Measurement = () => {
  const [unit, setUnit] = useState('imperial');
  return (
    <div style={{ maxWidth: 200 }}>
      <UnitToggle
        currentUnit={unit}
        onToggle={() =>
          setUnit((u) => (u === 'imperial' ? 'metric' : 'imperial'))
        }
        options={[
          { value: 'imperial', label: 'in' },
          { value: 'metric', label: 'cm' },
        ]}
        ariaLabel="Measurement unit"
      />
    </div>
  );
};

// The selection axis: left option active vs right option active.
export const Selected = () => {
  return (
    <div style={{ maxWidth: 220, display: 'grid', gap: 12 }}>
      <UnitToggle
        currentUnit="ml"
        onToggle={() => {}}
        options={[
          { value: 'ml', label: 'ml' },
          { value: 'floz', label: 'fl oz' },
        ]}
        ariaLabel="Volume unit"
      />
      <UnitToggle
        currentUnit="floz"
        onToggle={() => {}}
        options={[
          { value: 'ml', label: 'ml' },
          { value: 'floz', label: 'fl oz' },
        ]}
        ariaLabel="Volume unit"
      />
    </div>
  );
};
