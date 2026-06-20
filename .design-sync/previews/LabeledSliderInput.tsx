import { LabeledSliderInput } from '@dorkroom/ui';
import { useState } from 'react';

// Canonical slider+number field — minimum print border, with reference labels.
export const MinimumBorder = () => {
  const [value, setValue] = useState(0.5);
  return (
    <div style={{ maxWidth: 360 }}>
      <LabeledSliderInput
        label="Minimum border (inches)"
        value={value}
        onChange={setValue}
        onSliderChange={setValue}
        min={0}
        max={2}
        step={0.05}
        labels={['0"', '1"', '2"']}
        continuousUpdate
      />
    </div>
  );
};

// Offset slider with a centered zero reference.
export const HorizontalOffset = () => {
  const [value, setValue] = useState(0.25);
  return (
    <div style={{ maxWidth: 360 }}>
      <LabeledSliderInput
        label="Horizontal offset"
        value={value}
        onChange={setValue}
        onSliderChange={setValue}
        min={-1}
        max={1}
        step={0.05}
        labels={['-1"', '0"', '1"']}
        continuousUpdate
      />
    </div>
  );
};

// Warning state — the validation styling axis (yellow border/background).
export const Warning = () => {
  const [value, setValue] = useState(0.1);
  return (
    <div style={{ maxWidth: 360 }}>
      <LabeledSliderInput
        label="Minimum border (inches)"
        value={value}
        onChange={setValue}
        onSliderChange={setValue}
        min={0}
        max={2}
        step={0.05}
        labels={['0"', '1"', '2"']}
        warning
        continuousUpdate
      />
    </div>
  );
};
