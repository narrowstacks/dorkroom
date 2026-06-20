import { SettingsButton } from '@dorkroom/ui';
import { Ruler, Thermometer } from 'lucide-react';

const noop = () => {};

// Canonical settings row: label + current value + chevron, as used on the
// Settings page for a tappable preference.
export const LabelAndValue = () => (
  <div style={{ maxWidth: 320 }}>
    <SettingsButton
      label="Measurement units"
      value="Inches"
      icon={Ruler}
      onPress={noop}
    />
  </div>
);

// An option-picker row that is currently selected (ring + tinted surface),
// centered label, no chevron.
export const Selected = () => (
  <div style={{ maxWidth: 320 }}>
    <SettingsButton
      value="Celsius"
      icon={Thermometer}
      isSelected
      centerLabel
      showChevron={false}
      onPress={noop}
    />
  </div>
);

// A small grid of selectable choices — the temperature-unit picker pattern.
export const ChoiceGrid = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 8,
      maxWidth: 320,
    }}
  >
    <SettingsButton
      value="Celsius"
      isSelected
      centerLabel
      showChevron={false}
      onPress={noop}
    />
    <SettingsButton
      value="Fahrenheit"
      centerLabel
      showChevron={false}
      onPress={noop}
    />
  </div>
);
