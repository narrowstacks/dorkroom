import {
  FilterPanelClearButton,
  FilterPanelContainer,
  FilterPanelSection,
  Select,
} from '@dorkroom/ui';
import { useState } from 'react';

// The clear button as it appears in a real section header — top-right of a
// titled FilterPanelSection (which renders it when showClear is set).
export const InSection = () => {
  const [iso, setIso] = useState('400');
  return (
    <div style={{ maxWidth: 320 }}>
      <FilterPanelContainer activeFilterCount={1} hasActiveFilters>
        <FilterPanelSection
          title="ISO speed"
          showClear
          clearLabel="Reset"
          onClear={() => setIso('')}
        >
          <Select
            label="Box speed"
            items={[
              { label: 'Any ISO', value: '' },
              { label: 'ISO 100', value: '100' },
              { label: 'ISO 400', value: '400' },
              { label: 'ISO 3200', value: '3200' },
            ]}
            selectedValue={iso}
            onValueChange={setIso}
          />
        </FilterPanelSection>
      </FilterPanelContainer>
    </div>
  );
};

// The button on its own, with the default and a custom label.
export const Standalone = () => (
  <div
    style={{
      maxWidth: 220,
      display: 'flex',
      gap: 12,
      alignItems: 'center',
    }}
  >
    <FilterPanelClearButton onClick={() => {}} />
    <FilterPanelClearButton onClick={() => {}} label="Reset filters" />
  </div>
);
