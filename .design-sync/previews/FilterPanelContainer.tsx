import {
  FilterPanelContainer,
  FilterPanelHeader,
  FilterPanelSection,
  Select,
} from '@dorkroom/ui';
import { useState } from 'react';

const FILM_TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Black & White', value: 'bw' },
  { label: 'Color', value: 'color' },
  { label: 'Slide', value: 'slide' },
];

const ISO_OPTIONS = [
  { label: 'Any ISO', value: '' },
  { label: 'ISO 100', value: '100' },
  { label: 'ISO 400', value: '400' },
  { label: 'ISO 3200', value: '3200' },
];

const BRAND_OPTIONS = [
  { label: 'All brands', value: '' },
  { label: 'Kodak', value: 'kodak' },
  { label: 'Ilford', value: 'ilford' },
  { label: 'Fujifilm', value: 'fuji' },
];

// The canonical filter sidebar: provider Container wrapping a Header and two
// real filter Sections, mirroring the film catalog's filter panel.
export const Default = () => {
  const [filmType, setFilmType] = useState('bw');
  const [iso, setIso] = useState('400');
  const [brand, setBrand] = useState('ilford');
  return (
    <div style={{ maxWidth: 320 }}>
      <FilterPanelContainer activeFilterCount={3} hasActiveFilters>
        <FilterPanelHeader title="Filters" />
        <FilterPanelSection
          title="Film type"
          showClear
          onClear={() => setFilmType('')}
        >
          <Select
            label="Process"
            items={FILM_TYPE_OPTIONS}
            selectedValue={filmType}
            onValueChange={setFilmType}
          />
          <Select
            label="ISO speed"
            items={ISO_OPTIONS}
            selectedValue={iso}
            onValueChange={setIso}
          />
        </FilterPanelSection>
        <FilterPanelSection title="Brand">
          <Select
            label="Manufacturer"
            items={BRAND_OPTIONS}
            selectedValue={brand}
            onValueChange={setBrand}
          />
        </FilterPanelSection>
      </FilterPanelContainer>
    </div>
  );
};

// Collapsed rail — the Container's compact state with an active-filter badge.
export const Collapsed = () => (
  <div style={{ maxWidth: 96 }}>
    <FilterPanelContainer
      activeFilterCount={3}
      hasActiveFilters
      defaultCollapsed
    >
      <FilterPanelHeader title="Filters" />
      <FilterPanelSection title="Film type">
        <Select
          label="Process"
          items={FILM_TYPE_OPTIONS}
          selectedValue="bw"
          onValueChange={() => {}}
        />
      </FilterPanelSection>
    </FilterPanelContainer>
  </div>
);
