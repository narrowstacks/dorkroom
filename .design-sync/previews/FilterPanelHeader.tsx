import {
  FilterPanelContainer,
  FilterPanelHeader,
  FilterPanelSection,
  Select,
} from '@dorkroom/ui';
import { useState } from 'react';

const DEVELOPER_OPTIONS = [
  { label: 'All developers', value: '' },
  { label: 'Kodak HC-110', value: 'hc110' },
  { label: 'Ilford ID-11', value: 'id11' },
  { label: 'Rodinal', value: 'rodinal' },
];

// The header sits at the top of a filter panel. Rendered inside its Container so
// the collapse toggle and active-filter badge resolve from context.
export const Default = () => {
  const [developer, setDeveloper] = useState('hc110');
  return (
    <div style={{ maxWidth: 320 }}>
      <FilterPanelContainer activeFilterCount={2} hasActiveFilters>
        <FilterPanelHeader title="Filters" />
        <FilterPanelSection title="Developer">
          <Select
            label="Chemistry"
            items={DEVELOPER_OPTIONS}
            selectedValue={developer}
            onValueChange={setDeveloper}
          />
        </FilterPanelSection>
      </FilterPanelContainer>
    </div>
  );
};

// A custom title with no active filters — the badge is hidden.
export const CustomTitle = () => (
  <div style={{ maxWidth: 320 }}>
    <FilterPanelContainer activeFilterCount={0} hasActiveFilters={false}>
      <FilterPanelHeader title="Recipe filters" />
      <FilterPanelSection title="Dilution">
        <Select
          label="Stock dilution"
          items={[
            { label: 'Any dilution', value: '' },
            { label: '1+31', value: '1+31' },
            { label: '1+47', value: '1+47' },
          ]}
          selectedValue=""
          onValueChange={() => {}}
        />
      </FilterPanelSection>
    </FilterPanelContainer>
  </div>
);
