import { SearchableSelect } from '@dorkroom/ui';
import { useState } from 'react';

const developers = [
  { label: 'Kodak D-76', value: 'd76' },
  { label: 'Ilford ID-11', value: 'id11' },
  { label: 'Kodak HC-110', value: 'hc110' },
  { label: 'Ilfotec DD-X', value: 'ddx' },
  { label: 'Rodinal (Adox)', value: 'rodinal' },
  { label: 'Xtol', value: 'xtol' },
  { label: 'Pyrocat-HD', value: 'pyrocat-hd' },
];

const films = [
  { label: 'Kodak Tri-X 400', value: 'tri-x-400' },
  { label: 'Ilford HP5 Plus', value: 'hp5-plus' },
  { label: 'Kodak Portra 400', value: 'portra-400' },
  { label: 'Fuji Acros 100 II', value: 'acros-100' },
];

// Canonical: a labelled searchable select with a developer chosen. The clear (x)
// affordance appears because a value is selected and allowClear defaults on.
export const WithSelection = () => {
  const [value, setValue] = useState('hc110');
  return (
    <div style={{ maxWidth: 320 }}>
      <SearchableSelect
        label="Developer"
        selectedValue={value}
        onValueChange={setValue}
        items={developers}
        placeholder="Search developers…"
      />
    </div>
  );
};

// Empty state: shows the placeholder prompt and no clear button.
export const Empty = () => {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: 320 }}>
      <SearchableSelect
        label="Film stock"
        selectedValue={value}
        onValueChange={setValue}
        items={films}
        placeholder="Search film stocks…"
      />
    </div>
  );
};
