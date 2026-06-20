import { NumberInput } from '@dorkroom/ui';
import { useState } from 'react';

// Canonical numeric field — a developer dilution volume in ml.
export const Default = () => {
  const [value, setValue] = useState('300');
  return (
    <div style={{ maxWidth: 200 }}>
      <NumberInput
        value={value}
        onChangeText={setValue}
        inputTitle="Stock solution"
        step={5}
      />
    </div>
  );
};

// Empty with placeholder vs filled — the value-presence axis.
export const States = () => {
  const [empty, setEmpty] = useState('');
  const [iso, setIso] = useState('400');
  return (
    <div style={{ maxWidth: 200, display: 'grid', gap: 12 }}>
      <NumberInput
        value={empty}
        onChangeText={setEmpty}
        placeholder="ISO"
        inputTitle="Film ISO"
      />
      <NumberInput
        value={iso}
        onChangeText={setIso}
        inputTitle="Film ISO"
        step={100}
      />
    </div>
  );
};
