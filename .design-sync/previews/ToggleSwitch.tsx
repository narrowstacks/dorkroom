import { ToggleSwitch } from '@dorkroom/ui';
import { useState } from 'react';

// Canonical settings toggle — controlled, starts on.
export const EnableAnimations = () => {
  const [on, setOn] = useState(true);
  return (
    <div style={{ maxWidth: 280 }}>
      <ToggleSwitch
        label="Enable animations"
        value={on}
        onValueChange={setOn}
      />
    </div>
  );
};

// Off and on side by side — the primary on/off visual axis.
export const States = () => {
  const [enableOffset, setEnableOffset] = useState(true);
  const [ignoreMinBorder, setIgnoreMinBorder] = useState(false);
  return (
    <div style={{ maxWidth: 280, display: 'grid', gap: 14 }}>
      <ToggleSwitch
        label="Enable offsets"
        value={enableOffset}
        onValueChange={setEnableOffset}
      />
      <ToggleSwitch
        label="Ignore min border"
        value={ignoreMinBorder}
        onValueChange={setIgnoreMinBorder}
      />
    </div>
  );
};
