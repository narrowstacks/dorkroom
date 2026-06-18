import { CollapsibleSection, ResultRow } from '@dorkroom/ui';
import { useState } from 'react';

// Expanded section revealing a development recipe summary.
export const Expanded = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 360 }}>
      <CollapsibleSection
        title="Development"
        subtitle="Kodak HC-110 · Dilution B"
        isExpanded={open}
        onToggle={() => setOpen((v) => !v)}
      >
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <ResultRow label="Dilution" value="1+31" />
          <ResultRow label="Temperature" value="20°C / 68°F" />
          <ResultRow label="Time" value="7 min 30 s" />
          <ResultRow label="Agitation" value="Every 30 s" />
        </div>
      </CollapsibleSection>
    </div>
  );
};

// Collapsed section showing only the title/subtitle header.
export const Collapsed = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ maxWidth: 360 }}>
      <CollapsibleSection
        title="Notes"
        subtitle="Push processing & handling"
        isExpanded={open}
        onToggle={() => setOpen((v) => !v)}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Rate at EI 800 and extend development by ~40% for one stop of push.
        </p>
      </CollapsibleSection>
    </div>
  );
};
