import { TextInput } from '@dorkroom/ui';
import { useState } from 'react';

export const WithLabel = () => {
  const [value, setValue] = useState('Kodak Tri-X 400');
  return (
    <div style={{ maxWidth: 320 }}>
      <TextInput
        label="Preset name"
        value={value}
        onValueChange={setValue}
        placeholder="Preset name"
      />
    </div>
  );
};

export const WithDescription = () => {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: 320 }}>
      <TextInput
        label="Exposure time"
        value={value}
        onValueChange={setValue}
        placeholder="Try 30s, 1m30s, or 2h"
        description="Supports natural durations like 1m30s."
        inputMode="search"
      />
    </div>
  );
};

export const Filled = () => {
  const [value, setValue] = useState('Ilford HP5 Plus');
  return (
    <div style={{ maxWidth: 320 }}>
      <TextInput value={value} onValueChange={setValue} />
    </div>
  );
};
