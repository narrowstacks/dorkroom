import {
  FilterPanelContainer,
  FilterPanelHeader,
  FilterPanelSection,
  Select,
} from '@dorkroom/ui';
import { useState } from 'react';

const TEMP_OPTIONS = [
  { label: 'Any temperature', value: '' },
  { label: '20°C / 68°F', value: '20' },
  { label: '24°C / 75°F', value: '24' },
];

const AGITATION_OPTIONS = [
  { label: 'Any agitation', value: '' },
  { label: 'Continuous', value: 'continuous' },
  { label: 'Every 30s', value: '30s' },
  { label: 'Every 60s', value: '60s' },
];

// A section with a title and a clear button, holding two real filter controls.
export const WithClear = () => {
  const [temp, setTemp] = useState('20');
  const [agitation, setAgitation] = useState('30s');
  return (
    <div style={{ maxWidth: 320 }}>
      <FilterPanelContainer activeFilterCount={2} hasActiveFilters>
        <FilterPanelSection
          title="Process"
          showClear
          onClear={() => {
            setTemp('');
            setAgitation('');
          }}
        >
          <Select
            label="Temperature"
            items={TEMP_OPTIONS}
            selectedValue={temp}
            onValueChange={setTemp}
          />
          <Select
            label="Agitation"
            items={AGITATION_OPTIONS}
            selectedValue={agitation}
            onValueChange={setAgitation}
          />
        </FilterPanelSection>
      </FilterPanelContainer>
    </div>
  );
};

// A plain titled section with no clear affordance.
export const Plain = () => {
  const [agitation, setAgitation] = useState('continuous');
  return (
    <div style={{ maxWidth: 320 }}>
      <FilterPanelContainer activeFilterCount={1} hasActiveFilters>
        <FilterPanelSection title="Agitation">
          <Select
            label="Scheme"
            items={AGITATION_OPTIONS}
            selectedValue={agitation}
            onValueChange={setAgitation}
          />
        </FilterPanelSection>
      </FilterPanelContainer>
    </div>
  );
};
