import { Select } from '@dorkroom/ui';
import { useState } from 'react';

const filmStocks = [
  { label: 'Kodak Tri-X 400', value: 'tri-x-400' },
  { label: 'Ilford HP5 Plus', value: 'hp5-plus' },
  { label: 'Kodak T-Max 100', value: 'tmax-100' },
  { label: 'Fuji Acros 100 II', value: 'acros-100' },
  { label: 'Ilford Delta 3200', value: 'delta-3200' },
];

const formatOptions = [
  { label: 'Full Frame (35mm)', value: 'ff' },
  { label: 'APS-C', value: 'aps-c' },
  { label: 'Medium Format (6x6)', value: '6x6' },
  { label: 'Large Format (4x5)', value: '4x5' },
];

// Canonical labelled select with a chosen film stock.
export const WithLabel = () => {
  const [value, setValue] = useState('tri-x-400');
  return (
    <div style={{ maxWidth: 320 }}>
      <Select
        label="Film stock"
        selectedValue={value}
        onValueChange={setValue}
        items={filmStocks}
        ariaLabel="Film stock"
      />
    </div>
  );
};

// Unselected state shows the placeholder option.
export const Placeholder = () => {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: 320 }}>
      <Select
        label="Source format"
        selectedValue={value}
        onValueChange={setValue}
        items={formatOptions}
        placeholder="Choose a format…"
        ariaLabel="Source format"
      />
    </div>
  );
};

// No label — a compact inline control with a selected format.
export const Bare = () => {
  const [value, setValue] = useState('6x6');
  return (
    <div style={{ maxWidth: 320 }}>
      <Select
        selectedValue={value}
        onValueChange={setValue}
        items={formatOptions}
        ariaLabel="Target format"
      />
    </div>
  );
};
